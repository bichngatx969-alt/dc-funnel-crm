"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import {
  ACTION_LABEL,
  RUN_STATUS_CLASS,
  RUN_STATUS_LABEL,
  RUN_STATUS_OPTIONS,
  TRIGGER_LABEL,
  fmtDateTime,
  type Pagination,
  type Run,
} from "@/components/automation/types";

type ListPayload = { items: Run[]; pagination: Pagination };

// Lịch sử AutomationRun. Truyền ruleId để lọc theo 1 rule (dùng trong rule detail).
export function RunsList({ ruleId }: { ruleId?: string }) {
  const [items, setItems] = useState<Run[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (ruleId) params.set("ruleId", ruleId);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<ListPayload>(`/api/automation/runs?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được lịch sử chạy");
    } finally {
      setLoading(false);
    }
  }, [ruleId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded border px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Mọi kết quả</option>
          {RUN_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button onClick={load} className="rounded border px-2 py-1.5 text-sm hover:bg-gray-50">
          Làm mới
        </button>
      </div>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có lần chạy nào" description="Khi quy tắc được kích hoạt hoặc bạn chạy thử, lịch sử sẽ hiện ở đây." />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="rounded-lg border bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RUN_STATUS_CLASS[r.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {RUN_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {!ruleId && r.rule && <span className="truncate font-medium text-gray-800">{r.rule.name}</span>}
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{fmtDateTime(r.createdAt)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {TRIGGER_LABEL[r.triggerType] ?? r.triggerType}
                  {r.rule ? ` · ${ACTION_LABEL[r.rule.actionType] ?? r.rule.actionType}` : ""}
                  {r.sourceType ? ` · nguồn: ${r.sourceType}${r.sourceId ? ` (${r.sourceId.slice(0, 8)}…)` : ""}` : ""}
                </div>
                {r.error && <div className="mt-1 text-xs text-rose-600">Lỗi: {r.error}</div>}
              </div>
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.pageCount} · {pagination.total} lần chạy
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
