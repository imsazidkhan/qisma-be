-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "actorId" TEXT,
    "entityId" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_groupId_createdAt_idx" ON "activity_logs"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_groupId_idx" ON "activity_logs"("groupId");

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "activity_logs_actorId_idx" ON "activity_logs"("actorId");

-- CreateIndex
CREATE INDEX "activity_logs_entityId_idx" ON "activity_logs"("entityId");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
