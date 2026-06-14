"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";
import { EmptyState } from "@/components/EmptyState";
import { hideComment, metaActionError, patchComment, replyComment } from "@/components/comments/actions";
import {
  COMMENT_STATUS_CLASS,
  COMMENT_STATUS_LABEL,
  COMMENT_STATUS_OPTIONS,
  commenterName,
  fmtDateTime,
  type Comment,
} from "@/components/comments/types";

export function CommentDetailClient({ id }: { id: string }) {
  const [comment, setComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<null | "reply" | "hide" | "follow" | "status">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ comment: Comment }>(`/api/comments/${id}`);
      setComment(data.comment);
      setStatus(data.comment.status);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được bình luận");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function saveStatus() {
    setBusy("status");
    setActionError(null);
    setNotice(null);
    try {
      const updated = await patchComment(id, { status });
      setComment(updated);
      setNotice("Đã cập nhật trạng thái");
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollowUp() {
    if (!comment) return;
    setBusy("follow");
    setActionError(null);
    setNotice(null);
    try {
      const updated = await patchComment(id, { needsFollowUp: !comment.needsFollowUp });
      setComment(updated);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  async function sendReply() {
    const message = replyText.trim();
    if (!message) return;
    setBusy("reply");
    setActionError(null);
    setNotice(null);
    try {
      await replyComment(id, message);
      setReplyText("");
      setNotice("Đã gửi trả lời lên Facebook");
      await load();
    } catch (e: unknown) {
      setActionError(metaActionError(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleHide() {
    if (!comment) return;
    setBusy("hide");
    setActionError(null);
    setNotice(null);
    try {
      await hideComment(id, !comment.isHidden);
      setNotice(comment.isHidden ? "Đã hiện lại comment" : "Đã ẩn comment");
      await load();
    } catch (e: unknown) {
      setActionError(metaActionError(e));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-xl border bg-white" />
        <div className="h-48 animate-pulse rounded-xl border bg-white" />
      </div>
    );
  }

  if (!comment) {
    return (
      <EmptyState
        title="Không tải được bình luận"
        description={error ?? undefined}
        action={
          <div className="flex gap-2">
            <button onClick={load} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Thử lại
            </button>
            <Link href="/comments" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Về danh sách
            </Link>
          </div>
        }
      />
    );
  }

  const c = comment;

  return (
    <div className="space-y-4">
      <Link href="/comments" className="inline-block text-sm text-gray-500 hover:text-gray-800">
        ‹ Danh sách bình luận
      </Link>

      {/* Nội dung comment */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-gray-900">{commenterName(c)}</span>
          {c.hasPhone && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Có SĐT</span>}
          {c.needsFollowUp && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">Cần xử lý</span>}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COMMENT_STATUS_CLASS[c.status] ?? "bg-gray-100 text-gray-700"}`}>
            {COMMENT_STATUS_LABEL[c.status] ?? c.status}
          </span>
          {c.isHidden && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Đang ẩn</span>}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-gray-800">{c.message || "(không có nội dung)"}</p>
        <div className="mt-2 text-xs text-gray-400">
          {fmtDateTime(c.externalCreatedAt ?? c.createdAt)}
          {c.repliedAt ? ` · đã trả lời ${fmtDateTime(c.repliedAt)}` : ""}
          {c.hiddenAt ? ` · ẩn ${fmtDateTime(c.hiddenAt)}` : ""}
        </div>
        {c.permalink && (
          <a href={c.permalink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand hover:underline">
            Xem trên Facebook ↗
          </a>
        )}
      </div>

      {/* Context */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="mb-2 font-semibold">Bài viết & Fanpage</div>
          <Info label="Fanpage" value={c.facebookPage?.pageName ?? null} />
          <Info label="Bài viết" value={c.post?.message ?? c.post?.externalPostId ?? null} />
          {c.post?.permalink && (
            <a href={c.post.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">
              Mở bài viết ↗
            </a>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <div className="mb-2 font-semibold">Khách & Hội thoại</div>
          {c.customer ? (
            <div className="flex gap-2">
              <span className="w-20 shrink-0 text-gray-400">Khách</span>
              <Link href={`/contacts/${c.customer.id}`} className="text-brand hover:underline">
                {c.customer.name || c.customer.phone || "Khách"}
              </Link>
            </div>
          ) : (
            <Info label="Khách" value={null} />
          )}
          <Info label="SĐT" value={c.customer?.phone ?? null} />
          {c.conversationId ? (
            <div className="flex gap-2">
              <span className="w-20 shrink-0 text-gray-400">Hội thoại</span>
              <Link href="/inbox" className="text-brand hover:underline">
                Mở trong Inbox →
              </Link>
            </div>
          ) : (
            <Info label="Hội thoại" value={null} />
          )}
        </div>
      </div>

      {/* Hành động */}
      <div className="space-y-3 rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold">Xử lý nhanh</div>

        {/* Reply (Graph API) */}
        <div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Trả lời công khai bình luận này…"
            className="w-full resize-none rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={sendReply}
              disabled={busy === "reply" || !replyText.trim()}
              className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy === "reply" ? "Đang gửi…" : "Gửi trả lời"}
            </button>
            <button onClick={toggleHide} disabled={busy === "hide"} className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              {busy === "hide" ? "Đang xử lý…" : c.isHidden ? "Hiện lại comment" : "Ẩn comment"}
            </button>
            <button onClick={toggleFollowUp} disabled={busy === "follow"} className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              {c.needsFollowUp ? "Bỏ cần xử lý" : "Đánh dấu cần xử lý"}
            </button>
          </div>
        </div>

        {/* Trạng thái nội bộ */}
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Trạng thái nội bộ</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none">
              {COMMENT_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={saveStatus} disabled={busy === "status"} className="rounded border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {busy === "status" ? "Đang lưu…" : "Cập nhật trạng thái"}
          </button>
        </div>

        {notice && <p className="text-xs text-emerald-600">{notice}</p>}
        {actionError && <p className="text-xs text-rose-600">{actionError}</p>}
        <p className="text-[11px] text-gray-400">
          Trả lời / ẩn cần Fanpage có quyền pages_manage_engagement. Nếu lỗi quyền, hãy reconnect Fanpage ở Cài đặt.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-gray-800">{value || "—"}</span>
    </div>
  );
}
