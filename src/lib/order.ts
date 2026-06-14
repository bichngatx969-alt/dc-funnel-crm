import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["COD", "BANK_TRANSFER", "CASH", "OTHER"] as const;

export type NormalizedOrderItem = {
  productId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unitPriceVnd: number;
  discountVnd: number;
  lineTotalVnd: number;
};

export type OrderTotals = {
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeVnd: number;
  depositVnd: number;
  totalVnd: number;
};

export const productSelect = {
  id: true,
  workspaceId: true,
  name: true,
  sku: true,
  priceVnd: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ProductLiteSelect;

export const orderInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true, currentStage: true, tags: true } },
  opportunity: { select: { id: true, title: true, status: true, valueVnd: true } },
  owner: { select: { id: true, name: true, email: true } },
  items: { orderBy: { createdAt: "asc" }, include: { product: { select: productSelect } } },
} satisfies Prisma.OrderInclude;

export function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

export function parseVnd(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

export function parsePositiveInteger(value: unknown, fallback = 1): number {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount)) return fallback;
  return Math.max(1, Math.round(amount));
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parsePositiveInteger(searchParams.get("page"), 1));
  const pageSize = Math.min(100, Math.max(1, parsePositiveInteger(searchParams.get("pageSize") ?? searchParams.get("limit"), 25)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function normalizeOrderStatus(value: unknown): OrderStatus | null {
  const normalized = normalizeText(value).toUpperCase();
  return ORDER_STATUSES.includes(normalized as OrderStatus) ? (normalized as OrderStatus) : null;
}

export function normalizePaymentStatus(value: unknown): PaymentStatus | null {
  const normalized = normalizeText(value).toUpperCase();
  return PAYMENT_STATUSES.includes(normalized as PaymentStatus) ? (normalized as PaymentStatus) : null;
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const normalized = normalizeText(value).toUpperCase();
  return PAYMENT_METHODS.includes(normalized as PaymentMethod) ? (normalized as PaymentMethod) : null;
}

export function calculateOrderTotals(items: NormalizedOrderItem[], input: {
  discountVnd?: unknown;
  shippingFeeVnd?: unknown;
  depositVnd?: unknown;
}): OrderTotals {
  const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
  const discountVnd = parseVnd(input.discountVnd);
  const shippingFeeVnd = parseVnd(input.shippingFeeVnd);
  const depositVnd = parseVnd(input.depositVnd);
  const totalVnd = Math.max(0, subtotalVnd - discountVnd + shippingFeeVnd);
  return { subtotalVnd, discountVnd, shippingFeeVnd, depositVnd, totalVnd };
}

export async function normalizeOrderItems(rawItems: unknown, workspaceId: string): Promise<NormalizedOrderItem[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("ORDER_ITEMS_REQUIRED");
  }

  const productIds = Array.from(
    new Set(
      rawItems
        .map((item) => normalizeNullableText((item as { productId?: unknown })?.productId))
        .filter((id): id is string => Boolean(id))
    )
  );
  const products = productIds.length
    ? await prisma.productLite.findMany({
        where: { id: { in: productIds }, workspaceId, deletedAt: null },
        select: { id: true, name: true, sku: true, priceVnd: true, isActive: true },
      })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  return rawItems.map((raw) => {
    const item = raw as Record<string, unknown>;
    const productId = normalizeNullableText(item.productId);
    const product = productId ? productById.get(productId) : null;
    if (productId && !product) throw new Error("PRODUCT_NOT_FOUND");
    if (product && !product.isActive) throw new Error("PRODUCT_INACTIVE");

    const name = normalizeNullableText(item.name) ?? product?.name;
    if (!name) throw new Error("ORDER_ITEM_NAME_REQUIRED");

    const quantity = parsePositiveInteger(item.quantity, 1);
    const unitPriceVnd = item.unitPriceVnd === undefined ? parseVnd(product?.priceVnd) : parseVnd(item.unitPriceVnd);
    const discountVnd = parseVnd(item.discountVnd);
    const lineTotalVnd = Math.max(0, quantity * unitPriceVnd - discountVnd);

    return {
      productId: product?.id ?? null,
      name,
      sku: normalizeNullableText(item.sku) ?? product?.sku ?? null,
      quantity,
      unitPriceVnd,
      discountVnd,
      lineTotalVnd,
    };
  });
}

export async function validateCustomerInWorkspace(customerId: string, workspaceId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, workspaceId, deletedAt: null },
    select: { id: true, name: true, phone: true, email: true },
  });
}

export async function validateOpportunityForOrder(
  opportunityId: string | null,
  workspaceId: string,
  customerId: string
) {
  if (!opportunityId) return null;
  return prisma.opportunity.findFirst({
    where: { id: opportunityId, workspaceId, customerId, deletedAt: null },
    select: { id: true, customerId: true, title: true, status: true },
  });
}

export async function validateOwnerInWorkspace(ownerId: string | null, workspaceId: string): Promise<boolean> {
  if (!ownerId) return true;
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: ownerId, workspaceId, workspace: { deletedAt: null } },
    select: { id: true },
  });
  return Boolean(member);
}

export async function generateOrderCode(workspaceId: string): Promise<string> {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `ORD-${ymd}-${suffix}`;
    const existing = await prisma.order.findUnique({
      where: { workspaceId_code: { workspaceId, code } },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `ORD-${ymd}-${Date.now().toString(36).toUpperCase()}`;
}

export function statusTimestampUpdates(status: OrderStatus): {
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
} {
  const now = new Date();
  if (["CONFIRMED", "PAID", "FULFILLING", "SHIPPED", "COMPLETED"].includes(status)) {
    return { confirmedAt: now, ...(status === "COMPLETED" ? { completedAt: now } : {}) };
  }
  if (status === "CANCELLED" || status === "REFUNDED") {
    return { cancelledAt: now };
  }
  if (status === "DRAFT") {
    return { confirmedAt: null, completedAt: null, cancelledAt: null };
  }
  return {};
}
