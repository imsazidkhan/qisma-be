-- CreateTable
CREATE TABLE "expense_payers" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id")
);

-- Migrate existing expenses: single payer paid full amount (after `expenses` exists; columns match 20260510120000_add_expenses_table)
INSERT INTO "expense_payers" ("id", "expense_id", "user_id", "amount")
SELECT gen_random_uuid()::text,
       e."id",
       e."paidByUserId",
       e."amount"
FROM "expenses" e;

CREATE UNIQUE INDEX "expense_payers_expense_id_user_id_key"
  ON "expense_payers"("expense_id", "user_id");
CREATE INDEX "expense_payers_expense_id_idx" ON "expense_payers"("expense_id");
CREATE INDEX "expense_payers_user_id_idx" ON "expense_payers"("user_id");

ALTER TABLE "expense_payers"
  ADD CONSTRAINT "expense_payers_expense_id_fkey"
    FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_payers"
  ADD CONSTRAINT "expense_payers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
