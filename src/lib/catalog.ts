import { CatalogItemStatus, CatalogItemType, MediaAssetSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeNullableText, normalizeText, parsePagination, parseVnd } from "@/lib/order";

export const CATALOG_ITEM_TYPES = [
  "PHYSICAL_PRODUCT",
  "DIGITAL_PRODUCT",
  "BOOKABLE_SERVICE",
  "PACKAGE",
] as const satisfies CatalogItemType[];

export const CATALOG_ITEM_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const satisfies CatalogItemStatus[];

export const MEDIA_ASSET_SOURCES = ["UPLOAD", "URL", "AI_GENERATED", "IMPORT"] as const satisfies MediaAssetSource[];

export const catalogItemSelect = {
  id: true,
  workspaceId: true,
  type: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  description: true,
  status: true,
  categoryId: true,
  basePriceVnd: true,
  compareAtPriceVnd: true,
  costVnd: true,
  marginVnd: true,
  currency: true,
  tagsJson: true,
  coverImageId: true,
  galleryJson: true,
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
  legacyProductLiteId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CatalogItemSelect;

export const catalogCategorySelect = {
  id: true,
  workspaceId: true,
  name: true,
  slug: true,
  parentId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CatalogCategorySelect;

export const mediaAssetSelect = {
  id: true,
  workspaceId: true,
  url: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  altText: true,
  source: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.MediaAssetSelect;

export type CatalogItemDTO = Prisma.CatalogItemGetPayload<{ select: typeof catalogItemSelect }> & {
  category?: Prisma.CatalogCategoryGetPayload<{ select: typeof catalogCategorySelect }> | null;
  coverImage?: Prisma.MediaAssetGetPayload<{ select: typeof mediaAssetSelect }> | null;
  galleryMedia?: Array<Prisma.MediaAssetGetPayload<{ select: typeof mediaAssetSelect }>>;
};

export { parsePagination };

export function normalizeCatalogItemType(value: unknown): CatalogItemType {
  const normalized = normalizeText(value).toUpperCase();
  return CATALOG_ITEM_TYPES.includes(normalized as CatalogItemType) ? (normalized as CatalogItemType) : "PHYSICAL_PRODUCT";
}

export function normalizeCatalogItemStatus(value: unknown, fallback: CatalogItemStatus = "DRAFT"): CatalogItemStatus {
  const normalized = normalizeText(value).toUpperCase();
  return CATALOG_ITEM_STATUSES.includes(normalized as CatalogItemStatus) ? (normalized as CatalogItemStatus) : fallback;
}

export function normalizeMediaAssetSource(value: unknown): MediaAssetSource {
  const normalized = normalizeText(value).toUpperCase();
  return MEDIA_ASSET_SOURCES.includes(normalized as MediaAssetSource) ? (normalized as MediaAssetSource) : "URL";
}

export function parseOptionalVnd(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return parseVnd(value);
}

export function calculateMargin(priceValue: unknown, costValue: unknown): number | null {
  const costVnd = parseOptionalVnd(costValue);
  if (costVnd === null) return null;
  return parseVnd(priceValue) - costVnd;
}

export function normalizeTextList(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  const normalized = items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 80);
  return normalized.length ? normalized : Prisma.JsonNull;
}

export function normalizeMediaIdList(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  return Array.from(
    new Set(
      items
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 80)
    )
  );
}

export function mediaIdListToJson(mediaIds: string[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return mediaIds.length ? mediaIds : Prisma.JsonNull;
}

export function normalizeSlug(value: unknown, fallback: string): string {
  const source = normalizeText(value) || fallback;
  const slug = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || `item-${Date.now().toString(36)}`;
}

export function normalizeUrl(value: unknown): string | null {
  const text = normalizeNullableText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function validateCategory(workspaceId: string, categoryId: string | null) {
  if (!categoryId) return null;
  return prisma.catalogCategory.findFirst({
    where: { id: categoryId, workspaceId, deletedAt: null },
    select: catalogCategorySelect,
  });
}

export async function validateMediaAsset(workspaceId: string, mediaId: string | null) {
  if (!mediaId) return null;
  return prisma.mediaAsset.findFirst({
    where: { id: mediaId, workspaceId, deletedAt: null },
    select: mediaAssetSelect,
  });
}

export async function validateMediaAssets(workspaceId: string, mediaIds: string[]) {
  if (!mediaIds.length) return [];
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: mediaIds }, workspaceId, deletedAt: null },
    select: mediaAssetSelect,
  });
  if (assets.length !== mediaIds.length) return null;
  return assets;
}

export async function createUrlMediaAsset(workspaceId: string, input: {
  url?: unknown;
  fileName?: unknown;
  altText?: unknown;
}) {
  const url = normalizeUrl(input.url);
  if (!url) return null;
  return prisma.mediaAsset.create({
    data: {
      workspaceId,
      url,
      fileName: normalizeNullableText(input.fileName),
      altText: normalizeNullableText(input.altText),
      source: "URL",
    },
    select: mediaAssetSelect,
  });
}

export async function enrichCatalogItems<T extends Prisma.CatalogItemGetPayload<{ select: typeof catalogItemSelect }>>(
  workspaceId: string,
  items: T[]
): Promise<Array<T & Pick<CatalogItemDTO, "category" | "coverImage" | "galleryMedia">>> {
  const categoryIds = Array.from(new Set(items.map((item) => item.categoryId).filter((id): id is string => Boolean(id))));
  const mediaIds = Array.from(
    new Set([
      ...items.map((item) => item.coverImageId).filter((id): id is string => Boolean(id)),
      ...items.flatMap((item) => extractTextArray(item.galleryJson)),
    ])
  );
  const [categories, media] = await Promise.all([
    categoryIds.length
      ? prisma.catalogCategory.findMany({
          where: { id: { in: categoryIds }, workspaceId, deletedAt: null },
          select: catalogCategorySelect,
        })
      : [],
    mediaIds.length
      ? prisma.mediaAsset.findMany({
          where: { id: { in: mediaIds }, workspaceId, deletedAt: null },
          select: mediaAssetSelect,
        })
      : [],
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const mediaById = new Map(media.map((asset) => [asset.id, asset]));
  return items.map((item) => ({
    ...item,
    category: item.categoryId ? categoryById.get(item.categoryId) ?? null : null,
    coverImage: item.coverImageId ? mediaById.get(item.coverImageId) ?? null : null,
    galleryMedia: extractTextArray(item.galleryJson)
      .map((id) => mediaById.get(id))
      .filter((asset): asset is Prisma.MediaAssetGetPayload<{ select: typeof mediaAssetSelect }> => Boolean(asset)),
  }));
}

function extractTextArray(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}
