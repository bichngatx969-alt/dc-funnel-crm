"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import {
  INDUSTRY_OPTIONS,
  industryLabel,
  roleLabel,
  type Workspace,
} from "@/components/workspace/labels";

type WorkspacesPayload = { items: Workspace[]; currentWorkspaceId: string | null };

// Trang Cài đặt > Brands: xem danh sách brand, chuyển brand, và tạo brand mới (nếu đủ quyền).
export function WorkspacesClient({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("fashion");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<WorkspacesPayload>("/api/workspaces");
      setItems(data.items ?? []);
      setCurrentId(data.currentWorkspaceId ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách brand");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function switchTo(id: string) {
    if (id === currentId) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/workspaces/switch", "POST", { workspaceId: id });
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không chuyển được brand");
      setBusy(false);
    }
  }

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // API tạo brand sẽ tự chuyển workspace hiện tại sang brand mới -> reload.
      await apiSend("/api/workspaces", "POST", { name: name.trim(), industry });
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tạo được brand");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="Tạo brand đầu tiên của bạn"
          description="Mỗi brand là một không gian làm việc riêng, dữ liệu khách không lẫn giữa các brand."
          action={
            canManage ? undefined : (
              <span className="text-xs text-gray-400">Liên hệ quản trị viên để được tạo brand.</span>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((w) => {
            const isCurrent = w.id === currentId;
            return (
              <div key={w.id} className="flex items-center justify-between rounded-xl border bg-white p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand font-bold text-white">
                    {w.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">{w.name}</div>
                    <div className="truncate text-xs text-gray-500">
                      {industryLabel(w.industry)} · {roleLabel(w.role)} · {w.currency} · {w.timezone}
                    </div>
                  </div>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
                    Đang dùng
                  </span>
                ) : (
                  <button
                    onClick={() => switchTo(w.id)}
                    disabled={busy}
                    className="shrink-0 rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                  >
                    Chuyển sang
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <form onSubmit={createWorkspace} className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Tạo brand mới</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên brand (vd: HICHAOS)"
              className="flex-1 rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Đang tạo…" : "Tạo brand"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Brand mới mặc định dùng VND và múi giờ Asia/Ho_Chi_Minh.
          </p>
        </form>
      )}
    </div>
  );
}
