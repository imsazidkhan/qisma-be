import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

import { PART01 } from './taxonomy-part01';
import { PART02 } from './taxonomy-part02';
import { PART03 } from './taxonomy-part03';
import { PART04 } from './taxonomy-part04';

/** Full expense taxonomy for **`pnpm taxonomy:import`**. Fallback classifier slug **`miscellaneous`**. */
export const LASTBENCH_TAXONOMY_CATEGORIES: readonly LastbenchCategoryInput[] =
  [...PART01, ...PART02, ...PART03, ...PART04];
