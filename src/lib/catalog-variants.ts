import { Prisma } from "@prisma/client";
import { calculateMargin, catalogItemSelect, mediaAssetSelect, normalizeMediaIdList, validateMediaAsset } from "@/lib/catalog";
import { normalizeNullableText, normalizeText, parsePagination, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";

export const catalogOptionSelect = {
  id: true,
  workspaceId: true,
  catalogItemId: true,
  name: true,
  valuesJson: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CatalogOptionSelect;

export const catalogVariantSelect = {
  id: true,
  workspaceId: true,
  catalogItemId: true,
  name: true,
  sku: true,
  barcode: true,
  optionValuesJson: true,
  priceVnd: true,
  compareAtPriceVnd: true,
  costVnd: true,
  marginVnd: true,
  inventoryTracked: true,
  inventoryQuantity: true,
  lowStockThreshold: true,
  weightGram: true,
  lengthCm: true,
  widthCm: true,
  heightCm: true,
  imageId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.CatalogVariantSelect;

export const inventoryMovementSelect = {
  id: true,
  workspaceId: true,
  variantId: true,
  type: true,
  quantity: true,
  reason: true,
  sourceType: true,
  sourceId: true,
  note: true,
  createdById: true,
  createdAt: true,
} satisfies Prisma.InventoryMovementSelect;

export { parsePagination };

export async function requirePhysicalCatalogItem(workspaceId: string, catalogItemId: string) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: catalogItemId, workspaceId, deletedAt: null },
    select: catalogItemSelect,
  });
  if (!item) return { ok: false as const, error: "Không tìm thấy sản phẩm" };
  if (item.type !== "PHYSICAL_PRODUCT") {
    return { ok: false as const, error: "Variant chỉ áp dụng cho sản phẩm vật lý" };
  }
  return { ok: true as const, item };
}

export function normalizeOptionValues(value: unknown): string[] {
  return normalizeMediaIdList(value).slice(0, 60);
}

export function optionValuesToJson(values: string[]): Prisma.InputJsonValue {
  return values;
}

export function normalizeVariantStatus(value: unknown, fallback = "ACTIVE") {
  const normalized = normalizeText(value).toUpperCase();
  return ["ACTIVE", "DRAFT", "ARCHIVED"].includes(normalized) ? normalized : fallback;
}

export function parseOptionalVnd(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return parseVnd(value);
}

export function parseOptionalNonNegativeInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return parseNonNegativeInt(value);
}

export function parseNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

export function parseOptionalFloat(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

export function parseInventoryDelta(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

export function normalizeInventoryMovementType(value: unknown) {
  const normalized = normalizeText(value).toUpperCase();
  return ["IN", "OUT", "ADJUST", "RESERVE", "RELEASE"].includes(normalized) ? normalized : "ADJUST";
}

export async function validateVariantImage(workspaceId: string, imageId: unknown) {
  const id = normalizeNullableText(imageId);
  if (!id) return { ok: true as const, imageId: null };
  const asset = await validateMediaAsset(workspaceId, id);
  if (!asset) return { ok: false as const, error: "Ảnh biến thể không thuộc workspace hiện tại" };
  return { ok: true as const, imageId: id };
}

export async function enrichVariants<T extends Prisma.CatalogVariantGetPayload<{ select: typeof catalogVariantSelect }>>(
  workspaceId: string,
  variants: T[]
) {
  const imageIds = Array.from(new Set(variants.map((variant) => variant.imageId).filter((id): id is string => Boolean(id))));
  const images = imageIds.length
    ? await prisma.mediaAsset.findMany({ where: { id: { in: imageIds }, workspaceId, deletedAt: null }, select: mediaAssetSelect })
    : [];
  const imageById = new Map(images.map((image) => [image.id, image]));
  return variants.map((variant) => ({
    ...variant,
    image: variant.imageId ? imageById.get(variant.imageId) ?? null : null,
    lowStock:
      variant.inventoryTracked &&
      variant.lowStockThreshold !== null &&
      variant.inventoryQuantity <= variant.lowStockThreshold,
  }));
}

export function buildVariantData(workspaceId: string, catalogItemId: string, body: Record<string, unknown>, defaults?: {
  name?: string;
  priceVnd?: number;
  compareAtPriceVnd?: number | null;
  costVnd?: number | null;
}) {
  const priceVnd = "priceVnd" in body ? parseVnd(body.priceVnd) : defaults?.priceVnd ?? 0;
  const costVnd = "costVnd" in body ? parseOptionalVnd(body.costVnd) : defaults?.costVnd ?? null;
  return {
    workspaceId,
    catalogItemId,
    name: normalizeText(body.name) || defaults?.name || "Biến thể",
    sku: normalizeNullableText(body.sku),
    barcode: normalizeNullableText(body.barcode),
    optionValuesJson: normalizeOptionValuesJson(body.optionValuesJson ?? body.optionValues),
    priceVnd,
    compareAtPriceVnd:
      "compareAtPriceVnd" in body ? parseOptionalVnd(body.compareAtPriceVnd) : defaults?.compareAtPriceVnd ?? null,
    costVnd,
    marginVnd: costVnd === null ? null : calculateMargin(priceVnd, costVnd),
    inventoryTracked: body.inventoryTracked === undefined ? true : Boolean(body.inventoryTracked),
    inventoryQuantity: parseNonNegativeInt(body.inventoryQuantity),
    lowStockThreshold: parseOptionalNonNegativeInt(body.lowStockThreshold),
    weightGram: parseOptionalNonNegativeInt(body.weightGram),
    lengthCm: parseOptionalFloat(body.lengthCm),
    widthCm: parseOptionalFloat(body.widthCm),
    heightCm: parseOptionalFloat(body.heightCm),
    status: normalizeVariantStatus(body.status),
  };
}

export function normalizeOptionValuesJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Prisma.JsonNull;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => [normalizeText(key), normalizeText(val)] as const)
    .filter(([key, val]) => key && val);
  return entries.length ? Object.fromEntries(entries) : Prisma.JsonNull;
}
