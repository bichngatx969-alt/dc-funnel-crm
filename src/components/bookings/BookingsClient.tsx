"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { formatVnd } from "@/components/money";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type Pagination = { page: number; pageSize: number; total: number; pageCount: number };
type ContactOption = { id: string; name: string | null; phone: string | null; psid?: string | null };
type ServiceItem = { id: string; name: string; basePriceVnd: number; status: string };
type ServiceVariation = {
  id: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string | null;
  bookingEnabled: boolean;
};

type Booking = {
  id: string;
  customerId: string | null;
  catalogItemId: string;
  serviceVariationId: string | null;
  staffId: string | null;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  location: string | null;
  depositVnd: number;
  note: string | null;
  createdAt: string;
  customer?: { id: string; name: string | null; phone: string | null; email: string | null; currentStage?: string | null } | null;
  catalogItem?: { id: string; name: string; type: string; basePriceVnd: number; status: string } | null;
  serviceVariation?: ServiceVariation | null;
  staff?: { id: string; name: string | null; email: string } | null;
  order?: { id: string; code: string; status: string; totalVnd: number } | null;
};

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã huỷ" },
  { value: "NO_SHOW", label: "Không đến" },
];

const STATUS_LABEL: Record<BookingStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.value, item.label])
) as Record<BookingStatus, string>;

const STATUS_CLASS: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  NO_SHOW: "bg-slate-200 text-slate-600",
};

const inputCls = "w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none";

function defaultStartValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocal(d.toISOString());
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function customerLabel(c?: Booking["customer"] | ContactOption | null) {
  if (!c) return "Khách lẻ";
  return c.name || c.phone || ("psid" in c && c.psid ? `Khách ${String(c.psid).slice(-6)}` : "Khách");
}

export function BookingsClient() {
  const [items, setItems] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [variations, setVariations] = useState<ServiceVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [status, setStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [page, setPage] = useState(1);
  const [formServiceId, setFormServiceId] = useState("");
  const [formVariationId, setFormVariationId] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [startAt, setStartAt] = useState(defaultStartValue);
  const [endAt, setEndAt] = useState("");
  const [depositVnd, setDepositVnd] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (serviceId) params.set("catalogItemId", serviceId);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<{ items: Booking[]; pagination: Pagination }>(`/api/bookings?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được lịch booking");
    } finally {
      setLoading(false);
    }
  }, [status, serviceId, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [svc, ct] = await Promise.all([
          apiGet<{ items: ServiceItem[] }>("/api/catalog/items?type=BOOKABLE_SERVICE&status=ACTIVE&pageSize=100"),
          apiGet<{ items: ContactOption[] }>("/api/contacts?pageSize=100"),
        ]);
        if (cancelled) return;
        setServices(svc.items ?? []);
        setContacts(ct.items ?? []);
      } catch {
        if (!cancelled) {
          setServices([]);
          setContacts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!formServiceId) {
      setVariations([]);
      setFormVariationId("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ items: ServiceVariation[] }>(
          `/api/catalog/items/${formServiceId}/service-variations?pageSize=100`
        );
        if (!cancelled) {
          setVariations(data.items ?? []);
          setFormVariationId((current) => (data.items?.some((v) => v.id === current) ? current : ""));
        }
      } catch {
        if (!cancelled) setVariations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formServiceId]);

  const todayCount = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      const d = new Date(item.startAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
  }, [items]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!formServiceId) {
      setError("Vui lòng chọn dịch vụ");
      return;
    }
    if (!startAt) {
      setError("Vui lòng chọn giờ bắt đầu");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      await apiSend<{ booking: Booking }>("/api/bookings", "POST", {
        catalogItemId: formServiceId,
        serviceVariationId: formVariationId || undefined,
        customerId: formCustomerId || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        depositVnd: Number(depositVnd) || 0,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
      setShowCreate(false);
      setFormServiceId("");
      setFormVariationId("");
      setFormCustomerId("");
      setStartAt(defaultStartValue());
      setEndAt("");
      setDepositVnd("");
      setLocation("");
      setNote("");
      setNotice("Đã tạo booking.");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được booking");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, nextStatus: BookingStatus) {
    setNotice(null);
    setError(null);
    try {
      const res = await apiSend<{ booking: Booking }>(`/api/bookings/${id}/status`, "PATCH", {
        status: nextStatus,
      });
      setItems((prev) => prev.map((item) => (item.id === id ? res.booking : item)));
      setNotice("Đã cập nhật trạng thái booking.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được booking");
    }
  }

  const hasFilter = Boolean(status || serviceId);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Booking đang hiển thị" value={items.length} hint={pagination ? `${pagination.total} lịch trong bộ lọc` : "Đang tải dữ liệu"} />
        <SummaryCard label="Hôm nay" value={todayCount} hint="Tính theo trình duyệt hiện tại" />
        <SummaryCard label="Dịch vụ bookable" value={services.length} hint="Catalog item đang ACTIVE" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setPage(1);
          }}
          className="min-w-[180px] rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Mọi dịch vụ</option>
          {services.map((svc) => (
            <option key={svc.id} value={svc.id}>
              {svc.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Tạo booking
        </button>
        <button type="button" onClick={() => void load()} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
          Làm mới
        </button>
      </div>

      {(error || notice) && (
        <div className={`rounded border px-3 py-2 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error ?? notice}
        </div>
      )}

      {showCreate && (
        <form onSubmit={submit} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Tạo booking nhanh</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
              ✕
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Dịch vụ *">
              <select value={formServiceId} onChange={(e) => setFormServiceId(e.target.value)} className={inputCls}>
                <option value="">— Chọn dịch vụ —</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Biến thể">
              <select value={formVariationId} onChange={(e) => setFormVariationId(e.target.value)} disabled={!variations.length} className={inputCls}>
                <option value="">Theo cấu hình mặc định</option>
                {variations.map((variation) => (
                  <option key={variation.id} value={variation.id}>
                    {variation.name} · {variation.durationMinutes}p · {formatVnd(variation.priceVnd)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Khách hàng">
              <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className={inputCls}>
                <option value="">Khách lẻ / chưa gắn contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {customerLabel(c)}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bắt đầu *">
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Kết thúc">
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Đặt cọc VND">
              <input value={depositVnd} onChange={(e) => setDepositVnd(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="0" className={inputCls} />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Địa điểm">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Studio, salon, online..." className={inputCls} />
            </Field>
            <Field label="Ghi chú">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yêu cầu của khách, nguồn đặt lịch..." className={inputCls} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={creating || !formServiceId || !startAt} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {creating ? "Đang tạo..." : "Lưu booking"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📅"
          title={hasFilter ? "Không có booking phù hợp" : "Chưa có lịch booking"}
          description={hasFilter ? "Thử đổi bộ lọc hoặc làm mới danh sách." : "Khi dịch vụ đã bật booking, sale có thể tạo lịch hẹn tại đây."}
          action={
            <button type="button" onClick={() => setShowCreate(true)} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
              + Tạo booking
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Thời gian</th>
                  <th className="px-3 py-2 font-medium">Dịch vụ</th>
                  <th className="px-3 py-2 font-medium">Khách</th>
                  <th className="px-3 py-2 font-medium">Đặt cọc</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-3 py-2 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {items.map((booking) => (
                  <tr key={booking.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{formatDateTime(booking.startAt)}</div>
                      <div className="text-xs text-gray-400">đến {formatDateTime(booking.endAt)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{booking.catalogItem?.name ?? "Dịch vụ"}</div>
                      <div className="text-xs text-gray-500">{booking.serviceVariation?.name ?? booking.location ?? "Mặc định"}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{customerLabel(booking.customer)}</td>
                    <td className="px-3 py-2 font-semibold text-brand-dark">{formatVnd(booking.depositVnd)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={booking.status}
                        onChange={(e) => void updateStatus(booking.id, e.target.value as BookingStatus)}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${STATUS_CLASS[booking.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-[260px] px-3 py-2 text-xs text-gray-500">
                      <div className="truncate">{booking.note || booking.order?.code || "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((booking) => (
              <div key={booking.id} className="rounded-xl border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">{formatDateTime(booking.startAt)}</div>
                    <div className="text-xs text-gray-400">đến {formatDateTime(booking.endAt)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[booking.status]}`}>
                    {STATUS_LABEL[booking.status]}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-800">{booking.catalogItem?.name ?? "Dịch vụ"}</div>
                <div className="text-xs text-gray-500">{customerLabel(booking.customer)}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>{booking.serviceVariation?.name ?? booking.location ?? "Mặc định"}</span>
                  <span className="font-semibold text-brand-dark">{formatVnd(booking.depositVnd)}</span>
                </div>
                <select
                  value={booking.status}
                  onChange={(e) => void updateStatus(booking.id, e.target.value as BookingStatus)}
                  className="mt-2 w-full rounded border px-2 py-1.5 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.pageCount} · {pagination.total} booking
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
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}
