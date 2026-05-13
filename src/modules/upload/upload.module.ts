import { Module } from '@nestjs/common';

import { UploadController } from './upload.controller';
import { ReceiptStorageService } from './receipt-storage.service';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, ReceiptStorageService],
  exports: [UploadService, ReceiptStorageService],
})
export class UploadModule {}
