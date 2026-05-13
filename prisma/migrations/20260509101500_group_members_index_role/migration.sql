-- CreateIndex (Step 3: query members by role, e.g. list owners/admins per group or globally)
CREATE INDEX "group_members_role_idx" ON "group_members"("role");
