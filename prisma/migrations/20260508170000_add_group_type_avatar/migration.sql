-- AlterTable
ALTER TABLE "Group" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'trip';
ALTER TABLE "Group" ADD COLUMN "avatarUrl" TEXT;

-- Make `type` a real column (no perpetual default for inserts; handled by app)
ALTER TABLE "Group" ALTER COLUMN "type" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Group_type_idx" ON "Group"("type");
