import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnauthorizedException } from '../../common/exceptions/api.exception';
import { ContactsService } from './contacts.service';
import { ContactSyncDataDto, ContactSyncResponseDto } from './dto/contact-sync-response.dto';
import {
  SyncContactEntryDto,
  SyncContactsBodyDto,
} from './dto/sync-contacts.dto';
import { ContactSyncRateLimitService } from './services/contact-sync-rate-limit.service';

function authContextOrThrow(req: Request): { userId: string } {
  const authUser = req.user as { userId: string } | undefined;
  if (!authUser?.userId) {
    throw new UnauthorizedException(
      'Authentication context missing after guard.',
    );
  }
  return authUser;
}

@ApiTags('Contacts')
@ApiExtraModels(
  ApiErrorDto,
  SyncContactEntryDto,
  SyncContactsBodyDto,
  ContactSyncDataDto,
  ContactSyncResponseDto,
)
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly contactSyncRateLimit: ContactSyncRateLimitService,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Sync device contacts (phones) — replace snapshot + match members on platform',
    description:
      'Upload **contacts[]** (+ optional spaces). Phones are parsed via **libphonenumber-js** into **validated E.164** (subscriber digits aligned with User.identifier; no stored plus). Empty array clears snapshot. Infer default region from caller phone, env CONTACT_SYNC_DEFAULT_COUNTRY, then US. Invalid rows → INVALID_CONTACT_PHONE. **registered[]**: `{ id, name, username, avatar }` each — identifier IN upload, excluding current user + shared-group overlaps (active/pending rules above). **unregistered**: digits with no active **User**. Rate limits: 120/hr per IP then 36/hr per user. Bearer access JWT.',
  })
  @ApiBody({ type: SyncContactsBodyDto })
  @ApiOkResponse({
    description:
      '`200 OK` — `{ success: true, data: { syncedCount, registered[], unregistered[] } }`',
    type: ContactSyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '`VALIDATION_ERROR` (body shape) **or** single contact not E.164-parseable: `INVALID_CONTACT_PHONE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '`ACCOUNT_INACTIVE`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '`USER_NOT_FOUND`',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      '`CONTACT_SYNC_RATE_LIMIT_IP` (per-IP hourly cap) — `retryAfter` in seconds where available',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      '`CONTACT_SYNC_RATE_LIMIT_USER` (per-user hourly cap) — `retryAfter` in seconds',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
      },
    },
  })
  async syncContacts(
    @Req() req: Request,
    @Body() body: SyncContactsBodyDto,
    @Ip() clientIp: string,
  ): Promise<ApiSuccessResponse<ContactSyncDataDto>> {
    const { userId } = authContextOrThrow(req);
    await this.contactSyncRateLimit.enforceForSync(userId, clientIp);
    const result = await this.contacts.syncContacts(
      userId,
      body.contacts.map((c) => c.identifier),
    );
    return {
      success: true,
      data: {
        syncedCount: result.syncedCount,
        registered: result.registered.map(
          ({ id, name, username, avatar }) => ({
            id,
            name,
            username,
            avatar,
          }),
        ),
        unregistered: result.unregistered,
      },
    };
  }
}
