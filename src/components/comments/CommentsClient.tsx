"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { CommentCard } from "@/components/comments/CommentCard";
import {
  QUICK_FILTERS,
  quickFilterParams,
  type Comment,
  type Pagination,
  type QuickFilter,
} from "@/components/comments/types";

type ListPayload = { items: Comment[]; pagination: Pagination };
type PageOption = { pageId: string; pageName: string };

export function CommentsClient() {
  const [items, setItems] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [q, setQ] = useState("");
  const [pageId, setPageId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet<PageOption[]>("/api/facebook-pages")
      .then((p) => setPages(p ?? []))
      .catch(() => setPages([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(quickFilterParams(quick));
    if (q.trim()) params.set("q", q.trim());
    if (pageId) params.set("pageId", pageId);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<ListPayload>(`/api/comments?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được bình luận");
    } finally {
      setLoading(false);
    }
  }, [quick, q, pageId, page]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  function updateItem(updated: Comment) {
    setItems((list) => list.map((it) => (it.id === updated.id ? updated : it)));
  }

  const hasFilter = quick !== "all" || Boolean(q.trim() || pageId);

  return (
    <div className="space-y-3">
      {/* Bộ lọc nhanh */}
      <div className="flex flex-wrap gap-1">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setQuick(f.key);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              quick === f.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm nội dung / tên / SĐT…"
          className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        {pages.length > 0 && (
          <select
            value={pageId}
            onChange={(e) => {
              setPageId(e.target.value);
              setPage(1);
            }}
            className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Tất cả Fanpage</option>
            {pages.map((p) => (
              <option key={p.pageId} value={p.pageId}>
                {p.pageName}
              </option>
            ))}
          </select>
        )}
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
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        hasFilter ? (
          <EmptyState
            title="Không tìm thấy bình luận phù hợp"
            description="Thử đổi bộ lọc nhanh hoặc từ khoá tìm kiếm."
            action={
              <button
                onClick={() => {
                  setQuick("all");
                  setQ("");
                  setPageId("");
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
            icon="💬"
            title="Chưa có bình luận"
            description="Kết nối Fanpage và bật nhận bình luận để kéo comment từ bài viết/quảng cáo về đây."
            action={
              <a href="/settings/integrations/facebook" className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Kết nối Fanpage
              </a>
            }
          />
        )
      ) : (
        <>
          <div className="space-y-2">
            {items.map((c) => (
              <CommentCard key={c.id} comment={c} onChange={updateItem} />
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.pageCount} · {pagination.total} bình luận
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
