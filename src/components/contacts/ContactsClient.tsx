"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/client";
import { ScoreBadge, StageBadge, Tag } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import {
  STAGE_OPTIONS,
  contactName,
  fmtDate,
  type ContactListItem,
  type Pagination,
  type Stage,
} from "@/components/contacts/types";

type ListPayload = { items: ContactListItem[]; pagination: Pagination };

export function ContactsClient() {
  const router = useRouter();
  const [items, setItems] = useState<ContactListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tag.trim()) params.set("tag", tag.trim());
    if (stage) params.set("stage", stage);
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const data = await apiGet<ListPayload>(`/api/contacts?${params.toString()}`);
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách khách");
    } finally {
      setLoading(false);
    }
  }, [q, tag, stage, page]);

  // Debounce filters/search.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const hasFilter = Boolean(q.trim() || tag.trim() || stage);

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            resetToFirstPage();
          }}
          placeholder="Tìm tên / SĐT / email…"
          className="min-w-[180px] flex-1 rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <select
          value={stage}
          onChange={(e) => {
            setStage(e.target.value as Stage | "");
            resetToFirstPage();
          }}
          className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Tất cả giai đoạn</option>
          {STAGE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            resetToFirstPage();
          }}
          placeholder="Lọc theo tag"
          className="w-32 rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Thêm khách
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
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        hasFilter ? (
          <EmptyState
            title="Không tìm thấy khách phù hợp"
            description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
            action={
              <button
                onClick={() => {
                  setQ("");
                  setTag("");
                  setStage("");
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
            icon="👤"
            title="Chưa có khách hàng"
            description="Khách sẽ tự được tạo khi nhắn tin hoặc bình luận. Bạn cũng có thể thêm thủ công."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                + Thêm khách
              </button>
            }
          />
        )
      ) : (
        <>
          {/* Desktop: bảng */}
          <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Khách</th>
                  <th className="px-3 py-2 font-medium">Liên hệ</th>
                  <th className="px-3 py-2 font-medium">Giai đoạn</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                  <th className="px-3 py-2 font-medium">Phụ trách</th>
                  <th className="px-3 py-2 font-medium">Hoạt động</th>
                  <th className="px-3 py-2 font-medium">Lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                    className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={c.leadScore} />
                        <span className="font-medium text-gray-900">{contactName(c)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <div>{c.phone || "—"}</div>
                      <div className="text-xs text-gray-400">{c.email || ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StageBadge stage={c.currentStage} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                        {c.tags.length > 3 && <span className="text-xs text-gray-400">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{c.owner?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {c._count.conversations}💬 · {c._count.opportunities}🎯 · {c._count.tasks}✓ · {c._count.notes}📝
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(c.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/contacts/${c.id}`)}
                className="block w-full rounded-xl border bg-white p-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ScoreBadge score={c.leadScore} />
                    <span className="truncate font-medium text-gray-900">{contactName(c)}</span>
                  </div>
                  <StageBadge stage={c.currentStage} />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {c.phone || c.email || "Chưa có liên hệ"}
                  {c.owner?.name ? ` · ${c.owner.name}` : ""}
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  {c._count.conversations} hội thoại · {c._count.opportunities} cơ hội · {c._count.tasks} việc · {c._count.notes} ghi chú
                </div>
              </button>
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.pageCount} · {pagination.total} khách
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border px-3 py-1.5 disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  disabled={page >= pagination.pageCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1.5 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <ContactFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={(saved) => {
            setShowCreate(false);
            router.push(`/contacts/${saved.id}`);
          }}
        />
      )}
    </div>
  );
}
