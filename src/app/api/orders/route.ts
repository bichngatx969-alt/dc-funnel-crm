import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  calculateOrderTotals,
  generateOrderCode,
  normalizeNullableText,
  normalizeOrderStatus,
  normalizePaymentMethod,
  normalizePaymentStatus,
  normalizeOrderItems,
  orderInclude,
  parsePagination,
  statusTimestampUpdates,
  validateCustomerInWorkspace,
  validateOpportunityForOrder,
  validateOwnerInWorkspace,
} from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const customerId = searchParams.get("customerId")?.trim();
  const opportunityId = searchParams.get("opportunityId")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const status = normalizeOrderStatus(searchParams.get("status"));
  const paymentStatus = normalizePaymentStatus(searchParams.get("paymentStatus"));

  const where: Prisma.OrderWhereInput = {
    workspaceId,
    deletedAt: null,
  };
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (customerId) where.customerId = customerId;
  if (opportunityId) where.opportunityId = opportunityId;
  if (ownerId) where.ownerId = ownerId === "unassigned" ? null : ownerId;
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

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
  const customerId = String(body.customerId ?? "").trim();
  if (!customerId) return jsonError("Thiếu customerId");

  const customer = await validateCustomerInWorkspace(customerId, workspaceId);
  if (!customer) return jsonError("Không tìm thấy contact trong workspace hiện tại", 404);

  const opportunityId = normalizeNullableText(body.opportunityId);
  if (opportunityId) {
    const opportunity = await validateOpportunityForOrder(opportunityId, workspaceId, customerId);
    if (!opportunity) return jsonError("Opportunity không thuộc workspace/contact hiện tại", 400);
  }

  const ownerId = body.ownerId === undefined ? user.id : normalizeNullableText(body.ownerId);
  if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
    return jsonError("Owner không thuộc workspace hiện tại", 400);
  }

  let items;
  try {
    items = await normalizeOrderItems(body.items, workspaceId);
  } catch (error) {
    return jsonError(orderItemErrorMessage(error));
  }

  const status = normalizeOrderStatus(body.status) ?? "DRAFT";
  const paymentStatus = normalizePaymentStatus(body.paymentStatus) ?? "UNPAID";
  const paymentMethod = body.paymentMethod === undefined ? null : normalizePaymentMethod(body.paymentMethod);
  if (body.paymentMethod !== undefined && body.paymentMethod !== null && !paymentMethod) {
    return jsonError("paymentMethod không hợp lệ");
  }

  const totals = calculateOrderTotals(items, body);
  const code = normalizeNullableText(body.code) ?? (await generateOrderCode(workspaceId));

  const order = await prisma.$transaction(
    async (tx) => {
      const created = await tx.order.create({
        data: {
          workspace: { connect: { id: workspaceId } },
          customer: { connect: { id: customerId } },
          ...(opportunityId ? { opportunity: { connect: { id: opportunityId } } } : {}),
          ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
          code,
          status,
          paymentStatus,
          paymentMethod,
          ...totals,
          note: normalizeNullableText(body.note),
          shippingName: normalizeNullableText(body.shippingName) ?? customer.name,
          shippingPhone: normalizeNullableText(body.shippingPhone) ?? customer.phone,
          shippingAddress: normalizeNullableText(body.shippingAddress),
          ...statusTimestampUpdates(status),
          items: {
            create: items.map((item) => ({
              product: item.productId ? { connect: { id: item.productId } } : undefined,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPriceVnd: item.unitPriceVnd,
              discountVnd: item.discountVnd,
              lineTotalVnd: item.lineTotalVnd,
            })),
          },
        },
        include: orderInclude,
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { lastActivityAt: created.createdAt },
      });

      if (opportunityId) {
        await tx.opportunity.update({
          where: { id: opportunityId },
          data: { lastActivityAt: created.createdAt },
        });
      }

      return created;
    },
    { timeout: 15000 }
  );

  return jsonOk({ order }, 201);
}

function orderItemErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "ORDER_ITEMS_REQUIRED") return "Cần ít nhất một sản phẩm trong đơn";
  if (message === "PRODUCT_NOT_FOUND") return "Sản phẩm không thuộc workspace hiện tại";
  if (message === "PRODUCT_INACTIVE") return "Sản phẩm đã tắt";
  if (message === "ORDER_ITEM_NAME_REQUIRED") return "Mỗi dòng sản phẩm cần có tên";
  return "Dữ liệu sản phẩm trong đơn không hợp lệ";
}
