import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service.js';

@Global()
@Module({
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
