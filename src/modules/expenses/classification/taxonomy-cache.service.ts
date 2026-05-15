import type { ExpenseSubcategory } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';

type CategoryWithSubs = Prisma.ExpenseCategoryGetPayload<{
  include: { subcategories: true };
}>;

/** DB unreachable / TCP failures — bootstrap should not hard-crash in local dev. */
function isDatabaseUnreachable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as Record<string, unknown>;
  const code = o['code'];
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'P1001'
  ) {
    return true;
  }
  const msg = typeof o['message'] === 'string' ? o['message'] : '';
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND')
  );
}

/** One-line summary for logs — avoid dumping Prisma's multi-line invocation boilerplate. */
function connectionFailureSummary(err: unknown): string {
  if (!err || typeof err !== 'object') return 'unknown';
  const o = err as Record<string, unknown>;
  const code = o['code'];
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'P1001'
  ) {
    return String(code);
  }
  const msg = typeof o['message'] === 'string' ? o['message'] : '';
  if (msg.includes('ECONNREFUSED')) return 'ECONNREFUSED';
  if (msg.includes('ENOTFOUND')) return 'ENOTFOUND';
  if (msg.includes('ETIMEDOUT')) return 'ETIMEDOUT';
  if (msg.includes("Can't reach database server")) return 'P1001';
  const lines = msg
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (
      line.startsWith('Invalid `') ||
      line.startsWith('→') ||
      line.startsWith('at ')
    ) {
      continue;
    }
    return line.length > 160 ? `${line.slice(0, 157)}…` : line;
  }
  return 'database connection failed';
}

@Injectable()
export class TaxonomyCacheService implements OnModuleInit {
  private readonly log = new Logger(TaxonomyCacheService.name);
  private categories: CategoryWithSubs[] = [];
  private subcategories: ExpenseSubcategory[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.refresh();
    } catch (err) {
      if (!isDatabaseUnreachable(err)) {
        throw err;
      }
      this.log.warn(
        `Taxonomy cache skipped — database unreachable at bootstrap (${connectionFailureSummary(err)}). ` +
          'Start Postgres and set DATABASE_URL, run migrations + taxonomy import, then restart or call refresh.',
      );
      this.categories = [];
      this.subcategories = [];
    }
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
