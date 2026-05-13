import type {
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

export type AddMemberLookupBody = {
  identifier?: string;
  username?: string;
  userId?: string;
};

@ValidatorConstraint({ name: 'exactlyOneMemberLookup', async: false })
export class ExactlyOneMemberLookupConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const o = args.object as AddMemberLookupBody;
    const n =
      Number(o.identifier !== undefined) +
      Number(o.username !== undefined) +
      Number(o.userId !== undefined);
    return n === 1;
  }

  defaultMessage(): string {
    return 'Provide exactly one of: identifier (phone), username, userId';
  }
}
