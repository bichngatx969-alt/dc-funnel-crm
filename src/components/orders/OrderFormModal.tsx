"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { formatVnd } from "@/components/money";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  previewLineTotal,
  type Order,
  type Product,
} from "@/components/orders/types";

type ContactOption = { id: string; name: string | null; phone: string | null; psid?: string };
type OppOption = { id: string; title: string; valueVnd: number; status: string };
type ItemRow = {
  key: string;
  productId: string;
  name: string;
  unitPriceVnd: string;
  quantity: string;
  discountVnd: string;
};

function newRow(): ItemRow {
  return { key: crypto.randomUUID(), productId: "", name: "", unitPriceVnd: "", quantity: "1", discountVnd: "" };
}

const inputCls = "w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none";

// Modal tạo đơn nhanh (Order Lite). PR #5 không sửa dòng hàng sau khi tạo -> đây là nơi nhập đủ.
export function OrderFormModal({
  lockedCustomer,
  onClose,
  onCreated,
}: {
  lockedCustomer?: { id: string; name: string | null; phone: string | null } | null;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [opportunities, setOpportunities] = useState<OppOption[]>([]);

  const [customerId, setCustomerId] = useState(lockedCustomer?.id ?? "");
  const [opportunityId, setOpportunityId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([newRow()]);

  const [discountVnd, setDiscountVnd] = useState("");
  const [shippingFeeVnd, setShippingFeeVnd] = useState("");
  const [depositVnd, setDepositVnd] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [status, setStatus] = useState("DRAFT");
  const [shippingName, setShippingName] = useState(lockedCustomer?.name ?? "");
  const [shippingPhone, setShippingPhone] = useState(lockedCustomer?.phone ?? "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");

  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [qpName, setQpName] = useState("");
  const [qpPrice, setQpPrice] = useState("");
  const [qpBusy, setQpBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tải danh bạ (nếu chưa khoá khách) + sản phẩm.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, contactRes] = await Promise.all([
          apiGet<{ items: Product[] }>("/api/products?active=true&pageSize=100"),
          lockedCustomer ? Promise.resolve(null) : apiGet<{ items: ContactOption[] }>("/api/contacts?pageSize=100"),
        ]);
        if (cancelled) return;
        setProducts(prodRes.items ?? []);
        if (contactRes) setContacts(contactRes.items ?? []);
      } catch {
        /* để trống, form vẫn dùng nhập tay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lockedCustomer]);

  // Khi đổi khách: tải cơ hội của khách + prefill thông tin giao hàng.
  useEffect(() => {
    if (!customerId) {
      setOpportunities([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ items: OppOption[] }>(`/api/opportunities?customerId=${encodeURIComponent(customerId)}`);
        if (!cancelled) setOpportunities(res.items ?? []);
      } catch {
        if (!cancelled) setOpportunities([]);
      }
    })();
    const picked = contacts.find((c) => c.id === customerId);
    if (picked) {
      setShippingName((v) => v || picked.name || "");
      setShippingPhone((v) => v || picked.phone || "");
    }
    return () => {
      cancelled = true;
    };
  }, [customerId, contacts]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onPickProduct(key: string, productId: string) {
    if (!productId) {
      updateItem(key, { productId: "" });
      return;
    }
    const p = products.find((x) => x.id === productId);
    updateItem(key, {
      productId,
      name: p?.name ?? "",
      unitPriceVnd: p ? String(p.priceVnd) : "",
    });
  }

  async function createQuickProduct() {
    if (!qpName.trim()) return;
    setQpBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ product: Product }>("/api/products", "POST", {
        name: qpName.trim(),
        priceVnd: Number(qpPrice) || 0,
      });
      setProducts((list) => [res.product, ...list]);
      // Thêm 1 dòng hàng dùng sản phẩm vừa tạo.
      setItems((rows) => [
        ...rows,
        { key: crypto.randomUUID(), productId: res.product.id, name: res.product.name, unitPriceVnd: String(res.product.priceVnd), quantity: "1", discountVnd: "" },
      ]);
      setQpName("");
      setQpPrice("");
      setShowQuickProduct(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tạo được sản phẩm");
    } finally {
      setQpBusy(false);
    }
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, r) => sum + previewLineTotal(Number(r.quantity) || 0, Number(r.unitPriceVnd) || 0, Number(r.discountVnd) || 0),
      0
    );
    const discount = Number(discountVnd) || 0;
    const shipping = Number(shippingFeeVnd) || 0;
    const deposit = Number(depositVnd) || 0;
    const total = Math.max(0, subtotal - discount + shipping);
    return { subtotal, discount, shipping, deposit, total, remaining: Math.max(0, total - deposit) };
  }, [items, discountVnd, shippingFeeVnd, depositVnd]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Vui lòng chọn khách hàng");
      return;
    }
    const payloadItems = items
      .filter((r) => r.productId || r.name.trim())
      .map((r) => ({
        productId: r.productId || undefined,
        name: r.name.trim() || undefined,
        quantity: Number(r.quantity) || 1,
        unitPriceVnd: Number(r.unitPriceVnd) || 0,
        discountVnd: Number(r.discountVnd) || 0,
      }));
    if (payloadItems.length === 0) {
      setError("Cần ít nhất một dòng sản phẩm (chọn sản phẩm hoặc nhập tên)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiSend<{ order: Order }>("/api/orders", "POST", {
        customerId,
        opportunityId: opportunityId || undefined,
        status,
        paymentStatus,
        paymentMethod: paymentMethod || undefined,
        items: payloadItems,
        discountVnd: Number(discountVnd) || 0,
        shippingFeeVnd: Number(shippingFeeVnd) || 0,
        depositVnd: Number(depositVnd) || 0,
        note: note.trim() || undefined,
        shippingName: shippingName.trim() || undefined,
        shippingPhone: shippingPhone.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
      });
      onCreated(res.order);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tạo được đơn");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">Tạo đơn</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Khách + cơ hội */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">Khách hàng *</span>
              {lockedCustomer ? (
                <input
                  value={lockedCustomer.name || lockedCustomer.phone || "Khách"}
                  disabled
                  className="w-full rounded border bg-gray-50 px-2 py-2 text-sm text-gray-600"
                />
              ) : (
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                  <option value="">— Chọn khách —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || `Khách ${c.psid?.slice(-6) ?? ""}`}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">Cơ hội (tuỳ chọn)</span>
              <select
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                disabled={!customerId || opportunities.length === 0}
                className={inputCls}
              >
                <option value="">— Không gắn —</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} · {formatVnd(o.valueVnd)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Dòng hàng */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Sản phẩm</span>
              <button type="button" onClick={() => setShowQuickProduct((v) => !v)} className="text-xs font-medium text-brand hover:underline">
                + Tạo nhanh sản phẩm
              </button>
            </div>

            {showQuickProduct && (
              <div className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed bg-gray-50 p-2">
                <input value={qpName} onChange={(e) => setQpName(e.target.value)} placeholder="Tên sản phẩm mới" className="min-w-[140px] flex-1 rounded border px-2 py-1.5 text-sm" />
                <input
                  value={qpPrice}
                  onChange={(e) => setQpPrice(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Giá (VND)"
                  className="w-28 rounded border px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={createQuickProduct}
                  disabled={qpBusy || !qpName.trim()}
                  className="rounded bg-gray-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {qpBusy ? "Đang lưu…" : "Lưu sản phẩm"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {items.map((r) => {
                const line = previewLineTotal(Number(r.quantity) || 0, Number(r.unitPriceVnd) || 0, Number(r.discountVnd) || 0);
                return (
                  <div key={r.key} className="rounded-lg border p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={r.productId}
                        onChange={(e) => onPickProduct(r.key, e.target.value)}
                        className="min-w-[130px] flex-1 rounded border px-2 py-1.5 text-sm"
                      >
                        <option value="">— Nhập tay —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setItems((rows) => (rows.length > 1 ? rows.filter((x) => x.key !== r.key) : rows))}
                        className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-rose-600"
                        title="Xoá dòng"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      value={r.name}
                      onChange={(e) => updateItem(r.key, { name: e.target.value })}
                      placeholder="Tên sản phẩm / mô tả"
                      className="mt-2 w-full rounded border px-2 py-1.5 text-sm"
                    />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <NumField label="SL" value={r.quantity} onChange={(v) => updateItem(r.key, { quantity: v })} />
                      <NumField label="Đơn giá" value={r.unitPriceVnd} onChange={(v) => updateItem(r.key, { unitPriceVnd: v })} />
                      <NumField label="Giảm" value={r.discountVnd} onChange={(v) => updateItem(r.key, { discountVnd: v })} />
                    </div>
                    <div className="mt-1 text-right text-xs text-gray-500">
                      Thành tiền: <span className="font-semibold text-gray-800">{formatVnd(line)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setItems((rows) => [...rows, newRow()])} className="mt-2 text-sm font-medium text-brand hover:underline">
              + Thêm dòng
            </button>
          </div>

          {/* Tổng tiền + giảm/ship/cọc */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <NumField label="Giảm giá đơn (VND)" value={discountVnd} onChange={setDiscountVnd} />
            <NumField label="Phí ship (VND)" value={shippingFeeVnd} onChange={setShippingFeeVnd} />
            <NumField label="Đã cọc (VND)" value={depositVnd} onChange={setDepositVnd} />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <Row label="Tạm tính" value={formatVnd(totals.subtotal)} />
            <Row label="Giảm giá" value={`- ${formatVnd(totals.discount)}`} />
            <Row label="Phí ship" value={`+ ${formatVnd(totals.shipping)}`} />
            <div className="my-1 border-t" />
            <Row label="Tổng tiền" value={formatVnd(totals.total)} strong />
            {totals.deposit > 0 && (
              <>
                <Row label="Đã cọc" value={`- ${formatVnd(totals.deposit)}`} />
                <Row label="Còn lại" value={formatVnd(totals.remaining)} />
              </>
            )}
          </div>

          {/* Thanh toán + trạng thái */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select label="Thanh toán" value={paymentMethod} onChange={setPaymentMethod} options={[{ value: "", label: "— Chọn —" }, ...PAYMENT_METHOD_OPTIONS]} />
            <Select label="Tình trạng trả" value={paymentStatus} onChange={setPaymentStatus} options={PAYMENT_STATUS_OPTIONS} />
            <Select label="Trạng thái đơn" value={status} onChange={setStatus} options={ORDER_STATUS_OPTIONS} />
          </div>

          {/* Giao hàng */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">Người nhận</span>
              <input value={shippingName} onChange={(e) => setShippingName(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">SĐT nhận</span>
              <input value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} inputMode="tel" className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Địa chỉ giao</span>
            <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className={inputCls} placeholder="Số nhà, đường, quận, tỉnh/thành" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Ghi chú</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Huỷ
            </button>
            <button type="submit" disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {busy ? "Đang tạo…" : "Tạo đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        inputMode="numeric"
        placeholder="0"
        className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
      />
    </label>
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
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "text-base font-bold text-brand-dark" : "text-gray-800"}>{value}</span>
    </div>
  );
}
