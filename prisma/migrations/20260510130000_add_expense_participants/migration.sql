-- CreateTable
CREATE TABLE "expense_participants" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "shares" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_participants_expenseId_userId_key" ON "expense_participants"("expenseId", "userId");

-- CreateIndex
CREATE INDEX "expense_participants_expenseId_idx" ON "expense_participants"("expenseId");

-- CreateIndex
CREATE INDEX "expense_participants_userId_idx" ON "expense_participants"("userId");

-- CreateIndex
CREATE INDEX "expense_participants_isSettled_idx" ON "expense_participants"("isSettled");

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
