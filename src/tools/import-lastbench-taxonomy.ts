import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { LASTBENCH_TAXONOMY_CATEGORIES } from './data/lastbench-taxonomy.manifest';
import type { LastbenchSubInput } from './data/lastbench-taxonomy.types';

function slugify(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base.length > 0 ? base : 'item';
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

  try {
    for (const cat of LASTBENCH_TAXONOMY_CATEGORIES) {
      const row = await prisma.expenseCategory.upsert({
        where: { slug: cat.slug },
        create: {
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          keywords: [...(cat.keywords ?? [])],
          sortOrder: cat.sortOrder,
          isActive: true,
        },
        update: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          keywords: [...(cat.keywords ?? [])],
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });

      for (const sub of cat.subcategories as readonly LastbenchSubInput[]) {
        const slug = sub.slug ?? slugify(sub.name);
        await prisma.expenseSubcategory.upsert({
          where: {
            categoryId_slug: { categoryId: row.id, slug },
          },
          create: {
            categoryId: row.id,
            slug,
            name: sub.name,
            icon: sub.icon,
            keywords: [...(sub.keywords ?? [])],
          },
          update: {
            name: sub.name,
            icon: sub.icon,
            keywords: [...(sub.keywords ?? [])],
          },
        });
      }
    }

    // eslint-disable-next-line no-console
    const subCount = LASTBENCH_TAXONOMY_CATEGORIES.reduce(
      (n, c) => n + c.subcategories.length,
      0,
    );
    console.log(
      `taxonomy:import OK — ${String(LASTBENCH_TAXONOMY_CATEGORIES.length)} categories, ${String(subCount)} subcategories`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
