-- Taxonomy Engine: category aliases, merchant aliases, user learning, feedback, normalization

-- Enable trigram extension for fuzzy matching (Phase 3)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ═══ Category Aliases ═══
CREATE TABLE "category_aliases" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "alias" VARCHAR(200) NOT NULL,
    "locale" VARCHAR(10),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "source" VARCHAR(20) NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_aliases_pkey" PRIMARY KEY ("id")
);

-- ═══ Merchant Aliases ═══
CREATE TABLE "merchant_aliases" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "alias" VARCHAR(200) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'system',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_aliases_pkey" PRIMARY KEY ("id")
);

-- ═══ User Category Learning ═══
CREATE TABLE "user_category_learning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "weight" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_category_learning_pkey" PRIMARY KEY ("id")
);

-- ═══ Classification Feedback ═══
CREATE TABLE "classification_feedback" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "predictedCategoryId" TEXT,
    "predictedSubcategoryId" TEXT,
    "correctedCategoryId" TEXT,
    "correctedSubcategoryId" TEXT,
    "inputTitle" VARCHAR(500) NOT NULL,
    "normalizedTitle" VARCHAR(500) NOT NULL,
    "originalConfidence" DECIMAL(5,4) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classification_feedback_pkey" PRIMARY KEY ("id")
);

-- ═══ Normalization Dictionary ═══
CREATE TABLE "normalization_dictionary" (
    "id" TEXT NOT NULL,
    "variant" VARCHAR(200) NOT NULL,
    "canonical" VARCHAR(200) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "normalization_dictionary_pkey" PRIMARY KEY ("id")
);

-- ═══ Unique Constraints ═══
CREATE UNIQUE INDEX "category_aliases_alias_categoryId_subcategoryId_key" ON "category_aliases"("alias", "categoryId", "subcategoryId");
CREATE UNIQUE INDEX "merchant_aliases_merchantId_alias_key" ON "merchant_aliases"("merchantId", "alias");
CREATE UNIQUE INDEX "user_category_learning_userId_categoryId_subcategoryId_key" ON "user_category_learning"("userId", "categoryId", "subcategoryId");
CREATE UNIQUE INDEX "normalization_dictionary_variant_key" ON "normalization_dictionary"("variant");

-- ═══ B-tree Indexes ═══
CREATE INDEX "category_aliases_alias_idx" ON "category_aliases"("alias");
CREATE INDEX "category_aliases_categoryId_idx" ON "category_aliases"("categoryId");
CREATE INDEX "category_aliases_subcategoryId_idx" ON "category_aliases"("subcategoryId");
CREATE INDEX "category_aliases_usageCount_idx" ON "category_aliases"("usageCount" DESC);

CREATE INDEX "merchant_aliases_alias_idx" ON "merchant_aliases"("alias");
CREATE INDEX "merchant_aliases_usageCount_idx" ON "merchant_aliases"("usageCount" DESC);

CREATE INDEX "user_category_learning_userId_idx" ON "user_category_learning"("userId");
CREATE INDEX "user_category_learning_userId_weight_idx" ON "user_category_learning"("userId", "weight" DESC);

CREATE INDEX "classification_feedback_userId_idx" ON "classification_feedback"("userId");
CREATE INDEX "classification_feedback_action_idx" ON "classification_feedback"("action");
CREATE INDEX "classification_feedback_predictedCategoryId_idx" ON "classification_feedback"("predictedCategoryId");
CREATE INDEX "classification_feedback_correctedCategoryId_idx" ON "classification_feedback"("correctedCategoryId");
CREATE INDEX "classification_feedback_createdAt_idx" ON "classification_feedback"("createdAt");

CREATE INDEX "normalization_dictionary_canonical_idx" ON "normalization_dictionary"("canonical");
CREATE INDEX "normalization_dictionary_type_idx" ON "normalization_dictionary"("type");

-- ═══ Trigram GIN Indexes (fuzzy matching) ═══
CREATE INDEX "category_aliases_alias_trgm_idx" ON "category_aliases" USING GIN ("alias" gin_trgm_ops);
CREATE INDEX "merchant_aliases_alias_trgm_idx" ON "merchant_aliases" USING GIN ("alias" gin_trgm_ops);
CREATE INDEX "normalization_dictionary_variant_trgm_idx" ON "normalization_dictionary" USING GIN ("variant" gin_trgm_ops);

-- ═══ Foreign Keys ═══
ALTER TABLE "category_aliases" ADD CONSTRAINT "category_aliases_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_aliases" ADD CONSTRAINT "category_aliases_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_aliases" ADD CONSTRAINT "merchant_aliases_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "expense_merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
