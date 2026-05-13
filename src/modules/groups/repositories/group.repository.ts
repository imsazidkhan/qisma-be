import { Injectable } from '@nestjs/common';
import {
  GroupMemberRole,
  GroupMemberStatus,
  type Group,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a group and a single membership row for the creator
   * (`role: owner`, `status: active`, `joinedAt: now`).
   */
  async createWithOwnerMembership(input: {
    ownerUserId: string;
    name: string;
    type: string;
    avatarUrl?: string;
  }): Promise<Group> {
    const now = new Date();
    const data: Prisma.GroupCreateInput = {
      name: input.name,
      type: input.type,
      createdBy: { connect: { id: input.ownerUserId } },
      members: {
        create: {
          role: GroupMemberRole.owner,
          status: GroupMemberStatus.active,
          joinedAt: now,
          user: { connect: { id: input.ownerUserId } },
        },
      },
    };
    if (input.avatarUrl !== undefined) {
      data.avatarUrl = input.avatarUrl;
    }
    return this.prisma.group.create({ data });
  }

  async findById(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async findByCreatorUserId(userId: string): Promise<Group[]> {
    return this.prisma.group.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(): Promise<Group[]> {
    return this.prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Deletes a group by id (memberships cascade in DB). Caller must authorize first. */
  async deleteById(id: string): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }
}
