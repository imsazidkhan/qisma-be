import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Query **`tab`** for **`GET /v1/users/me/groups/home`**. */
export const HOME_GROUPS_TAB = {
  ALL: 'all',
  OWE: 'owe',
  GET_BACK: 'get_back',
  SETTLED: 'settled',
} as const;

export type HomeGroupsTab =
  (typeof HOME_GROUPS_TAB)[keyof typeof HOME_GROUPS_TAB];

export class MyGroupsHomeQueryDto {
  @ApiPropertyOptional({
    enum: HOME_GROUPS_TAB,
    default: HOME_GROUPS_TAB.ALL,
    description:
      '**all** — every joined group; **owe** — viewer net negative; **get_back** — viewer net positive; **settled** — viewer net zero.',
  })
  @IsOptional()
  @IsIn([
    HOME_GROUPS_TAB.ALL,
    HOME_GROUPS_TAB.OWE,
    HOME_GROUPS_TAB.GET_BACK,
    HOME_GROUPS_TAB.SETTLED,
  ])
  readonly tab?: HomeGroupsTab;
}
