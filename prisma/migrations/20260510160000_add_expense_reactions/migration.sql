-- CreateTable
CREATE TABLE "expense_reactions" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" VARCHAR(32) NOT NULL,

    CONSTRAINT "expense_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_reactions_expenseId_userId_emoji_key" ON "expense_reactions"("expenseId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "expense_reactions_expenseId_idx" ON "expense_reactions"("expenseId");

-- CreateIndex
CREATE INDEX "expense_reactions_userId_idx" ON "expense_reactions"("userId");

-- AddForeignKey
ALTER TABLE "expense_reactions" ADD CONSTRAINT "expense_reactions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_reactions" ADD CONSTRAINT "expense_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
