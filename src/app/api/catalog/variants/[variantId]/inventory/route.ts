import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogVariantSelect,
  enrichVariants,
  inventoryMovementSelect,
} from "@/lib/catalog-variants";
import { parsePagination } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { variantId } = await params;

  const variant = await prisma.catalogVariant.findFirst({
    where: { id: variantId, workspaceId, deletedAt: null },
    select: catalogVariantSelect,
  });
  if (!variant) return jsonError("Không tìm thấy biến thể", 404);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const { page, pageSize, skip } = parsePagination(searchParams);
  const where: Prisma.InventoryMovementWhereInput = { workspaceId, variantId };
  if (type) where.type = type.trim().toUpperCase();

  const [rawVariant, movements, total] = await prisma.$transaction([
    prisma.catalogVariant.findFirst({ where: { id: variant.id, workspaceId }, select: catalogVariantSelect }),
    prisma.inventoryMovement.findMany({
      where,
      select: inventoryMovementSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
  const [enriched] = await enrichVariants(workspaceId, rawVariant ? [rawVariant] : [variant]);

  return jsonOk({
    variant: enriched,
    movements,
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}
