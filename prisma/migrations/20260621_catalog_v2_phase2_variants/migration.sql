-- Catalog v2 Phase 2A: Variant schema + inventory movement.
-- Additive-only migration: creates new tables and indexes, no data mutation.

CREATE TABLE "CatalogOption" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valuesJson" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogVariant" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "optionValuesJson" JSONB,
    "priceVnd" INTEGER NOT NULL DEFAULT 0,
    "compareAtPriceVnd" INTEGER,
    "costVnd" INTEGER,
    "marginVnd" INTEGER,
    "inventoryTracked" BOOLEAN NOT NULL DEFAULT true,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER,
    "weightGram" INTEGER,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "imageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogOption_workspaceId_idx" ON "CatalogOption"("workspaceId");
CREATE INDEX "CatalogOption_workspaceId_catalogItemId_idx" ON "CatalogOption"("workspaceId", "catalogItemId");

CREATE INDEX "CatalogVariant_workspaceId_idx" ON "CatalogVariant"("workspaceId");
CREATE INDEX "CatalogVariant_workspaceId_catalogItemId_idx" ON "CatalogVariant"("workspaceId", "catalogItemId");
CREATE INDEX "CatalogVariant_workspaceId_sku_idx" ON "CatalogVariant"("workspaceId", "sku");
CREATE INDEX "CatalogVariant_workspaceId_status_idx" ON "CatalogVariant"("workspaceId", "status");

CREATE INDEX "InventoryMovement_workspaceId_idx" ON "InventoryMovement"("workspaceId");
CREATE INDEX "InventoryMovement_workspaceId_variantId_idx" ON "InventoryMovement"("workspaceId", "variantId");
CREATE INDEX "InventoryMovement_workspaceId_type_idx" ON "InventoryMovement"("workspaceId", "type");
CREATE INDEX "InventoryMovement_workspaceId_createdAt_idx" ON "InventoryMovement"("workspaceId", "createdAt");
