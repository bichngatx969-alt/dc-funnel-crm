"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { industryLabel, roleLabel, type Workspace } from "@/components/workspace/labels";

type WorkspacesPayload = { items: Workspace[]; currentWorkspaceId: string | null };

// Switcher brand/workspace đặt trên cùng sidebar (AppShell).
// Gọi GET /api/workspaces khi mount; chuyển brand qua POST /api/workspaces/switch rồi reload
// để mọi dữ liệu lấy lại theo workspace mới (cookie HttpOnly dc_workspace_id do backend set).
export function WorkspaceSwitcher() {
  const [items, setItems] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Đóng popover khi click ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSwitch(id: string) {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    setSwitching(id);
    setError(null);
    try {
      await apiSend("/api/workspaces/switch", "POST", { workspaceId: id });
      // Cookie dc_workspace_id đã đổi -> reload toàn trang để dữ liệu re-scope theo brand mới.
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không chuyển được brand");
      setSwitching(null);
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border bg-white px-3 py-2">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="mt-1.5 h-2 w-16 rounded bg-gray-100" />
      </div>
    );
  }

  const current = items.find((w) => w.id === currentId) ?? items[0] ?? null;

  // Chưa có brand -> CTA onboarding.
  if (!current) {
    return (
      <Link
        href="/settings/workspaces"
        className="block rounded-lg border border-dashed px-3 py-2 text-center text-sm font-medium text-brand hover:bg-brand-light/40"
      >
        + Tạo brand đầu tiên
      </Link>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((w) => w.name.toLowerCase().includes(q)) : items;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-left hover:bg-gray-50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{current.name}</span>
          <span className="block truncate text-[11px] text-gray-500">
            {industryLabel(current.industry)}
            {roleLabel(current.role) ? ` · ${roleLabel(current.role)}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-gray-400" aria-hidden>
          ▾
        </span>
      </button>

      {error && <p className="mt-1 px-1 text-[11px] text-rose-600">{error}</p>}

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-auto rounded-lg border bg-white py-1 shadow-lg"
        >
          {items.length > 6 && (
            <div className="px-2 pb-1">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm brand…"
                className="w-full rounded border px-2 py-1 text-xs focus:border-brand focus:outline-none"
              />
            </div>
          )}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Không tìm thấy brand phù hợp.</p>
          )}

          {filtered.map((w) => {
            const isCurrent = w.id === currentId;
            return (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                disabled={switching !== null}
                onClick={() => handleSwitch(w.id)}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60 ${
                  isCurrent ? "bg-brand-light/40" : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-700">
                  {w.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{w.name}</span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {industryLabel(w.industry)}
                    {roleLabel(w.role) ? ` · ${roleLabel(w.role)}` : ""}
                  </span>
                </span>
                {switching === w.id ? (
                  <span className="shrink-0 text-[11px] text-gray-400">Đang chuyển…</span>
                ) : isCurrent ? (
                  <span className="shrink-0 text-brand" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="mt-1 border-t pt-1">
            <Link
              href="/settings/workspaces"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              + Tạo brand mới
            </Link>
            <Link
              href="/settings/workspaces"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              ⚙ Quản lý brand
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
