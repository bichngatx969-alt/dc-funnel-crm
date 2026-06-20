import { ProfileBlock, BlockEmpty, BlockCta } from "./ProfileBlock";
import { Chip, SkeletonBar } from "../primitives";
import { formatVnd } from "@/components/money";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL, fmtDate, type Order } from "@/components/orders/types";

const COUNTED_OUT = new Set(["CANCELLED", "REFUNDED"]);

export function PurchaseHistoryBlock({
  orders,
  onCreateOrder,
}: {
  orders: Order[] | null;
  onCreateOrder: () => void;
}) {
  if (orders === null) {
    return (
      <ProfileBlock id="block-orders" title="Lịch sử mua hàng" icon="cart">
        <SkeletonBar className="h-16 w-full rounded-xl" />
      </ProfileBlock>
    );
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalSpend = sorted
    .filter((o) => !COUNTED_OUT.has(o.status))
    .reduce((sum, o) => sum + (o.totalVnd ?? 0), 0);
  const latest = sorted[0];

  // Sản phẩm mua gần đây (gộp từ vài đơn mới nhất, không trùng tên).
  const recentProducts: string[] = [];
  for (const o of sorted.slice(0, 3)) {
    for (const it of o.items ?? []) {
      if (it.name && !recentProducts.includes(it.name)) recentProducts.push(it.name);
    }
  }

  return (
    <ProfileBlock
      id="block-orders"
      title="Lịch sử mua hàng"
      icon="cart"
      action={
        orders.length > 0 ? <BlockCta icon="plus" label="Tạo đơn" onClick={onCreateOrder} /> : undefined
      }
    >
      {orders.length === 0 ? (
        <BlockEmpty
          text="Khách chưa có đơn hàng."
          cta={<BlockCta icon="cart" label="Tạo đơn" onClick={onCreateOrder} />}
        />
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <div className="text-[15px] font-bold text-gray-800">{orders.length}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Tổng đơn</div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
              <div className="text-[15px] font-bold text-emerald-700">{formatVnd(totalSpend)}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Tổng chi tiêu</div>
            </div>
          </div>

          {latest && (
            <a
              href={`/orders/${latest.id}`}
              className="block rounded-xl border border-gray-100 bg-white px-3 py-2 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-gray-500">{latest.code}</span>
                <span className="text-[12.5px] font-bold text-brand-dark">{formatVnd(latest.totalVnd)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    ORDER_STATUS_CLASS[latest.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ORDER_STATUS_LABEL[latest.status] ?? latest.status}
                </span>
                <span className="text-[10.5px] text-gray-400">Đơn gần nhất · {fmtDate(latest.createdAt)}</span>
              </div>
            </a>
          )}

          {recentProducts.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] text-gray-400">Sản phẩm đã mua gần đây</div>
              <div className="flex flex-wrap gap-1">
                {recentProducts.slice(0, 6).map((p) => (
                  <Chip key={p}>{p}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProfileBlock>
  );
}
