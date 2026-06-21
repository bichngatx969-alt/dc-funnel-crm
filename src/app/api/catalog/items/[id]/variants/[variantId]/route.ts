import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogVariantSelect,
  enrichVariants,
  normalizeOptionValuesJson,
  normalizeVariantStatus,
  parseNonNegativeInt,
  parseOptionalFloat,
  parseOptionalNonNegativeInt,
  parseOptionalVnd,
  requirePhysicalCatalogItem,
  validateVariantImage,
} from "@/lib/catalog-variants";
import { calculateMargin } from "@/lib/catalog";
import { normalizeNullableText, normalizeText, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id, variantId } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const existing = await prisma.catalogVariant.findFirst({
    where: { id: variantId, workspaceId, catalogItemId: id, deletedAt: null },
    select: catalogVariantSelect,
  });
  if (!existing) return jsonError("Không tìm thấy biến thể", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CatalogVariantUpdateInput = {};

  if (body.deleted === true) {
    data.deletedAt = new Date();
    data.status = "ARCHIVED";
  }
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên biến thể không được để trống");
    data.name = name;
  }
  if ("sku" in body) data.sku = normalizeNullableText(body.sku);
  if ("barcode" in body) data.barcode = normalizeNullableText(body.barcode);
  if ("optionValuesJson" in body || "optionValues" in body) {
    data.optionValuesJson = normalizeOptionValuesJson(body.optionValuesJson ?? body.optionValues);
  }
  if ("priceVnd" in body) data.priceVnd = parseVnd(body.priceVnd);
  if ("compareAtPriceVnd" in body) data.compareAtPriceVnd = parseOptionalVnd(body.compareAtPriceVnd);
  if ("costVnd" in body) data.costVnd = parseOptionalVnd(body.costVnd);
  if ("priceVnd" in body || "costVnd" in body) {
    const nextPrice = "priceVnd" in body ? parseVnd(body.priceVnd) : existing.priceVnd;
    const nextCost = "costVnd" in body ? parseOptionalVnd(body.costVnd) : existing.costVnd;
    data.marginVnd = nextCost === null ? null : calculateMargin(nextPrice, nextCost);
  }
  if ("inventoryTracked" in body) data.inventoryTracked = Boolean(body.inventoryTracked);
  if ("inventoryQuantity" in body) data.inventoryQuantity = parseNonNegativeInt(body.inventoryQuantity);
  if ("lowStockThreshold" in body) data.lowStockThreshold = parseOptionalNonNegativeInt(body.lowStockThreshold);
  if ("weightGram" in body) data.weightGram = parseOptionalNonNegativeInt(body.weightGram);
  if ("lengthCm" in body) data.lengthCm = parseOptionalFloat(body.lengthCm);
  if ("widthCm" in body) data.widthCm = parseOptionalFloat(body.widthCm);
  if ("heightCm" in body) data.heightCm = parseOptionalFloat(body.heightCm);
  if ("status" in body) data.status = normalizeVariantStatus(body.status, existing.status);
  if ("imageId" in body) {
    const image = await validateVariantImage(workspaceId, body.imageId);
    if (!image.ok) return jsonError(image.error, 400);
    data.imageId = image.imageId;
  }

  const variant = await prisma.catalogVariant.update({ where: { id: existing.id }, data, select: catalogVariantSelect });
  const [enriched] = await enrichVariants(workspaceId, [variant]);

  return jsonOk({ variant: enriched });
}
