import { ApiException } from '../../../common/exceptions/api.exception';
import { HttpStatus } from '@nestjs/common';

const SIG_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const SIG_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const SIG_GIF = Buffer.from([0x47, 0x49, 0x46]);
const SIG_WEBP = 'WEBP';
const PDF = Buffer.from('%PDF');

/** Rejects when buffer magic bytes do not match declared **mimetype**. */
export function assertReceiptBufferMatchesMime(
  buffer: Buffer,
  mimetype: string,
): void {
  if (buffer.length < 12) {
    throw new ApiException(
      'RECEIPT_FILE_INVALID',
      'Receipt file is too small or corrupted.',
      HttpStatus.BAD_REQUEST,
    );
  }
  switch (mimetype) {
    case 'image/jpeg':
      if (!buffer.subarray(0, 3).equals(SIG_JPEG)) {
        throw new ApiException(
          'RECEIPT_FILE_TYPE_MISMATCH',
          'File content is not a valid JPEG.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    case 'image/png':
      if (!buffer.subarray(0, 4).equals(SIG_PNG)) {
        throw new ApiException(
          'RECEIPT_FILE_TYPE_MISMATCH',
          'File content is not a valid PNG.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    case 'image/gif':
      if (!buffer.subarray(0, 3).equals(SIG_GIF)) {
        throw new ApiException(
          'RECEIPT_FILE_TYPE_MISMATCH',
          'File content is not a valid GIF.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    case 'image/webp':
      if (
        buffer.subarray(0, 4).toString() !== 'RIFF' ||
        buffer.subarray(8, 12).toString() !== SIG_WEBP
      ) {
        throw new ApiException(
          'RECEIPT_FILE_TYPE_MISMATCH',
          'File content is not a valid WebP.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    case 'application/pdf':
      if (!buffer.subarray(0, 4).equals(PDF)) {
        throw new ApiException(
          'RECEIPT_FILE_TYPE_MISMATCH',
          'File content is not a valid PDF.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    default:
      throw new ApiException(
        'RECEIPT_FILE_TYPE_INVALID',
        'Unsupported receipt MIME type.',
        HttpStatus.BAD_REQUEST,
      );
  }
}
