-- Structured financial event taxonomy + expense analytics columns (additive, backward compatible).

CREATE TYPE "ExpenseClassificationSource" AS ENUM ('system', 'user', 'keyword', 'merchant', 'historical_bonus');

ALTER TYPE "GroupActivityEventType" ADD VALUE 'expense_classified';
ALTER TYPE "GroupActivityEventType" ADD VALUE 'expense_reclassified';
ALTER TYPE "GroupActivityEventType" ADD VALUE 'merchant_recognized';
ALTER TYPE "GroupActivityEventType" ADD VALUE 'recurring_expense_detected';

CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "icon" VARCHAR(64),
    "color" VARCHAR(16),
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_categories_slug_key" ON "expense_categories"("slug");

CREATE TABLE "expense_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "icon" VARCHAR(64),
    "color" VARCHAR(16),
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_subcategories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_subcategories_categoryId_slug_key" ON "expense_subcategories"("categoryId", "slug");
CREATE INDEX "expense_subcategories_categoryId_idx" ON "expense_subcategories"("categoryId");

CREATE TABLE "expense_tags" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "color" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_tags_slug_key" ON "expense_tags"("slug");

CREATE TABLE "expense_merchants" (
    "id" TEXT NOT NULL,
    "normalizedName" VARCHAR(200) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "categoryHints" JSONB NOT NULL DEFAULT '{}',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_merchants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_merchants_normalizedName_key" ON "expense_merchants"("normalizedName");

CREATE TABLE "expense_tag_mappings" (
    "expenseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_tag_mappings_pkey" PRIMARY KEY ("expenseId","tagId")
);

CREATE INDEX "expense_tag_mappings_tagId_idx" ON "expense_tag_mappings"("tagId");

ALTER TABLE "expense_subcategories"
  ADD CONSTRAINT "expense_subcategories_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expense_tag_mappings"
  ADD CONSTRAINT "expense_tag_mappings_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_tag_mappings"
  ADD CONSTRAINT "expense_tag_mappings_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "expense_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD COLUMN     "categoryId" TEXT,
  ADD COLUMN     "subcategoryId" TEXT,
  ADD COLUMN     "merchantId" TEXT,
  ADD COLUMN     "classificationConfidence" DECIMAL(5,4),
  ADD COLUMN     "classificationSource" "ExpenseClassificationSource",
  ADD COLUMN     "isUserClassified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "classifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN     "expenseMonth" INTEGER,
  ADD COLUMN     "expenseYear" INTEGER,
  ADD COLUMN     "expenseDayOfWeek" INTEGER,
  ADD COLUMN     "expenseHour" INTEGER,
  ADD COLUMN     "recurringDetected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "recurringConfidence" DECIMAL(5,4),
  ADD COLUMN     "recurringGroupId" TEXT,
  ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN     "city" VARCHAR(128);

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "expense_merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "expenses_groupId_createdAt_idx" ON "expenses"("groupId", "createdAt" DESC);
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX "expenses_subcategoryId_idx" ON "expenses"("subcategoryId");
CREATE INDEX "expenses_merchantId_idx" ON "expenses"("merchantId");
CREATE INDEX "expenses_recurringDetected_idx" ON "expenses"("recurringDetected");
CREATE INDEX "expenses_expenseYear_expenseMonth_idx" ON "expenses"("expenseYear", "expenseMonth");
CREATE INDEX "expenses_city_idx" ON "expenses"("city");

-- Partial index: hot path for non-deleted group expense scans (comment: add GIN(metadata) when JSONB filters ship)
CREATE INDEX "expenses_group_active_date_idx" ON "expenses" ("groupId", "date" DESC)
WHERE "deletedAt" IS NULL;

COMMENT ON COLUMN "expenses"."metadata" IS 'Sparse context: vibe, occasion, weather, social, timeOfDay, etc.';
