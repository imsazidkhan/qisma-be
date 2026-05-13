-- CreateTable
CREATE TABLE "expense_attachments" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_attachments_expenseId_idx" ON "expense_attachments"("expenseId");

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
