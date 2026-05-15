import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { GroupsModule } from '../groups/groups.module';
import { UserRepository } from './repositories/user.repository';
import { UsersController } from './users.controller';
import { UserService } from './user.service';

@Global()
@Module({
  imports: [AuthModule, GroupsModule, ExpensesModule],
  controllers: [UsersController],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
