"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import type { CatalogVariant } from "./VariantManager";

type InventoryMovement = {
  id: string;
  variantId: string;
  type: string;
  quantity: number;
  reason: string | null;
  note: string | null;
  createdAt: string;
};

const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Nhập",
  OUT: "Xuất",
  ADJUST: "Điều chỉnh",
  RESERVE: "Giữ hàng",
  RELEASE: "Hủy giữ",
};

function optionSummary(values: Record<string, string> | null): string {
  if (!values) return "";
  return Object.entries(values)
    .map(([key, val]) => `${key}: ${val}`)
    .join(" · ");
}

function digits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function InventoryPanel({ catalogItemId }: { catalogItemId: string }) {
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ items: CatalogVariant[] }>(`/api/catalog/items/${catalogItemId}/variants?pageSize=200`);
      setVariants(res.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được tồn kho.");
    } finally {
      setLoading(false);
    }
  }, [catalogItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tracked = variants.filter((v) => v.inventoryTracked);
  const totalStock = tracked.reduce((sum, v) => sum + v.inventoryQuantity, 0);
  const lowStock = variants.filter((v) => v.lowStock);
  const outOfStock = tracked.filter((v) => v.inventoryQuantity <= 0);

  function applyVariant(updated: CatalogVariant) {
    setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }

  return (
    <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Tổng tồn" value={totalStock} />
        <SummaryCard label="Sắp hết" value={lowStock.length} tone={lowStock.length ? "warn" : undefined} />
        <SummaryCard label="Hết hàng" value={outOfStock.length} tone={outOfStock.length ? "bad" : undefined} />
      </div>

      {error && <p className="text-[12px] text-rose-500">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : variants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
            <Icon name="orders" className="h-6 w-6" />
          </span>
          <p className="text-[13px] font-medium text-gray-600">Chưa có biến thể để theo dõi tồn</p>
          <p className="max-w-[20rem] text-[12px] text-gray-400">Tạo option và sinh biến thể ở tab “Biến thể” trước.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <InventoryRow
              key={variant.id}
              variant={variant}
              open={openId === variant.id}
              onToggle={() => setOpenId((id) => (id === variant.id ? null : variant.id))}
              onApply={applyVariant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

function InventoryRow({
  variant,
  open,
  onToggle,
  onApply,
}: {
  variant: CatalogVariant;
  open: boolean;
  onToggle: () => void;
  onApply: (variant: CatalogVariant) => void;
}) {
  const [mode, setMode] = useState<"IN" | "OUT" | "SET">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiGet<{ movements: InventoryMovement[] }>(`/api/catalog/variants/${variant.id}/inventory?pageSize=50`);
      setMovements(res.movements ?? []);
      setHistoryLoaded(true);
    } catch {
      // lịch sử lỗi không chặn việc điều chỉnh
    } finally {
      setHistoryLoading(false);
    }
  }, [variant.id]);

  useEffect(() => {
    if (open && !historyLoaded) void loadHistory();
  }, [open, historyLoaded, loadHistory]);

  async function submit() {
    setError(null);
    setNotice(null);
    const n = Number(digits(quantity));
    if (mode !== "SET" && (!n || n <= 0)) {
      setError("Nhập số lượng lớn hơn 0.");
      return;
    }
    let delta: number;
    let type: string;
    if (mode === "IN") {
      delta = n;
      type = "IN";
    } else if (mode === "OUT") {
      delta = -n;
      type = "OUT";
    } else {
      const target = Number(digits(quantity));
      delta = target - variant.inventoryQuantity;
      type = "ADJUST";
      if (delta === 0) {
        setNotice("Tồn đã bằng giá trị này, không cần điều chỉnh.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await apiSend<{ variant: CatalogVariant; movement: InventoryMovement }>(
        `/api/catalog/variants/${variant.id}/inventory/adjust`,
        "POST",
        { type, quantity: delta, reason: reason.trim() || null, note: note.trim() || null }
      );
      onApply(res.variant);
      setMovements((prev) => [res.movement, ...prev]);
      setQuantity("");
      setReason("");
      setNote("");
      setNotice("Đã cập nhật tồn kho.");
    } catch (e: any) {
      setError(e?.message ?? "Không điều chỉnh được tồn kho.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`rounded-xl border ${variant.lowStock ? "border-amber-200" : "border-gray-100"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-gray-800">{optionSummary(variant.optionValuesJson) || variant.name}</span>
            {variant.lowStock && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Sắp hết</span>}
            {variant.inventoryTracked && variant.inventoryQuantity <= 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Hết hàng</span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            {variant.sku || "Chưa có SKU"}
            {variant.lowStockThreshold != null && <span> · ngưỡng {variant.lowStockThreshold}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-lg font-bold ${variant.lowStock ? "text-amber-600" : "text-gray-900"}`}>
            {variant.inventoryTracked ? variant.inventoryQuantity : "—"}
          </div>
          <div className="text-[10px] text-gray-400">tồn</div>
        </div>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {!variant.inventoryTracked ? (
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-[12px] text-gray-500">Biến thể này không theo dõi tồn kho. Bật “Theo dõi tồn kho” ở tab Biến thể để điều chỉnh.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["IN", "Nhập +"],
                  ["OUT", "Xuất −"],
                  ["SET", "Đặt lại ="],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${mode === key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {mode === "SET" ? "Tồn mới" : "Số lượng"}
                  </span>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    inputMode="numeric"
                    placeholder={mode === "SET" ? String(variant.inventoryQuantity) : "VD: 10"}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Lý do</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Nhập hàng / Bán / Kiểm kê..."
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ghi chú</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tùy chọn"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </label>

              {error && <p className="text-[12px] text-rose-500">{error}</p>}
              {notice && <p className="text-[12px] text-emerald-600">{notice}</p>}

              <div className="flex justify-end">
                <button type="button" onClick={submit} disabled={submitting} className="rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                  {submitting ? "Đang lưu..." : "Cập nhật tồn"}
                </button>
              </div>
            </>
          )}

          <div>
            <h5 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">Lịch sử</h5>
            {historyLoading ? (
              <p className="text-[12px] text-gray-400">Đang tải lịch sử...</p>
            ) : movements.length === 0 ? (
              <p className="text-[12px] text-gray-400">Chưa có lịch sử điều chỉnh.</p>
            ) : (
              <div className="space-y-1">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12px]">
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-700">{MOVEMENT_LABEL[m.type] ?? m.type}</span>
                      {m.reason && <span className="text-gray-500"> · {m.reason}</span>}
                      {m.note && <span className="text-gray-400"> · {m.note}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`font-semibold ${m.quantity >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
