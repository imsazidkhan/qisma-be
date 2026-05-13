-- AlterTable
ALTER TABLE "expense_reactions" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex (optional — matches schema @@index)
CREATE INDEX IF NOT EXISTS "expense_reactions_expenseId_createdAt_idx" ON "expense_reactions" ("expenseId", "createdAt");
