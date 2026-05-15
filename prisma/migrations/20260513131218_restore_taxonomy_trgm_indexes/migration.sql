-- Restore GIN(trgm) indexes accidentally dropped by drift migration 20260513131151.

CREATE INDEX IF NOT EXISTS "category_aliases_alias_trgm_idx" ON "category_aliases" USING GIN ("alias" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "merchant_aliases_alias_trgm_idx" ON "merchant_aliases" USING GIN ("alias" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "normalization_dictionary_variant_trgm_idx" ON "normalization_dictionary" USING GIN ("variant" gin_trgm_ops);
