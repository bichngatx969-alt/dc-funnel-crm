// Format tiền VND (integer đồng) theo locale vi-VN. Dùng chung cho Pipeline/Order/Dashboard.
export function formatVnd(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}
