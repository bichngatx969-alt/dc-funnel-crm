import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogItemSelect,
  createUrlMediaAsset,
  enrichCatalogItems,
  normalizeCatalogItemStatus,
  normalizeCatalogItemType,
  normalizeSlug,
  normalizeTextList,
  parseOptionalVnd,
  validateCategory,
  validateMediaAsset,
} from "@/lib/catalog";
import { normalizeNullableText, normalizeText, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await prisma.catalogItem.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: catalogItemSelect,
  });
  if (!item) return jsonError("Không tìm thấy catalog item", 404);
  const [enriched] = await enrichCatalogItems(workspaceId, [item]);

  return jsonOk({ item: enriched });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.catalogItem.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: catalogItemSelect,
  });
  if (!existing) return jsonError("Không tìm thấy catalog item", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CatalogItemUpdateInput = {};

  if (body.deleted === true) {
    data.deletedAt = new Date();
    data.status = "ARCHIVED";
  }
  if ("type" in body) data.type = normalizeCatalogItemType(body.type);
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên sản phẩm/dịch vụ không được để trống");
    data.name = name;
    if (!("slug" in body)) data.slug = normalizeSlug(existing.slug, name);
  }
  if ("slug" in body) data.slug = normalizeSlug(body.slug, ("name" in body ? body.name : existing.name) ?? existing.name);
  if ("sku" in body) data.sku = normalizeNullableText(body.sku);
  if ("shortDescription" in body) data.shortDescription = normalizeNullableText(body.shortDescription);
  if ("description" in body) data.description = normalizeNullableText(body.description);
  if ("status" in body) data.status = normalizeCatalogItemStatus(body.status, existing.status);

  if ("categoryId" in body) {
    const categoryId = normalizeNullableText(body.categoryId);
    if (categoryId && !(await validateCategory(workspaceId, categoryId))) {
      return jsonError("Danh mục không thuộc workspace hiện tại", 400);
    }
    data.categoryId = categoryId;
  }

  if ("coverImageId" in body) {
    const coverImageId = normalizeNullableText(body.coverImageId);
    if (coverImageId && !(await validateMediaAsset(workspaceId, coverImageId))) {
      return jsonError("Ảnh cover không thuộc workspace hiện tại", 400);
    }
    data.coverImageId = coverImageId;
  }
  if (body.coverImageUrl) {
    const asset = await createUrlMediaAsset(workspaceId, {
      url: body.coverImageUrl,
      fileName: body.coverImageFileName,
      altText: body.coverImageAltText ?? ("name" in body ? body.name : existing.name),
    });
    if (asset) data.coverImageId = asset.id;
  }

  if ("basePriceVnd" in body || "priceVnd" in body) data.basePriceVnd = parseVnd(body.basePriceVnd ?? body.priceVnd);
  if ("compareAtPriceVnd" in body) data.compareAtPriceVnd = parseOptionalVnd(body.compareAtPriceVnd);
  if ("costVnd" in body) data.costVnd = parseOptionalVnd(body.costVnd);
  if ("basePriceVnd" in body || "priceVnd" in body || "costVnd" in body) {
    const nextPrice = "basePriceVnd" in body || "priceVnd" in body ? parseVnd(body.basePriceVnd ?? body.priceVnd) : existing.basePriceVnd;
    const nextCost = "costVnd" in body ? parseOptionalVnd(body.costVnd) : existing.costVnd;
    data.marginVnd = nextCost === null ? null : nextPrice - nextCost;
  }
  if ("tagsJson" in body || "tags" in body) data.tagsJson = normalizeTextList(body.tagsJson ?? body.tags);
  if ("galleryJson" in body || "gallery" in body) data.galleryJson = normalizeTextList(body.galleryJson ?? body.gallery);
  if ("targetSegment" in body) data.targetSegment = normalizeNullableText(body.targetSegment);
  if ("painPointsJson" in body || "painPoints" in body) data.painPointsJson = normalizeTextList(body.painPointsJson ?? body.painPoints);
  if ("benefitsJson" in body || "benefits" in body) data.benefitsJson = normalizeTextList(body.benefitsJson ?? body.benefits);
  if ("faqsJson" in body || "faqs" in body) data.faqsJson = normalizeTextList(body.faqsJson ?? body.faqs);
  if ("objectionsJson" in body || "objections" in body) data.objectionsJson = normalizeTextList(body.objectionsJson ?? body.objections);
  if ("offerIdeasJson" in body || "offerIdeas" in body) data.offerIdeasJson = normalizeTextList(body.offerIdeasJson ?? body.offerIdeas);
  if ("salesScript" in body) data.salesScript = normalizeNullableText(body.salesScript);

  const item = await prisma.catalogItem.update({
    where: { id: existing.id },
    data,
    select: catalogItemSelect,
  });
  const [enriched] = await enrichCatalogItems(workspaceId, [item]);

  return jsonOk({ item: enriched });
}
