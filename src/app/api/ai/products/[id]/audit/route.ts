import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { auditProductService } from "@/lib/ai/product-audit";
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
  if (!product) return jsonError("Không tìm thấy sản phẩm", 404);

  return jsonOk({
    product,
    audit: product.aiAuditJson ?? null,
    aiAuditScore: product.aiAuditScore,
    aiAuditedAt: product.aiAuditedAt,
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
    product: result.product,
    audit: result.audit,
    error: result.error,
  });
}
