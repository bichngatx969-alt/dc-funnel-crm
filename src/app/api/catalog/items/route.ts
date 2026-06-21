import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  calculateMargin,
  catalogItemSelect,
  createUrlMediaAsset,
  enrichCatalogItems,
  mediaIdListToJson,
  normalizeCatalogItemStatus,
  normalizeCatalogItemType,
  normalizeMediaIdList,
  normalizeSlug,
  normalizeTextList,
  parseOptionalVnd,
  parsePagination,
  validateCategory,
  validateMediaAsset,
  validateMediaAssets,
} from "@/lib/catalog";
import { normalizeNullableText, normalizeText, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const hasImage = searchParams.get("hasImage");
  const lowAiScore = searchParams.get("lowAiScore");
  const { page, pageSize, skip } = parsePagination(searchParams);

  const where: Prisma.CatalogItemWhereInput = {
    workspaceId,
    deletedAt: null,
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) where.type = normalizeCatalogItemType(type);
  if (status) where.status = normalizeCatalogItemStatus(status);
  if (categoryId) where.categoryId = categoryId;
  if (hasImage === "true") where.coverImageId = { not: null };
  if (hasImage === "false") where.coverImageId = null;
  if (lowAiScore === "true") {
    where.AND = [
      ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
      { OR: [{ aiAuditScore: null }, { aiAuditScore: { lt: 70 } }] },
    ];
  }

  const [rawItems, total] = await prisma.$transaction([
    prisma.catalogItem.findMany({
      where,
      select: catalogItemSelect,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.catalogItem.count({ where }),
  ]);
  const items = await enrichCatalogItems(workspaceId, rawItems);

  return jsonOk({
    items,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));

  const name = normalizeText(body.name);
  if (!name) return jsonError("Tên sản phẩm/dịch vụ không được để trống");

  const categoryId = normalizeNullableText(body.categoryId);
  if (categoryId && !(await validateCategory(workspaceId, categoryId))) {
    return jsonError("Danh mục không thuộc workspace hiện tại", 400);
  }

  let coverImageId = normalizeNullableText(body.coverImageId);
  if (coverImageId && !(await validateMediaAsset(workspaceId, coverImageId))) {
    return jsonError("Ảnh cover không thuộc workspace hiện tại", 400);
  }
  if (!coverImageId && body.coverImageUrl) {
    const asset = await createUrlMediaAsset(workspaceId, {
      url: body.coverImageUrl,
      fileName: body.coverImageFileName,
      altText: body.coverImageAltText ?? name,
    });
    coverImageId = asset?.id ?? null;
  }
  const galleryIds = normalizeMediaIdList(body.galleryJson ?? body.gallery);
  if (galleryIds.length && !(await validateMediaAssets(workspaceId, galleryIds))) {
    return jsonError("Gallery có ảnh không thuộc workspace hiện tại", 400);
  }

  const basePriceVnd = parseVnd(body.basePriceVnd ?? body.priceVnd);
  const costVnd = parseOptionalVnd(body.costVnd);
  const item = await prisma.catalogItem.create({
    data: {
      workspaceId,
      type: normalizeCatalogItemType(body.type),
      name,
      slug: normalizeSlug(body.slug, name),
      sku: normalizeNullableText(body.sku),
      shortDescription: normalizeNullableText(body.shortDescription),
      description: normalizeNullableText(body.description),
      status: normalizeCatalogItemStatus(body.status, "ACTIVE"),
      categoryId,
      basePriceVnd,
      compareAtPriceVnd: parseOptionalVnd(body.compareAtPriceVnd),
      costVnd,
      marginVnd: costVnd === null ? null : basePriceVnd - costVnd,
      currency: "VND",
      tagsJson: normalizeTextList(body.tagsJson ?? body.tags),
      coverImageId,
      galleryJson: mediaIdListToJson(galleryIds),
      targetSegment: normalizeNullableText(body.targetSegment),
      painPointsJson: normalizeTextList(body.painPointsJson ?? body.painPoints),
      benefitsJson: normalizeTextList(body.benefitsJson ?? body.benefits),
      faqsJson: normalizeTextList(body.faqsJson ?? body.faqs),
      objectionsJson: normalizeTextList(body.objectionsJson ?? body.objections),
      offerIdeasJson: normalizeTextList(body.offerIdeasJson ?? body.offerIdeas),
      salesScript: normalizeNullableText(body.salesScript),
      legacyProductLiteId: normalizeNullableText(body.legacyProductLiteId),
    },
    select: catalogItemSelect,
  });
  const [enriched] = await enrichCatalogItems(workspaceId, [item]);

  return jsonOk({ item: enriched }, 201);
}
