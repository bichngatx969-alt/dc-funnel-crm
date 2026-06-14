// Kiểu & nhãn UI-local cho Order Lite, theo API contract mục 16.4 (Codex sở hữu shape backend).

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PAID"
  | "FULFILLING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
export type PaymentMethod = "COD" | "BANK_TRANSFER" | "CASH" | "OTHER";

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "DRAFT", label: "Nháp" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FULFILLING", label: "Đang chuẩn bị" },
  { value: "SHIPPED", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã huỷ" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "UNPAID", label: "Chưa trả" },
  { value: "PARTIAL", label: "Trả một phần" },
  { value: "PAID", label: "Đã trả" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "OTHER", label: "Khác" },
];

export const ORDER_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  ORDER_STATUS_OPTIONS.map((o) => [o.value, o.label])
);
export const PAYMENT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_STATUS_OPTIONS.map((o) => [o.value, o.label])
);
export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])
);

export const ORDER_STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-sky-100 text-sky-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FULFILLING: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-600 text-white",
  CANCELLED: "bg-rose-100 text-rose-700",
  REFUNDED: "bg-slate-200 text-slate-600",
};
export const PAYMENT_STATUS_CLASS: Record<string, string> = {
  UNPAID: "bg-rose-100 text-rose-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-slate-200 text-slate-600",
};

export type OrderCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  currentStage?: string;
  tags?: string[];
} | null;
export type OrderOpportunity = { id: string; title: string; status: string; valueVnd: number } | null;
export type OrderOwner = { id: string; name: string | null; email: string } | null;

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  description: string | null;
  isActive: boolean;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unitPriceVnd: number;
  discountVnd: number;
  lineTotalVnd: number;
  product?: Product | null;
};

export type Order = {
  id: string;
  code: string;
  customerId: string;
  opportunityId: string | null;
  ownerId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  subtotalVnd: number;
  discountVnd: number;
  shippingFeeVnd: number;
  depositVnd: number;
  totalVnd: number;
  note: string | null;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  customer: OrderCustomer;
  opportunity: OrderOpportunity;
  owner: OrderOwner;
  items: OrderItem[];
};

export type Pagination = { page: number; pageSize: number; total: number; pageCount: number };

export function orderCustomerName(o: { customer?: OrderCustomer; shippingName?: string | null }): string {
  return o.customer?.name || o.customer?.phone || o.shippingName || "Khách";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Preview tiền phía client (API mới là nguồn chân lý). Theo công thức contract 16.4.
export function previewLineTotal(quantity: number, unitPriceVnd: number, discountVnd: number): number {
  return Math.max(0, Math.round(quantity) * Math.round(unitPriceVnd) - Math.round(discountVnd));
}
