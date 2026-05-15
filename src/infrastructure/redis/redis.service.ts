import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    // Enable TLS for managed providers (Upstash, Redis Cloud, ElastiCache-TLS).
    // REDIS_TLS=true → connects over rediss:// with certificate validation.
    const tlsEnabled =
      this.configService.get<string>('REDIS_TLS', 'false') === 'true';
    const familyRaw = this.configService.get<'4' | '6' | undefined>(
      'REDIS_FAMILY',
    );
    const family = familyRaw === '4' ? 4 : familyRaw === '6' ? 6 : undefined;

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      ...(family !== undefined ? { family } : {}),
      ...(tlsEnabled ? { tls: {} } : {}),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * SCAN + batched DEL — evict analytics keys by prefix (e.g. `lb:analytics:{groupId}:`).
   */
  async deleteByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100',
      );
      cursor = next;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Atomic increment with max check using Lua script
   * Returns: { allowed: boolean, currentAttempts: number }
   */
  async atomicIncrementWithLimit(
    key: string,
    maxAttempts: number,
    ttlSeconds: number,
  ): Promise<{ allowed: boolean; attempts: number }> {
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if current and tonumber(current) >= tonumber(ARGV[1]) then
        return {0, tonumber(current)}
      end
      local newVal = redis.call('INCR', KEYS[1])
      if newVal == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[2])
      end
      local allowed = newVal <= tonumber(ARGV[1]) and 1 or 0
      return {allowed, newVal}
    `;

    const result = (await this.client.eval(
      luaScript,
      1,
      key,
      maxAttempts.toString(),
      ttlSeconds.toString(),
    )) as [number, number];

    return {
      allowed: result[0] === 1,
      attempts: result[1] ?? 0,
    };
  }

  /**
   * Atomic session update - only updates if session exists and matches expected state
   */
  async atomicSessionUpdate(
    key: string,
    expectedStatus: string,
    newSession: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if not current then
        return 0
      end
      local session = cjson.decode(current)
      if session.status ~= ARGV[1] then
        return 0
      end
      redis.call('SETEX', KEYS[1], ARGV[3], ARGV[2])
      return 1
    `;

    const result = (await this.client.eval(
      luaScript,
      1,
      key,
      expectedStatus,
      newSession,
      ttlSeconds.toString(),
    )) as number;

    return result === 1;
  }

  /**
   * Atomic OTP verification - handles parallel requests safely
   * Only ONE request can successfully verify; others get ALREADY_VERIFIED
   *
   * Returns:
   * - 1: SUCCESS (verified)
   * - 2: ALREADY_VERIFIED (idempotent success)
   * - 3: SESSION_NOT_FOUND
   * - 4: SESSION_LOCKED (with lockedUntil timestamp)
   * - 5: OTP_EXPIRED
   * - 6: MAX_ATTEMPTS (session locked)
   * - 7: INVALID_OTP
   */
  async atomicVerifyOtp(
    sessionKey: string,
    attemptsKey: string,
    otp: string,
    maxAttempts: number,
    lockDurationSeconds: number,
    idempotencyTtl: number,
  ): Promise<{
    code: number;
    session?: string;
    lockedUntil?: number;
    remainingTtl?: number;
  }> {
    const luaScript = `
      local sessionKey = KEYS[1]
      local attemptsKey = KEYS[2]
      local inputOtp = ARGV[1]
      local maxAttempts = tonumber(ARGV[2])
      local lockDuration = tonumber(ARGV[3])
      local idempotencyTtl = tonumber(ARGV[4])
      local now = tonumber(ARGV[5])

      -- 1. Fetch session
      local sessionData = redis.call('GET', sessionKey)
      if not sessionData then
        return {3} -- SESSION_NOT_FOUND
      end

      local session = cjson.decode(sessionData)

      -- 2. Check if already verified (idempotent)
      if session.status == 'VERIFIED' then
        return {2} -- ALREADY_VERIFIED
      end

      -- 3. Check if locked
      if session.status == 'LOCKED' then
        if session.lockedUntil and now < session.lockedUntil then
          return {4, session.lockedUntil} -- SESSION_LOCKED
        end
        -- Lock expired, reset
        session.status = 'ACTIVE'
        session.lockedUntil = nil
        redis.call('DEL', attemptsKey)
      end

      -- 4. Check expiry
      if now > session.expiresAt then
        return {5} -- OTP_EXPIRED
      end

      -- 5. Atomic attempt increment
      local attempts = redis.call('INCR', attemptsKey)
      if attempts == 1 then
        redis.call('EXPIRE', attemptsKey, lockDuration)
      end

      -- 6. Compare OTP (constant-time not possible in Lua, but atomic)
      if session.otp ~= inputOtp then
        if attempts >= maxAttempts then
          -- Lock exactly on the max failed attempt.
          local lockedUntil = now + (lockDuration * 1000)
          session.status = 'LOCKED'
          session.lockedUntil = lockedUntil
          redis.call('SETEX', sessionKey, lockDuration, cjson.encode(session))
          return {6, lockedUntil} -- MAX_ATTEMPTS
        end
        -- Save session state if it was unlocked
        local remainingTtl = math.ceil((session.expiresAt - now) / 1000)
        if remainingTtl > 0 then
          redis.call('SETEX', sessionKey, remainingTtl, cjson.encode(session))
        end
        return {7} -- INVALID_OTP
      end

      -- 7. SUCCESS - Mark as verified atomically
      session.status = 'VERIFIED'
      redis.call('SETEX', sessionKey, idempotencyTtl, cjson.encode(session))
      redis.call('DEL', attemptsKey)
      
      -- Return success with session for cleanup
      return {1, cjson.encode(session)}
    `;

    const result = (await this.client.eval(
      luaScript,
      2,
      sessionKey,
      attemptsKey,
      otp,
      maxAttempts.toString(),
      lockDurationSeconds.toString(),
      idempotencyTtl.toString(),
      Date.now().toString(),
    )) as [number, string | number | undefined];

    const code = result[0];
    const response: {
      code: number;
      session?: string;
      lockedUntil?: number;
    } = { code };

    if (code === 1 && typeof result[1] === 'string') {
      response.session = result[1];
    } else if ((code === 4 || code === 6) && typeof result[1] === 'number') {
      response.lockedUntil = result[1];
    }

    return response;
  }
}
