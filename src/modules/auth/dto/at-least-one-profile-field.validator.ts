import type {
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

type ProfileFieldBody = {
  name?: string;
  avatarUrl?: string;
  useCase?: string;
  onboardingCompleted?: boolean;
};

@ValidatorConstraint({ name: 'atLeastOneProfileField', async: false })
export class AtLeastOneProfileFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const o = args.object as ProfileFieldBody;
    return (
      o.name !== undefined ||
      o.avatarUrl !== undefined ||
      o.useCase !== undefined ||
      o.onboardingCompleted !== undefined
    );
  }

  defaultMessage(): string {
    return 'Request must include at least one of: name, avatarUrl, useCase, onboardingCompleted';
  }
}
