import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class GroupAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  @Length(10, 10)
  readonly dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  @Length(10, 10)
  readonly dateTo?: string;

  /** When set, restrict spend-side stats to this member (active membership checked in service). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  readonly scopedUserId?: string;
}
