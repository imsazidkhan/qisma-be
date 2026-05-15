import type { ExpenseCategory, ExpenseSubcategory } from '@prisma/client';

import type { TaxonomyIconDto, TaxonomyTierDto } from '../dto/classify-expense.dto';

/**
 * Derives API **`kind`** from DB **`icon`**:
 * ASCII **`slug`-like** strings → **`glyph`** (client maps to SF Symbols / Lucide / etc.);
 * everything else (emoji, mixed) → **`emoji`**.
 */
export function taxonomyIconFromDb(raw: string | null | undefined): TaxonomyIconDto | null {
  const s = raw?.trim();
  if (!s) return null;
  const glyphLike = /^[a-z0-9][a-z0-9_-]*$/i.test(s);
  return glyphLike ? { kind: 'glyph', value: s } : { kind: 'emoji', value: s };
}

export function mapExpenseCategoryToTier(
  row: Pick<ExpenseCategory, 'id' | 'slug' | 'name' | 'color' | 'icon' | 'iconUrl'>,
): TaxonomyTierDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color ?? null,
    icon: taxonomyIconFromDb(row.icon),
    iconUrl: row.iconUrl?.trim() ? row.iconUrl : null,
  };
}

export function mapExpenseSubcategoryToTier(
  row: Pick<ExpenseSubcategory, 'id' | 'slug' | 'name' | 'color' | 'icon' | 'iconUrl'>,
): TaxonomyTierDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color ?? null,
    icon: taxonomyIconFromDb(row.icon),
    iconUrl: row.iconUrl?.trim() ? row.iconUrl : null,
  };
}
