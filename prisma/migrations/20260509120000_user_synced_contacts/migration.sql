-- Snapshot of device phones per user (digits-only), replaced on each POST /v1/contacts/sync.

CREATE TABLE "user_synced_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_synced_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_synced_contacts_userId_phone_key"
  ON "user_synced_contacts"("userId", "phone");

CREATE INDEX "user_synced_contacts_userId_idx" ON "user_synced_contacts"("userId");

ALTER TABLE "user_synced_contacts"
  ADD CONSTRAINT "user_synced_contacts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
