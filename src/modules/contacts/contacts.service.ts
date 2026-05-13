import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import {
  ANALYTICS_EVENT,
} from '../../common/analytics/analytics-log.constants';
import type { CountryCode } from 'libphonenumber-js';

import {
  ContactPhonesNormalizeException,
  AccountInactiveException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GroupMemberRepository } from '../groups/repositories/group-member.repository';
import { UserService } from '../user/user.service';
import { CONTACT_SYNC_CONSTANTS } from './constants/contact-sync.constants';
import {
  inferCountryFromUserIdentifier,
  normalizeRawContactToE164Digits,
} from './utils/e164-contact-normalize';

/** **BE Task 7:** Minimal public shape for **`registered`** — only these keys are serialized. */
export type ContactMatchUser = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
};

export type ContactSyncResult = {
  syncedCount: number;
  registered: ContactMatchUser[];
  /** Normalized upload phones with **no** active **User** row for that **identifier**. */
  unregistered: string[];
};

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserService,
    private readonly config: ConfigService,
    private readonly groupMembers: GroupMemberRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ContactsService.name);
  }

  /**
   * Replaces stored snapshot; **`registered`** = **`User.identifier` ∈ upload**, minus **you**, **shared-group actives**, and **shared-group pending** (BE Task 5). **`unregistered`** = upload phones lacking **any** active **User** for that identifier (includes self’s number correctly).
   */
  async syncContacts(
    userId: string,
    rawIdentifiers: readonly string[],
  ): Promise<ContactSyncResult> {
    const actor = await this.users.findById(userId);
    if (!actor) {
      throw new UserNotFoundException();
    }
    if (!actor.isActive) {
      throw new AccountInactiveException();
    }

    const normalized =
      rawIdentifiers.length === 0
        ? []
        : ContactsService.normalizeUploadsToE164Digits(
            rawIdentifiers,
            this.resolveDefaultCountry(actor.identifier),
          );

    await this.prisma.$transaction(async (tx) => {
      await tx.userSyncedContact.deleteMany({ where: { userId } });
      const { INSERT_CHUNK } = CONTACT_SYNC_CONSTANTS;
      for (let i = 0; i < normalized.length; i += INSERT_CHUNK) {
        const chunk = normalized.slice(i, i + INSERT_CHUNK).map((phone) => ({
          userId,
          phone,
        }));
        await tx.userSyncedContact.createMany({ data: chunk });
      }
    });

    const activeOnPlatform =
      await this.users.findActiveIdentifiersInPhoneList(normalized);
    const activeIdSet = new Set(activeOnPlatform);
    const unregistered = normalized
      .filter((phone) => !activeIdSet.has(phone))
      .sort((a, b) => a.localeCompare(b));

    // BE Task 4: identifier IN uploaded phones — then BE Task 5 filters group overlap.
    let registered = await this.users.findUsersByPhoneIdentifiers(
      userId,
      normalized,
    );
    if (registered.length > 0) {
      const excludeIds =
        await this.groupMembers.findUserIdsWithSharedGroupContext(
          userId,
          registered.map((u) => u.id),
        );
      registered = registered.filter((u) => !excludeIds.has(u.id));
    }
    const syncCount = normalized.length;
    const matchedContactsCount = registered.length;

    this.logger.info({
      msg: ANALYTICS_EVENT.CONTACTS_SYNC,
      analyticsEvent: ANALYTICS_EVENT.CONTACTS_SYNC,
      userId,
      syncedContactCount: syncCount,
      matchedContactsCount,
      unregisteredPhonesCount: unregistered.length,
    });

    return { syncedCount: syncCount, registered, unregistered };
  }

  private resolveDefaultCountry(actorIdentifier: string): CountryCode {
    const inferred = inferCountryFromUserIdentifier(actorIdentifier);
    if (inferred !== undefined) {
      return inferred;
    }
    const envRegion = this.config.get<string>('CONTACT_SYNC_DEFAULT_COUNTRY');
    if (envRegion?.length === 2 && /^[A-Z]{2}$/.test(envRegion)) {
      return envRegion as CountryCode;
    }
    return 'US';
  }

  private static normalizeUploadsToE164Digits(
    rawIdentifiers: readonly string[],
    defaultCountry: CountryCode,
  ): string[] {
    const set = new Set<string>();
    for (let i = 0; i < rawIdentifiers.length; i++) {
      const raw = rawIdentifiers[i];
      if (raw === undefined) {
        throw new ContactPhonesNormalizeException(i, 'value is missing');
      }
      const normalized = normalizeRawContactToE164Digits(raw, defaultCountry);
      if (normalized === null) {
        throw new ContactPhonesNormalizeException(i);
      }
      set.add(normalized);
    }
    return [...set];
  }
}
