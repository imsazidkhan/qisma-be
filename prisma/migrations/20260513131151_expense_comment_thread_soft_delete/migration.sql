-- DropIndex
DROP INDEX "category_aliases_alias_trgm_idx";

-- DropIndex
DROP INDEX "merchant_aliases_alias_trgm_idx";

-- DropIndex
DROP INDEX "normalization_dictionary_variant_trgm_idx";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "group_invites" ALTER COLUMN "updatedAt" DROP DEFAULT;
