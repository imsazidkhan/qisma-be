import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

import {
  Controller,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { diskStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiErrorDto } from '../../common/dto/api-response.dto';
import { ApiException } from '../../common/exceptions/api.exception';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import { AvatarUploadResponseDto } from './dto/upload-responses.dto';
import { UploadService } from './upload.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function extForMime(mimetype: string, original: string): string {
  const fromName = extname(original).toLowerCase();
  if (fromName && fromName.length <= 6) return fromName;
  switch (mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

export type AvatarUploadData = {
  /** Absolute or origin-relative URL suitable for PATCH `/auth/me` `avatarUrl`. */
  url: string;
};

@ApiTags('Upload')
@ApiExtraModels(ApiErrorDto, AvatarUploadResponseDto)
@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  // ═══════════════════════════════════════════════════════════════════
  // POST /v1/upload/avatar
  // ═══════════════════════════════════════════════════════════════════
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Upload avatar image (authenticated)',
    description: `
Stores an avatar image on the server and returns a **public URL** suitable for use as
\`avatarUrl\` on \`PATCH /v1/auth/me\`.

### Auth
- **Bearer access token** only (\`type: access\` from \`/v1/otp/verify\` or \`/v1/auth/refresh\`)

### Request
- \`Content-Type: multipart/form-data\`
- Single field named \`file\` containing the binary image payload

### Constraints
| Constraint | Value |
|---|---|
| Allowed MIME types | \`image/jpeg\`, \`image/png\`, \`image/webp\`, \`image/gif\` |
| Maximum size | **5 MB** |
| Field name | \`file\` (required) |

### Storage
- Files are persisted under \`uploads/avatars/\` with a random UUID filename.
- Public URL format: \`{PUBLIC_APP_URL}/v1/uploads/avatars/{uuid}.{ext}\`.
- The previous avatar (if any) is **not** automatically deleted; storage cleanup is out of scope.

### Typical client flow
1. \`POST /v1/upload/avatar\` (multipart) → JSON \`{ "success": true, "data": { "url": "…" } }\`
2. \`PATCH /v1/auth/me\` with \`{ "avatarUrl": "<data.url from step 1>" }\`
`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, or GIF). Max 5 MB.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File stored. `data.url` is the public URL of the new avatar.',
    type: AvatarUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'No file uploaded or the uploaded file has an unsupported MIME type.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          AVATAR_FILE_REQUIRED: {
            summary: 'Multipart `file` field missing',
            value: {
              success: false,
              error: {
                code: 'AVATAR_FILE_REQUIRED',
                message: 'A multipart field named `file` is required.',
              },
            },
          },
          AVATAR_FILE_TYPE_INVALID: {
            summary: 'Unsupported MIME type',
            value: {
              success: false,
              error: {
                code: 'AVATAR_FILE_TYPE_INVALID',
                message: 'Avatar must be JPEG, PNG, WebP, or GIF.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, malformed, or expired access token.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          UNAUTHORIZED: {
            value: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required.',
              },
            },
          },
          TOKEN_EXPIRED: {
            value: {
              success: false,
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'Token has expired.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'File exceeds the 5 MB size limit.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          FILE_TOO_LARGE: {
            value: {
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'Uploaded file exceeds the 5 MB limit.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Disk write failure or other unexpected server error.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiErrorDto' },
        examples: {
          INTERNAL_ERROR: {
            value: {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Unable to process request. Please try again.',
              },
            },
          },
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(
            new ApiException(
              'AVATAR_FILE_TYPE_INVALID',
              'Avatar must be JPEG, PNG, WebP, or GIF.',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extForMime(file.mimetype, file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
    }),
  )
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ApiSuccessResponse<AvatarUploadData>> {
    if (!file) {
      throw new ApiException(
        'AVATAR_FILE_REQUIRED',
        'A multipart field named `file` is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const url = this.upload.avatarFilePublicUrl(req, file.filename);

    return {
      success: true,
      data: { url },
    };
  }
}
