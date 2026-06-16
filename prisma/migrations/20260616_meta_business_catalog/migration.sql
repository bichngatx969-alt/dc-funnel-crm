-- Add Meta Business Manager / Catalog connections.
-- Additive-only migration: creates new tables, indexes, and foreign keys.

CREATE TABLE "MetaBusinessConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "businessId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "verificationStatus" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MetaBusinessConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetaCatalogConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessConnectionId" TEXT,
    "businessId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "catalogName" TEXT NOT NULL,
    "vertical" TEXT,
    "productCount" INTEGER,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MetaCatalogConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaBusinessConnection_workspaceId_businessId_key" ON "MetaBusinessConnection"("workspaceId", "businessId");
CREATE INDEX "MetaBusinessConnection_businessId_idx" ON "MetaBusinessConnection"("businessId");
CREATE INDEX "MetaBusinessConnection_userId_idx" ON "MetaBusinessConnection"("userId");
CREATE INDEX "MetaBusinessConnection_deletedAt_idx" ON "MetaBusinessConnection"("deletedAt");

CREATE UNIQUE INDEX "MetaCatalogConnection_workspaceId_catalogId_key" ON "MetaCatalogConnection"("workspaceId", "catalogId");
CREATE INDEX "MetaCatalogConnection_businessId_idx" ON "MetaCatalogConnection"("businessId");
CREATE INDEX "MetaCatalogConnection_businessConnectionId_idx" ON "MetaCatalogConnection"("businessConnectionId");
CREATE INDEX "MetaCatalogConnection_deletedAt_idx" ON "MetaCatalogConnection"("deletedAt");

ALTER TABLE "MetaBusinessConnection"
ADD CONSTRAINT "MetaBusinessConnection_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MetaCatalogConnection"
ADD CONSTRAINT "MetaCatalogConnection_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MetaCatalogConnection"
ADD CONSTRAINT "MetaCatalogConnection_businessConnectionId_fkey"
FOREIGN KEY ("businessConnectionId") REFERENCES "MetaBusinessConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
