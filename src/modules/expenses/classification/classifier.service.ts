import type {
  ExpenseCategory,
  ExpenseMerchant,
  ExpenseSubcategory,
  ExpenseTag,
} from '@prisma/client';
import { ExpenseClassificationSource } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { scoreKeywordOverlap } from './keyword-matcher';
import { matchExpenseMerchantFromTitle } from './merchant-matcher';
import { TaxonomyCacheService } from './taxonomy-cache.service';

export type ClassifyExpenseResult = Readonly<{
  category: ExpenseCategory | null;
  subcategory: ExpenseSubcategory | null;
  merchant: ExpenseMerchant | null;
  tags: readonly ExpenseTag[];
  classificationSource: ExpenseClassificationSource;
  isFallback: boolean;
  shouldPromptCorrection: boolean;
  suggestedAlternatives: ExpenseCategory[] | null;
}>;

@Injectable()
export class ClassifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TaxonomyCacheService,
  ) {}

  async classifyStandalone(
    actorUserId: string,
    title: string,
  ): Promise<ClassifyExpenseResult> {
    const categories = [...this.cache.categoriesList] as ExpenseCategory[];
    const subcategories = this.cache.subcategoriesList as ExpenseSubcategory[];
    const merchants = await this.prisma.expenseMerchant.findMany({
      take: 500,
    });

    let bestSub: ExpenseSubcategory | null = null;
    let bestCat: ExpenseCategory | null = null;
    let bestScore = 0;

    for (const s of subcategories) {
      const c = categories.find((x) => x.id === s.categoryId) ?? null;
      const kw = [...s.keywords, ...(c?.keywords ?? [])];
      const sc = scoreKeywordOverlap(title, kw);
      if (sc > bestScore) {
        bestScore = sc;
        bestSub = s;
        bestCat = c;
      }
    }

    for (const c of categories) {
      const sc = scoreKeywordOverlap(title, c.keywords);
      if (sc > bestScore) {
        bestScore = sc;
        bestCat = c;
        bestSub = null;
      }
    }

    const learning = await this.prisma.userCategoryLearning.findMany({
      where: { userId: actorUserId },
      orderBy: { weight: 'desc' },
      take: 5,
    });

    if (learning.length > 0 && bestScore === 0) {
      const top = learning[0]!;
      if (top.subcategoryId) {
        const s = subcategories.find((x) => x.id === top.subcategoryId) ?? null;
        if (s) {
          bestSub = s;
          bestCat = categories.find((x) => x.id === s.categoryId) ?? null;
        }
      } else if (top.categoryId) {
        bestCat = categories.find((x) => x.id === top.categoryId) ?? null;
      }
    }

    const miscellaneousFallback =
      categories.find((c) => c.slug === 'miscellaneous') ??
      categories.find((c) => c.slug === 'misc') ??
      null;

    if (!bestCat && categories.length > 0) {
      bestCat = miscellaneousFallback ?? categories[0]!;
    }

    const isFallback = bestScore === 0;
    let merchant: ExpenseMerchant | null = matchExpenseMerchantFromTitle(
      title,
      merchants,
    );

    const tagRows = await this.prisma.expenseTag.findMany({ take: 20 });

    return {
      category: bestCat,
      subcategory: bestSub,
      merchant,
      tags: tagRows,
      classificationSource:
        merchant && bestScore > 0
          ? ExpenseClassificationSource.merchant
          : bestScore > 0
            ? ExpenseClassificationSource.keyword
            : learning.length > 0
              ? ExpenseClassificationSource.historical_bonus
              : ExpenseClassificationSource.system,
      isFallback,
      shouldPromptCorrection: isFallback,
      suggestedAlternatives: isFallback && categories.length > 1 ? categories.slice(1, 4) : null,
    };
  }
}
