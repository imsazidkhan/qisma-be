-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateTable
CREATE TABLE "group_invites" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_invites_groupId_phone_key" ON "group_invites"("groupId", "phone");

CREATE INDEX "group_invites_phone_idx" ON "group_invites"("phone");

CREATE INDEX "group_invites_groupId_idx" ON "group_invites"("groupId");

CREATE INDEX "group_invites_status_idx" ON "group_invites"("status");

CREATE INDEX "group_invites_invitedByUserId_idx" ON "group_invites"("invitedByUserId");

CREATE INDEX "group_invites_expiresAt_idx" ON "group_invites"("expiresAt");

-- AddForeignKey
ALTER TABLE "group_invites"
  ADD CONSTRAINT "group_invites_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_invites"
  ADD CONSTRAINT "group_invites_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
