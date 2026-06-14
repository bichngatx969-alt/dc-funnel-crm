"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiSend } from "@/lib/client";
import type { PipelineStage } from "@/components/pipeline/types";

// Nguồn chọn khách: dùng /api/conversations (workspace-scoped) vì Contact list API (16.3) chưa READY.
// => Chỉ chọn được khách đã có hội thoại. Khi PR #4 Contact API xong sẽ thay bằng picker đầy đủ.
type ConvItem = {
  id: string;
  customer: { id: string; name: string | null; psid: string; phone: string | null } | null;
};
type CustomerOption = { id: string; label: string };

export function CreateOpportunityModal({
  pipelineId,
  pipelineName,
  stages,
  defaultStageId,
  onClose,
  onCreated,
}: {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStage[];
  defaultStageId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.position - b.position), [stages]);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [stageId, setStageId] = useState(defaultStageId ?? sortedStages[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [valueVnd, setValueVnd] = useState("");
  const [source, setSource] = useState("");
  const [expectedCloseAt, setExpectedCloseAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCustomers(true);
      try {
        const convs = await apiGet<ConvItem[]>("/api/conversations");
        if (cancelled) return;
        const map = new Map<string, CustomerOption>();
        for (const c of convs) {
          if (c.customer && !map.has(c.customer.id)) {
            const name = c.customer.name || `Khách ${c.customer.psid?.slice(-6) ?? ""}`;
            map.set(c.customer.id, {
              id: c.customer.id,
              label: c.customer.phone ? `${name} · ${c.customer.phone}` : name,
            });
          }
        }
        setCustomers(Array.from(map.values()));
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Vui lòng chọn khách hàng");
      return;
    }
    if (!stageId) {
      setError("Vui lòng chọn giai đoạn");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/opportunities", "POST", {
        customerId,
        pipelineId,
        stageId,
        title: title.trim() || undefined,
        valueVnd: valueVnd ? Number(valueVnd) : 0,
        source: source.trim() || undefined,
        expectedCloseAt: expectedCloseAt || undefined,
      });
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tạo được cơ hội");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">Tạo cơ hội</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Khách hàng *</label>
            {loadingCustomers ? (
              <div className="h-10 animate-pulse rounded border bg-gray-100" />
            ) : customers.length === 0 ? (
              <p className="rounded border border-dashed px-3 py-2 text-xs text-gray-400">
                Chưa có khách nào. Khách được tạo từ inbox — hãy nhận tin nhắn/bình luận trước.
              </p>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">— Chọn khách —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Pipeline</label>
              <input
                value={pipelineName}
                disabled
                className="w-full rounded border bg-gray-50 px-2 py-2 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Giai đoạn *</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
              >
                {sortedStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Tên cơ hội</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mặc định lấy theo tên khách"
              className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Giá trị (VND)</label>
              <input
                value={valueVnd}
                onChange={(e) => setValueVnd(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Dự kiến chốt</label>
              <input
                type="date"
                value={expectedCloseAt}
                onChange={(e) => setExpectedCloseAt(e.target.value)}
                className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Nguồn / kênh</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="vd: facebook, comment, ads…"
              className="w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Huỷ
            </button>
            <button
              type="submit"
              disabled={busy || !customerId}
              className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Đang lưu…" : "Lưu cơ hội"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
