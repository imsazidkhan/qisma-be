import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number in international format (E.164)',
    example: '+8801712345678',
    pattern: '^\\+?[1-9]\\d{9,14}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone!: string;
}
