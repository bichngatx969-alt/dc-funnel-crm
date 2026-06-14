import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  calculateOrderTotals,
  normalizeNullableText,
  normalizeOrderStatus,
  normalizePaymentMethod,
  normalizePaymentStatus,
  orderInclude,
  statusTimestampUpdates,
  validateCustomerInWorkspace,
  validateOpportunityForOrder,
  validateOwnerInWorkspace,
} from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: orderInclude,
  });
  if (!order) return jsonError("Không tìm thấy đơn hàng", 404);

  return jsonOk({ order });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.order.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: { items: true },
  });
  if (!existing) return jsonError("Không tìm thấy đơn hàng", 404);

  const body = await req.json().catch(() => ({}));
  if (body.items !== undefined) {
    return jsonError("Cập nhật dòng hàng sau khi tạo đơn chưa hỗ trợ trong PR #5 để tránh xóa cứng dữ liệu", 400);
  }

  const customerId = body.customerId === undefined ? existing.customerId : String(body.customerId ?? "").trim();
  if (!customerId) return jsonError("Thiếu customerId");
  const customer = await validateCustomerInWorkspace(customerId, workspaceId);
  if (!customer) return jsonError("Không tìm thấy contact trong workspace hiện tại", 404);

  const opportunityId =
    body.opportunityId === undefined ? existing.opportunityId : normalizeNullableText(body.opportunityId);
  if (opportunityId) {
    const opportunity = await validateOpportunityForOrder(opportunityId, workspaceId, customerId);
    if (!opportunity) return jsonError("Opportunity không thuộc workspace/contact hiện tại", 400);
  }

  const ownerId = body.ownerId === undefined ? existing.ownerId : normalizeNullableText(body.ownerId);
  if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
    return jsonError("Owner không thuộc workspace hiện tại", 400);
  }

  const status = body.status === undefined ? existing.status : normalizeOrderStatus(body.status);
  if (!status) return jsonError("Trạng thái đơn không hợp lệ");
  const paymentStatus =
    body.paymentStatus === undefined ? existing.paymentStatus : normalizePaymentStatus(body.paymentStatus);
  if (!paymentStatus) return jsonError("paymentStatus không hợp lệ");
  const paymentMethod =
    body.paymentMethod === undefined ? existing.paymentMethod : normalizePaymentMethod(body.paymentMethod);
  if (body.paymentMethod !== undefined && body.paymentMethod !== null && !paymentMethod) {
    return jsonError("paymentMethod không hợp lệ");
  }

  const normalizedItems = existing.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPriceVnd: item.unitPriceVnd,
    discountVnd: item.discountVnd,
    lineTotalVnd: item.lineTotalVnd,
  }));

  const totals = calculateOrderTotals(normalizedItems, {
    discountVnd: body.discountVnd === undefined ? existing.discountVnd : body.discountVnd,
    shippingFeeVnd: body.shippingFeeVnd === undefined ? existing.shippingFeeVnd : body.shippingFeeVnd,
    depositVnd: body.depositVnd === undefined ? existing.depositVnd : body.depositVnd,
  });

  const data: Prisma.OrderUncheckedUpdateInput = {
    customerId,
    opportunityId,
    ownerId,
    status,
    paymentStatus,
    paymentMethod,
    ...totals,
    ...statusTimestampUpdates(status),
  };
  if (body.code !== undefined) data.code = String(body.code ?? "").trim() || existing.code;
  if (body.note !== undefined) data.note = normalizeNullableText(body.note);
  if (body.shippingName !== undefined) data.shippingName = normalizeNullableText(body.shippingName);
  if (body.shippingPhone !== undefined) data.shippingPhone = normalizeNullableText(body.shippingPhone);
  if (body.shippingAddress !== undefined) data.shippingAddress = normalizeNullableText(body.shippingAddress);
  if (body.deleted !== undefined) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const order = await prisma.$transaction(
    async (tx) => {
      await tx.order.update({ where: { id }, data });
      await tx.customer.update({ where: { id: customerId }, data: { lastActivityAt: new Date() } });
      if (opportunityId) {
        await tx.opportunity.update({ where: { id: opportunityId }, data: { lastActivityAt: new Date() } });
      }

      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    },
    { timeout: 15000 }
  );

  return jsonOk({ order });
}
