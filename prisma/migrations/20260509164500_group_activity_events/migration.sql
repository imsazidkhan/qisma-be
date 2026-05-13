-- CreateEnum
CREATE TYPE "GroupActivityEventType" AS ENUM ('member_joined', 'invite_sent', 'invite_accepted');

-- CreateTable
CREATE TABLE "group_activity_events" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "GroupActivityEventType" NOT NULL,
    "actorUserId" TEXT,
    "subjectUserId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_activity_events_groupId_createdAt_idx" ON "group_activity_events" ("groupId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "group_activity_events" ADD CONSTRAINT "group_activity_events_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_activity_events" ADD CONSTRAINT "group_activity_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "group_activity_events" ADD CONSTRAINT "group_activity_events_subjectUserId_fkey"
  FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
