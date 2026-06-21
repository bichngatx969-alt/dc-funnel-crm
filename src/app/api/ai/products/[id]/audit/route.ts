import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { auditProductService } from "@/lib/ai/product-audit";
import { catalogItemSelect } from "@/lib/catalog";
import { productSelect } from "@/lib/order";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const product = await prisma.productLite.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: productSelect,
  });
  if (product) {
    return jsonOk({
      product,
      sourceType: "PRODUCT_LITE",
      audit: product.aiAuditJson ?? null,
      aiAuditScore: product.aiAuditScore,
      aiAuditedAt: product.aiAuditedAt,
    });
  }

  const catalogItem = await prisma.catalogItem.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: catalogItemSelect,
  });
  if (!catalogItem) return jsonError("Không tìm thấy sản phẩm", 404);

  return jsonOk({
    product: catalogItem,
    sourceType: "CATALOG_ITEM",
    audit: catalogItem.aiAuditJson ?? null,
    aiAuditScore: catalogItem.aiAuditScore,
    aiAuditedAt: catalogItem.aiAuditedAt,
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const result = await auditProductService({ workspaceId, productId: id });
  if (!result) return jsonError("Không tìm thấy sản phẩm", 404);

  return jsonOk({
    aiConfigured: result.aiConfigured,
    status: result.aiConfigured ? result.status : "AI_NOT_CONFIGURED",
    sourceType: result.sourceType,
    product: result.product,
    audit: result.audit,
    error: result.error,
  });
}
