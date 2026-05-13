import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class UserLearningService {
  constructor(private readonly prisma: PrismaService) {}

  async bumpCategoryHit(
    userId: string,
    categoryId: string | null,
    subcategoryId: string | null,
  ): Promise<void> {
    if (!categoryId && !subcategoryId) return;

    const existing = await this.prisma.userCategoryLearning.findFirst({
      where: {
        userId,
        categoryId: categoryId ?? null,
        subcategoryId: subcategoryId ?? null,
      },
    });

    if (existing) {
      await this.prisma.userCategoryLearning.update({
        where: { id: existing.id },
        data: {
          weight: { increment: 1 },
          hitCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
      return;
    }

    await this.prisma.userCategoryLearning.create({
      data: {
        userId,
        categoryId: categoryId ?? null,
        subcategoryId: subcategoryId ?? null,
        weight: 1,
        hitCount: 1,
      },
    });
  }
}
