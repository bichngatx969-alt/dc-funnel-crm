"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/client";
import { formatVnd } from "@/components/money";
import { EmptyState } from "@/components/EmptyState";
import { OrderFormModal } from "@/components/orders/OrderFormModal";
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_CLASS,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_OPTIONS,
  fmtDate,
  orderCustomerName,
  type Order,
  type Pagination,
} from "@/components/orders/types";

type ListPayload = { items: Order[]; pagination: Pagination };

export function OrdersClient() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<ListPayload>(`/api/orders?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách đơn");
    } finally {
      setLoading(false);
    }
  }, [q, status, paymentStatus, page]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  // Quick action từ topbar: /orders?new=1 -> mở modal tạo đơn.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setShowCreate(true);
    }
  }, []);

  const hasFilter = Boolean(q.trim() || status || paymentStatus);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm mã đơn / khách…"
          className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Mọi thanh toán</option>
          {PAYMENT_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button onClick={() => setShowCreate(true)} className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + Tạo đơn
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={load} className="shrink-0 rounded border border-rose-300 px-2 py-1 text-xs hover:bg-rose-100">
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        hasFilter ? (
          <EmptyState
            title="Không tìm thấy đơn phù hợp"
            description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
            action={
              <button
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setPaymentStatus("");
                  setPage(1);
                }}
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Xoá bộ lọc
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="🧾"
            title="Chưa có đơn hàng"
            description="Khi khách chốt trong hội thoại, hãy bấm “Tạo đơn” để lên đơn nhanh."
            action={
              <button onClick={() => setShowCreate(true)} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                + Tạo đơn
              </button>
            }
          />
        )
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Mã đơn</th>
                  <th className="px-3 py-2 font-medium">Khách</th>
                  <th className="px-3 py-2 font-medium">Tổng tiền</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-3 py-2 font-medium">Thanh toán</th>
                  <th className="px-3 py-2 font-medium">Ngày tạo</th>
                  <th className="px-3 py-2 font-medium">Phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} onClick={() => router.push(`/orders/${o.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-gray-900">{o.code}</td>
                    <td className="px-3 py-2 text-gray-700">{orderCustomerName(o)}</td>
                    <td className="px-3 py-2 font-semibold text-brand-dark">{formatVnd(o.totalVnd)}</td>
                    <td className="px-3 py-2">
                      <Badge cls={ORDER_STATUS_CLASS[o.status]} label={ORDER_STATUS_LABEL[o.status] ?? o.status} />
                    </td>
                    <td className="px-3 py-2">
                      <Badge cls={PAYMENT_STATUS_CLASS[o.paymentStatus]} label={PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-gray-600">{o.owner?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((o) => (
              <button key={o.id} onClick={() => router.push(`/orders/${o.id}`)} className="block w-full rounded-xl border bg-white p-3 text-left hover:bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-gray-700">{o.code}</span>
                  <span className="font-semibold text-brand-dark">{formatVnd(o.totalVnd)}</span>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-gray-900">{orderCustomerName(o)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge cls={ORDER_STATUS_CLASS[o.status]} label={ORDER_STATUS_LABEL[o.status] ?? o.status} />
                  <Badge cls={PAYMENT_STATUS_CLASS[o.paymentStatus]} label={PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus} />
                  <span className="text-[11px] text-gray-400">{fmtDate(o.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.pageCount} · {pagination.total} đơn
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1.5 disabled:opacity-50">
                  Trước
                </button>
                <button disabled={page >= pagination.pageCount} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1.5 disabled:opacity-50">
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <OrderFormModal
          onClose={() => setShowCreate(false)}
          onCreated={(order) => {
            setShowCreate(false);
            router.push(`/orders/${order.id}`);
          }}
        />
      )}
    </div>
  );
}

function Badge({ cls, label }: { cls?: string; label: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cls ?? "bg-gray-100 text-gray-700"}`}>{label}</span>;
}
