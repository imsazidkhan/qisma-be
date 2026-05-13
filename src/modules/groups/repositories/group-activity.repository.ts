import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

const activityFeedSelect = {
  id: true,
  type: true,
  createdAt: true,
  payload: true,
  actor: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  },
  subject: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  },
} as const;

export type GroupActivityFeedRow = Prisma.GroupActivityEventGetPayload<{
  select: typeof activityFeedSelect;
}>;

@Injectable()
export class GroupActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.GroupActivityEventUncheckedCreateInput,
  ): Promise<void> {
    await this.prisma.groupActivityEvent.create({ data });
  }

  async findRecentByGroupId(
    groupId: string,
    take: number,
  ): Promise<GroupActivityFeedRow[]> {
    return this.prisma.groupActivityEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take,
      select: activityFeedSelect,
    });
  }
}
