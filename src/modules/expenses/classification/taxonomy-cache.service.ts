import type { ExpenseSubcategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

type CategoryWithSubs = Prisma.ExpenseCategoryGetPayload<{
  include: { subcategories: true };
}>;

@Injectable()
export class TaxonomyCacheService implements OnModuleInit {
  private readonly log = new Logger(TaxonomyCacheService.name);
  private categories: CategoryWithSubs[] = [];
  private subcategories: ExpenseSubcategory[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const rows = await this.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        subcategories: { orderBy: { name: 'asc' } },
      },
    });
    this.categories = rows;
    this.subcategories = rows.flatMap((c) => c.subcategories);
    this.log.log(`Taxonomy cache: ${String(rows.length)} categories`);
  }

  get categoriesList(): readonly CategoryWithSubs[] {
    return this.categories;
  }

  get subcategoriesList(): readonly ExpenseSubcategory[] {
    return this.subcategories;
  }
}
