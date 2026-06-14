import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { evaluateAutomationRules } from "@/lib/automation";
import {
  normalizeOrderStatus,
  normalizePaymentMethod,
  normalizePaymentStatus,
  orderInclude,
  statusTimestampUpdates,
} from "@/lib/order";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.order.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true, customerId: true, opportunityId: true, status: true, ownerId: true },
  });
  if (!existing) return jsonError("Không tìm thấy đơn hàng", 404);

  const body = await req.json().catch(() => ({}));
  const status = normalizeOrderStatus(body.status);
  if (!status) return jsonError("Trạng thái đơn không hợp lệ");
  const paymentStatus =
    body.paymentStatus === undefined ? undefined : normalizePaymentStatus(body.paymentStatus);
  if (body.paymentStatus !== undefined && !paymentStatus) return jsonError("paymentStatus không hợp lệ");
  const paymentMethod =
    body.paymentMethod === undefined ? undefined : normalizePaymentMethod(body.paymentMethod);
  if (body.paymentMethod !== undefined && body.paymentMethod !== null && !paymentMethod) {
    return jsonError("paymentMethod không hợp lệ");
  }

  const now = new Date();
  const order = await prisma.$transaction(
    async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(body.paymentMethod !== undefined ? { paymentMethod } : {}),
          ...statusTimestampUpdates(status),
        },
      });
      await tx.customer.update({ where: { id: existing.customerId }, data: { lastActivityAt: now } });
      if (existing.opportunityId) {
        await tx.opportunity.update({ where: { id: existing.opportunityId }, data: { lastActivityAt: now } });
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    },
    { timeout: 15000 }
  );

  await evaluateAutomationRules({
    workspaceId,
    triggerType: "ORDER_STATUS_CHANGED",
    sourceType: "ORDER",
    sourceId: order.id,
    payload: {
      orderId: order.id,
      customerId: order.customerId,
      opportunityId: order.opportunityId,
      ownerId: order.ownerId,
      previousStatus: existing.status,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalVnd: order.totalVnd,
    },
  }).catch((error) => console.error("ORDER_STATUS_CHANGED automation failed", error));

  return jsonOk({ order });
}
