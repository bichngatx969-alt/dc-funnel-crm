"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { RuleFormModal } from "@/components/automation/RuleFormModal";
import { RunsList } from "@/components/automation/RunsList";
import {
  ACTION_LABEL,
  ACTION_OPTIONS,
  LOCKED_ACTIONS,
  TRIGGER_LABEL,
  TRIGGER_OPTIONS,
  fmtDateTime,
  templateLabel,
  type Pagination,
  type Rule,
  type Template,
} from "@/components/automation/types";

type ListPayload = { items: Rule[]; templates?: Template[]; pagination: Pagination };
type Tab = "rules" | "runs";
type FormInitial = {
  name?: string;
  triggerType?: string;
  actionType?: string;
  conditionsJson?: unknown;
  actionConfigJson?: unknown;
  isActive?: boolean;
};

export function AutomationClient() {
  const [tab, setTab] = useState<Tab>("rules");
  const [items, setItems] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [actionType, setActionType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<FormInitial | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ templates: "true" });
    if (q.trim()) params.set("q", q.trim());
    if (triggerType) params.set("triggerType", triggerType);
    if (actionType) params.set("actionType", actionType);
    if (isActive) params.set("isActive", isActive);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<ListPayload>(`/api/automation/rules?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
      if (data.templates) setTemplates(data.templates);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được quy tắc tự động");
    } finally {
      setLoading(false);
    }
  }, [q, triggerType, actionType, isActive, page]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleActive(rule: Rule) {
    setNotice(null);
    // optimistic
    setItems((list) => list.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    try {
      await apiSend<{ rule: Rule }>(`/api/automation/rules/${rule.id}`, "PATCH", { isActive: !rule.isActive });
    } catch (e: unknown) {
      setItems((list) => list.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r)));
      setNotice(e instanceof Error ? e.message : "Không đổi được trạng thái");
    }
  }

  function openBlank() {
    setFormInitial(null);
    setShowForm(true);
  }

  function useTemplate(t: Template) {
    setFormInitial({
      name: templateLabel(t),
      triggerType: t.triggerType,
      actionType: t.actionType,
      conditionsJson: t.conditionsJson,
      actionConfigJson: t.actionConfigJson,
      isActive: true,
    });
    setShowForm(true);
  }

  const hasFilter = Boolean(q.trim() || triggerType || actionType || isActive);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b text-sm">
        <TabBtn active={tab === "rules"} onClick={() => setTab("rules")} label="Quy tắc" />
        <TabBtn active={tab === "runs"} onClick={() => setTab("runs")} label="Lịch sử chạy" />
      </div>

      {tab === "runs" ? (
        <RunsList />
      ) : (
        <>
          {/* Mẫu có sẵn */}
          {templates.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Mẫu có sẵn — bấm để tạo nhanh</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {templates.map((t, i) => (
                  <button
                    key={`${t.triggerType}-${t.actionType}-${i}`}
                    onClick={() => useTemplate(t)}
                    className="rounded-xl border border-dashed bg-white p-3 text-left hover:border-brand hover:bg-brand-light/20"
                  >
                    <div className="text-sm font-medium text-gray-900">{templateLabel(t)}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Khi {TRIGGER_LABEL[t.triggerType] ?? t.triggerType} → {ACTION_LABEL[t.actionType] ?? t.actionType}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bộ lọc + tạo */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên / mô tả…"
              className="min-w-[160px] flex-1 rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <select value={triggerType} onChange={(e) => { setTriggerType(e.target.value); setPage(1); }} className="rounded border px-2 py-2 text-sm">
              <option value="">Mọi kích hoạt</option>
              {TRIGGER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }} className="rounded border px-2 py-2 text-sm">
              <option value="">Mọi hành động</option>
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }} className="rounded border px-2 py-2 text-sm">
              <option value="">Bật & tắt</option>
              <option value="true">Đang bật</option>
              <option value="false">Đã tắt</option>
            </select>
            <button onClick={openBlank} className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              + Tạo quy tắc
            </button>
          </div>

          {notice && <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</div>}
          {error && (
            <div className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>{error}</span>
              <button onClick={load} className="shrink-0 rounded border border-rose-300 px-2 py-1 text-xs hover:bg-rose-100">Thử lại</button>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border bg-white" />
              ))}
            </div>
          ) : items.length === 0 ? (
            hasFilter ? (
              <EmptyState
                title="Không tìm thấy quy tắc phù hợp"
                description="Thử đổi bộ lọc hoặc từ khoá."
                action={
                  <button onClick={() => { setQ(""); setTriggerType(""); setActionType(""); setIsActive(""); setPage(1); }} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                    Xoá bộ lọc
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon="⚡"
                title="Chưa có quy tắc tự động"
                description="Bật một mẫu có sẵn ở trên, hoặc tạo quy tắc riêng để hệ thống tự làm việc lặp lại giúp bạn."
                action={
                  <button onClick={openBlank} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                    + Tạo quy tắc
                  </button>
                }
              />
            )
          ) : (
            <>
              <div className="space-y-2">
                {items.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
                    <Link href={`/automation/${r.id}`} className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">{r.name}</div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        Khi {TRIGGER_LABEL[r.triggerType] ?? r.triggerType} → {ACTION_LABEL[r.actionType] ?? r.actionType}
                        {LOCKED_ACTIONS.includes(r.actionType) ? " · 🔒 khóa an toàn" : ""}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        Đã chạy {r.runCount} lần{r.lastRunAt ? ` · gần nhất ${fmtDateTime(r.lastRunAt)}` : ""}
                      </div>
                    </Link>
                    <Switch on={r.isActive} onClick={() => toggleActive(r)} />
                  </div>
                ))}
              </div>

              {pagination && pagination.pageCount > 1 && (
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-gray-500">Trang {pagination.page}/{pagination.pageCount} · {pagination.total} quy tắc</span>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1.5 disabled:opacity-50">Trước</button>
                    <button disabled={page >= pagination.pageCount} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1.5 disabled:opacity-50">Sau</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showForm && (
        <RuleFormModal
          mode="create"
          initial={formInitial}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 font-medium ${active ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}
    >
      {label}
    </button>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      title={on ? "Đang bật — bấm để tắt" : "Đã tắt — bấm để bật"}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
