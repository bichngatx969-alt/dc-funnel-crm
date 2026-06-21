import { Prisma } from "@prisma/client";
import { normalizeSlug } from "./catalog";
import { normalizeNullableText } from "./order";
import { prisma } from "./prisma";

export const productLiteForCatalogSyncSelect = {
  id: true,
  workspaceId: true,
  name: true,
  sku: true,
  priceVnd: true,
  costVnd: true,
  marginVnd: true,
  description: true,
  targetSegment: true,
  painPointsJson: true,
  benefitsJson: true,
  faqsJson: true,
  objectionsJson: true,
  offerIdeasJson: true,
  salesScript: true,
  aiAuditScore: true,
  aiAuditJson: true,
  aiAuditedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ProductLiteSelect;

type ProductLiteForCatalogSync = Prisma.ProductLiteGetPayload<{
  select: typeof productLiteForCatalogSyncSelect;
}>;

type CatalogMirrorData = {
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  basePriceVnd: number;
  costVnd: number | null;
  marginVnd: number | null;
  currency: "VND";
  targetSegment: string | null;
  painPointsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  benefitsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  faqsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  objectionsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  offerIdeasJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  salesScript: string | null;
  aiAuditScore: number | null;
  aiAuditJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  aiAuditedAt: Date | null;
  deletedAt: Date | null;
};

export type CatalogSyncMode = "createOnly" | "mirror";

export type CatalogSyncResult = {
  productId: string;
  catalogItemId: string | null;
  action: "created" | "updated" | "skipped" | "missing";
};

export async function syncProductLiteToCatalogItem(
  productId: string,
  options: { mode?: CatalogSyncMode } = {}
): Promise<CatalogSyncResult> {
  const product = await prisma.productLite.findFirst({
    where: { id: productId },
    select: productLiteForCatalogSyncSelect,
  });
  if (!product) return { productId, catalogItemId: null, action: "missing" };
  return syncProductLiteRecordToCatalogItem(product, options);
}

export async function syncProductLiteRecordToCatalogItem(
  product: ProductLiteForCatalogSync,
  options: { mode?: CatalogSyncMode } = {}
): Promise<CatalogSyncResult> {
  const mode = options.mode ?? "createOnly";
  const existing = await prisma.catalogItem.findFirst({
    where: { workspaceId: product.workspaceId, legacyProductLiteId: product.id },
    select: { id: true },
  });

  if (existing && mode === "createOnly") {
    return { productId: product.id, catalogItemId: existing.id, action: "skipped" };
  }

  const data = catalogDataFromProductLite(product);
  if (existing) {
    const updated = await prisma.catalogItem.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
    return { productId: product.id, catalogItemId: updated.id, action: "updated" };
  }

  const created = await prisma.catalogItem.create({
    data: {
      ...data,
      workspaceId: product.workspaceId,
      type: "PHYSICAL_PRODUCT",
      legacyProductLiteId: product.id,
    },
    select: { id: true },
  });
  return { productId: product.id, catalogItemId: created.id, action: "created" };
}

export async function backfillProductLiteCatalogItems(options: {
  apply?: boolean;
  workspaceId?: string;
  includeDeleted?: boolean;
}) {
  const products = await prisma.productLite.findMany({
    where: {
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
    select: productLiteForCatalogSyncSelect,
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    mode: options.apply ? "APPLY" : "DRY_RUN",
    scanned: products.length,
    existing: 0,
    created: 0,
    updated: 0,
    missing: 0,
  };

  for (const product of products) {
    const existing = await prisma.catalogItem.findFirst({
      where: { workspaceId: product.workspaceId, legacyProductLiteId: product.id },
      select: { id: true },
    });

    if (existing) {
      summary.existing++;
      continue;
    }

    if (!options.apply) {
      summary.created++;
      continue;
    }

    const result = await syncProductLiteRecordToCatalogItem(product, { mode: "createOnly" });
    if (result.action === "created") summary.created++;
    if (result.action === "updated") summary.updated++;
    if (result.action === "missing") summary.missing++;
  }

  return summary;
}

function catalogDataFromProductLite(product: ProductLiteForCatalogSync): CatalogMirrorData {
  const status = product.deletedAt || !product.isActive ? "ARCHIVED" : "ACTIVE";
  return {
    name: product.name,
    slug: normalizeSlug(product.sku ? `${product.sku}-${product.name}` : product.name, product.name),
    sku: normalizeNullableText(product.sku),
    shortDescription: shortDescriptionFrom(product.description),
    description: normalizeNullableText(product.description),
    status,
    basePriceVnd: product.priceVnd,
    costVnd: product.costVnd,
    marginVnd: product.marginVnd,
    currency: "VND",
    targetSegment: normalizeNullableText(product.targetSegment),
    painPointsJson: jsonOrNull(product.painPointsJson),
    benefitsJson: jsonOrNull(product.benefitsJson),
    faqsJson: jsonOrNull(product.faqsJson),
    objectionsJson: jsonOrNull(product.objectionsJson),
    offerIdeasJson: jsonOrNull(product.offerIdeasJson),
    salesScript: normalizeNullableText(product.salesScript),
    aiAuditScore: product.aiAuditScore,
    aiAuditJson: jsonOrNull(product.aiAuditJson),
    aiAuditedAt: product.aiAuditedAt,
    deletedAt: product.deletedAt,
  };
}

function shortDescriptionFrom(description: string | null): string | null {
  const text = normalizeNullableText(description);
  if (!text) return null;
  return text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
}

function jsonOrNull(value: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}
