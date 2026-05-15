-- ExpenseComment threading + soft delete + updatedAt (backfill from createdAt for existing rows)

ALTER TABLE "expense_comments"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "parentCommentId" TEXT;

ALTER TABLE "expense_comments" ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "expense_comments" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

ALTER TABLE "expense_comments" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "expense_comments_expenseId_parentCommentId_createdAt_idx" ON "expense_comments"("expenseId", "parentCommentId", "createdAt");

ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "expense_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
