import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  buildVariantData,
  catalogVariantSelect,
  enrichVariants,
  requirePhysicalCatalogItem,
  validateVariantImage,
} from "@/lib/catalog-variants";
import { parsePagination } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const lowStock = searchParams.get("lowStock");
  const { page, pageSize, skip } = parsePagination(searchParams);
  const where: Prisma.CatalogVariantWhereInput = { workspaceId, catalogItemId: id, deletedAt: null };
  if (status) where.status = status.trim().toUpperCase();

  const [rawVariants, total] = await prisma.$transaction([
    prisma.catalogVariant.findMany({
      where,
      select: catalogVariantSelect,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.catalogVariant.count({ where }),
  ]);
  const enriched = await enrichVariants(workspaceId, rawVariants);
  const items = lowStock === "true" ? enriched.filter((variant) => variant.lowStock) : enriched;

  const filteredTotal = lowStock === "true" ? items.length : total;
  return jsonOk({
    items,
    pagination: { page, pageSize, total: filteredTotal, pageCount: Math.ceil(filteredTotal / pageSize) },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const body = await req.json().catch(() => ({}));
  const image = await validateVariantImage(workspaceId, body.imageId);
  if (!image.ok) return jsonError(image.error, 400);

  const data = buildVariantData(workspaceId, id, body, {
    priceVnd: item.item.basePriceVnd,
    compareAtPriceVnd: item.item.compareAtPriceVnd,
    costVnd: item.item.costVnd,
  });
  const variant = await prisma.catalogVariant.create({
    data: { ...data, imageId: image.imageId },
    select: catalogVariantSelect,
  });
  const [enriched] = await enrichVariants(workspaceId, [variant]);

  return jsonOk({ variant: enriched }, 201);
}
