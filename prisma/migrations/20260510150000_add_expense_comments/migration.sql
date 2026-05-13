-- CreateTable
CREATE TABLE "expense_comments" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_comments_expenseId_idx" ON "expense_comments"("expenseId");

-- CreateIndex
CREATE INDEX "expense_comments_userId_idx" ON "expense_comments"("userId");

-- CreateIndex
CREATE INDEX "expense_comments_expenseId_createdAt_idx" ON "expense_comments"("expenseId", "createdAt");

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
