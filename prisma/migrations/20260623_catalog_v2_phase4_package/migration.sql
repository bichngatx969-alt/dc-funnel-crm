-- Catalog v2 Phase 4A: Package/bundle components.
-- Additive-only migration: creates PackageComponent table and indexes.
-- No data mutation and no destructive schema changes.

CREATE TABLE "PackageComponent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "packageItemId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "componentVariantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricingMode" TEXT NOT NULL DEFAULT 'INCLUDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PackageComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PackageComponent_workspaceId_idx" ON "PackageComponent"("workspaceId");
CREATE INDEX "PackageComponent_workspaceId_packageItemId_idx" ON "PackageComponent"("workspaceId", "packageItemId");
CREATE INDEX "PackageComponent_workspaceId_componentItemId_idx" ON "PackageComponent"("workspaceId", "componentItemId");
CREATE INDEX "PackageComponent_workspaceId_componentVariantId_idx" ON "PackageComponent"("workspaceId", "componentVariantId");
CREATE INDEX "PackageComponent_deletedAt_idx" ON "PackageComponent"("deletedAt");
