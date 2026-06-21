import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogVariantSelect,
  enrichVariants,
  inventoryMovementSelect,
  normalizeInventoryMovementType,
  parseInventoryDelta,
} from "@/lib/catalog-variants";
import { normalizeNullableText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ variantId: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { variantId } = await params;

  const body = await req.json().catch(() => ({}));
  const quantity = parseInventoryDelta(body.quantity);
  if (quantity === 0) return jsonError("Số lượng điều chỉnh phải khác 0");

  const existing = await prisma.catalogVariant.findFirst({
    where: { id: variantId, workspaceId, deletedAt: null },
    select: catalogVariantSelect,
  });
  if (!existing) return jsonError("Không tìm thấy biến thể", 404);

  const nextQuantity = existing.inventoryQuantity + quantity;
  if (existing.inventoryTracked && nextQuantity < 0) {
    return jsonError("Tồn kho không được âm", 400);
  }

  const type = normalizeInventoryMovementType(body.type);
  const [variant, movement] = await prisma.$transaction([
    prisma.catalogVariant.update({
      where: { id: existing.id },
      data: { inventoryQuantity: nextQuantity },
      select: catalogVariantSelect,
    }),
    prisma.inventoryMovement.create({
      data: {
        workspaceId,
        variantId: existing.id,
        type,
        quantity,
        reason: normalizeNullableText(body.reason),
        sourceType: normalizeNullableText(body.sourceType),
        sourceId: normalizeNullableText(body.sourceId),
        note: normalizeNullableText(body.note),
        createdById: user.id,
      },
      select: inventoryMovementSelect,
    }),
  ]);
  const [enriched] = await enrichVariants(workspaceId, [variant]);

  return jsonOk({ variant: enriched, movement }, 201);
}
