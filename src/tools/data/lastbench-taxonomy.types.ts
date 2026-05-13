/** Source rows for LastBench extended taxonomy import. */
export type LastbenchSubInput = Readonly<{
  name: string;
  icon: string;
  slug?: string;
  keywords?: readonly string[];
}>;

export type LastbenchCategoryInput = Readonly<{
  slug: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  keywords?: readonly string[];
  subcategories: readonly LastbenchSubInput[];
}>;
