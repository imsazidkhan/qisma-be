-- Align DB with schema.prisma: optional CDN / image URL beside legacy `icon` glyph field.

ALTER TABLE "expense_categories" ADD COLUMN "iconUrl" VARCHAR(2048);
ALTER TABLE "expense_subcategories" ADD COLUMN "iconUrl" VARCHAR(2048);
