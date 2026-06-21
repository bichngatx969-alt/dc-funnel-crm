-- Catalog v2 foundation, additive-only.
-- No ProductLite/Order/OrderItem changes, no data deletion.

CREATE TYPE "CatalogItemType" AS ENUM ('PHYSICAL_PRODUCT', 'DIGITAL_PRODUCT', 'BOOKABLE_SERVICE', 'PACKAGE');

CREATE TYPE "CatalogItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "MediaAssetSource" AS ENUM ('UPLOAD', 'URL', 'AI_GENERATED', 'IMPORT');

CREATE TABLE "CatalogCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "source" "MediaAssetSource" NOT NULL DEFAULT 'URL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "shortDescription" TEXT,
    "description" TEXT,
    "status" "CatalogItemStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" TEXT,
    "basePriceVnd" INTEGER NOT NULL DEFAULT 0,
    "compareAtPriceVnd" INTEGER,
    "costVnd" INTEGER,
    "marginVnd" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "tagsJson" JSONB,
    "coverImageId" TEXT,
    "galleryJson" JSONB,
    "targetSegment" TEXT,
    "painPointsJson" JSONB,
    "benefitsJson" JSONB,
    "faqsJson" JSONB,
    "objectionsJson" JSONB,
    "offerIdeasJson" JSONB,
    "salesScript" TEXT,
    "aiAuditScore" INTEGER,
    "aiAuditJson" JSONB,
    "aiAuditedAt" TIMESTAMP(3),
    "legacyProductLiteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogCategory_workspaceId_idx" ON "CatalogCategory"("workspaceId");
CREATE INDEX "CatalogCategory_workspaceId_slug_idx" ON "CatalogCategory"("workspaceId", "slug");

CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");
CREATE INDEX "MediaAsset_workspaceId_source_idx" ON "MediaAsset"("workspaceId", "source");

CREATE INDEX "CatalogItem_workspaceId_idx" ON "CatalogItem"("workspaceId");
CREATE INDEX "CatalogItem_workspaceId_type_idx" ON "CatalogItem"("workspaceId", "type");
CREATE INDEX "CatalogItem_workspaceId_status_idx" ON "CatalogItem"("workspaceId", "status");
CREATE INDEX "CatalogItem_workspaceId_categoryId_idx" ON "CatalogItem"("workspaceId", "categoryId");
CREATE INDEX "CatalogItem_workspaceId_slug_idx" ON "CatalogItem"("workspaceId", "slug");
CREATE INDEX "CatalogItem_workspaceId_legacyProductLiteId_idx" ON "CatalogItem"("workspaceId", "legacyProductLiteId");
