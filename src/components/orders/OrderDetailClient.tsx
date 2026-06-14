"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { formatVnd } from "@/components/money";
import { EmptyState } from "@/components/EmptyState";
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_CLASS,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_OPTIONS,
  fmtDate,
  type Order,
} from "@/components/orders/types";

export function OrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ order: Order }>(`/api/orders/${id}`);
      setOrder(data.order);
      setStatus(data.order.status);
      setPaymentStatus(data.order.paymentStatus);
      setPaymentMethod(data.order.paymentMethod ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được đơn hàng");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function saveStatus() {
    setSavingStatus(true);
    setNotice(null);
    try {
      const res = await apiSend<{ order: Order }>(`/api/orders/${id}/status`, "PATCH", {
        status,
        paymentStatus,
        paymentMethod: paymentMethod || null,
      });
      setOrder(res.order);
      setNotice("Đã cập nhật trạng thái đơn");
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "Không cập nhật được trạng thái");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl border bg-white" />
        <div className="h-64 animate-pulse rounded-xl border bg-white" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        title="Không tải được đơn hàng"
        description={error ?? undefined}
        action={
          <div className="flex gap-2">
            <button onClick={load} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Thử lại
            </button>
            <Link href="/orders" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Về danh sách
            </Link>
          </div>
        }
      />
    );
  }

  const o = order;
  const remaining = Math.max(0, o.totalVnd - o.depositVnd);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-800">
          ‹ Danh sách đơn
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{o.code}</span>
            <Badge cls={ORDER_STATUS_CLASS[o.status]} label={ORDER_STATUS_LABEL[o.status] ?? o.status} />
            <Badge cls={PAYMENT_STATUS_CLASS[o.paymentStatus]} label={PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus} />
          </div>
          <span className="text-xs text-gray-400">Tạo {fmtDate(o.createdAt)}</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <span className="w-20 shrink-0 text-gray-400">Khách</span>
            {o.customer ? (
              <Link href={`/contacts/${o.customer.id}`} className="text-brand hover:underline">
                {o.customer.name || o.customer.phone || "Khách"}
              </Link>
            ) : (
              <span className="text-gray-800">{o.shippingName || "—"}</span>
            )}
          </div>
          <Info label="SĐT" value={o.customer?.phone ?? o.shippingPhone} />
          {o.opportunity && (
            <div className="flex gap-2">
              <span className="w-20 shrink-0 text-gray-400">Cơ hội</span>
              <Link href="/pipeline" className="text-brand hover:underline">
                {o.opportunity.title}
              </Link>
            </div>
          )}
          <Info label="Phụ trách" value={o.owner?.name ?? o.owner?.email ?? null} />
        </div>
      </div>

      {/* Dòng hàng */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-2 text-sm font-semibold">Dòng hàng</div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Sản phẩm</th>
              <th className="px-2 py-2 text-center font-medium">SL</th>
              <th className="px-2 py-2 text-right font-medium">Đơn giá</th>
              <th className="px-2 py-2 text-right font-medium">Giảm</th>
              <th className="px-4 py-2 text-right font-medium">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{it.name}</div>
                  {it.sku && <div className="text-xs text-gray-400">{it.sku}</div>}
                </td>
                <td className="px-2 py-2 text-center text-gray-700">{it.quantity}</td>
                <td className="px-2 py-2 text-right text-gray-700">{formatVnd(it.unitPriceVnd)}</td>
                <td className="px-2 py-2 text-right text-gray-500">{it.discountVnd ? `- ${formatVnd(it.discountVnd)}` : "—"}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatVnd(it.lineTotalVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-0.5 border-t px-4 py-3 text-sm">
          <Row label="Tạm tính" value={formatVnd(o.subtotalVnd)} />
          <Row label="Giảm giá" value={`- ${formatVnd(o.discountVnd)}`} />
          <Row label="Phí ship" value={`+ ${formatVnd(o.shippingFeeVnd)}`} />
          <Row label="Tổng tiền" value={formatVnd(o.totalVnd)} strong />
          {o.depositVnd > 0 && (
            <>
              <Row label="Đã cọc" value={`- ${formatVnd(o.depositVnd)}`} />
              <Row label="Còn lại" value={formatVnd(remaining)} />
            </>
          )}
        </div>
      </div>

      {/* Giao hàng + ghi chú */}
      {(o.shippingName || o.shippingPhone || o.shippingAddress || o.note) && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="mb-2 font-semibold">Giao hàng & ghi chú</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Info label="Người nhận" value={o.shippingName} />
            <Info label="SĐT" value={o.shippingPhone} />
            <Info label="Địa chỉ" value={o.shippingAddress} />
            <Info label="Thanh toán" value={o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod : null} />
          </div>
          {o.note && <p className="mt-2 whitespace-pre-wrap text-gray-700">{o.note}</p>}
        </div>
      )}

      {/* Cập nhật trạng thái */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">Cập nhật trạng thái</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Trạng thái đơn" value={status} onChange={setStatus} options={ORDER_STATUS_OPTIONS} />
          <Select label="Tình trạng trả" value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_STATUS_OPTIONS} />
          <Select
            label="Thanh toán"
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[{ value: "", label: "— Chọn —" }, ...PAYMENT_METHOD_OPTIONS]}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={saveStatus}
            disabled={savingStatus}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {savingStatus ? "Đang lưu…" : "Cập nhật"}
          </button>
          {notice && <span className="text-xs text-gray-500">{notice}</span>}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Chỉnh dòng hàng sau khi tạo đơn sẽ hỗ trợ ở phiên bản sau. Cần sửa sản phẩm trong đơn, hãy tạo đơn mới.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-gray-800">{value || "—"}</span>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "text-base font-bold text-brand-dark" : "text-gray-800"}>{value}</span>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ cls, label }: { cls?: string; label: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cls ?? "bg-gray-100 text-gray-700"}`}>{label}</span>;
}
