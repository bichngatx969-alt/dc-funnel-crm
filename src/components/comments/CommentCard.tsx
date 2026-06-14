"use client";

import { useState } from "react";
import Link from "next/link";
import { hideComment, metaActionError, patchComment, replyComment } from "@/components/comments/actions";
import {
  COMMENT_STATUS_CLASS,
  COMMENT_STATUS_LABEL,
  commenterName,
  fmtDateTime,
  type Comment,
} from "@/components/comments/types";

export function CommentCard({ comment, onChange }: { comment: Comment; onChange: (c: Comment) => void }) {
  const c = comment;
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<null | "reply" | "hide" | "follow" | "archive">(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollowUp() {
    setBusy("follow");
    setError(null);
    try {
      const updated = await patchComment(c.id, { needsFollowUp: !c.needsFollowUp });
      onChange(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    setBusy("archive");
    setError(null);
    try {
      const updated = await patchComment(c.id, { status: "ARCHIVED", needsFollowUp: false });
      onChange(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      setBusy(null);
    }
  }

  async function toggleHide() {
    setBusy("hide");
    setError(null);
    try {
      await hideComment(c.id, !c.isHidden);
      onChange({ ...c, isHidden: !c.isHidden, status: !c.isHidden ? "HIDDEN" : "OPEN" });
    } catch (e: unknown) {
      setError(metaActionError(e));
    } finally {
      setBusy(null);
    }
  }

  async function sendReply() {
    const message = replyText.trim();
    if (!message) return;
    setBusy("reply");
    setError(null);
    try {
      await replyComment(c.id, message);
      onChange({ ...c, status: "REPLIED", needsFollowUp: false });
      setReplyText("");
      setReplyOpen(false);
    } catch (e: unknown) {
      setError(metaActionError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`rounded-xl border bg-white p-3 ${c.needsFollowUp ? "border-l-4 border-l-rose-400" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-gray-900">{commenterName(c)}</span>
            {c.hasPhone && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Có SĐT</span>}
            {c.needsFollowUp && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">Cần xử lý</span>}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COMMENT_STATUS_CLASS[c.status] ?? "bg-gray-100 text-gray-700"}`}>
              {COMMENT_STATUS_LABEL[c.status] ?? c.status}
            </span>
            {c.isHidden && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">Đang ẩn</span>}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{c.message || "(không có nội dung)"}</p>
        </div>
        <span className="shrink-0 text-[11px] text-gray-400">{fmtDateTime(c.externalCreatedAt ?? c.createdAt)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        {c.facebookPage?.pageName && <span>📄 {c.facebookPage.pageName}</span>}
        {c.post && (c.post.permalink ? (
          <a href={c.post.permalink} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            Bài viết ↗
          </a>
        ) : (
          <span className="truncate">Bài: {c.post.message || c.post.externalPostId}</span>
        ))}
        {c.customer && (
          <Link href={`/contacts/${c.customer.id}`} className="text-brand hover:underline">
            Mở khách
          </Link>
        )}
        {c.conversationId && (
          <Link href="/inbox" className="text-brand hover:underline">
            Mở hội thoại
          </Link>
        )}
        <Link href={`/comments/${c.id}`} className="text-gray-500 hover:text-gray-800 hover:underline">
          Chi tiết
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setReplyOpen((v) => !v)}
          className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50"
        >
          Trả lời
        </button>
        <button onClick={toggleHide} disabled={busy === "hide"} className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60">
          {busy === "hide" ? "Đang xử lý…" : c.isHidden ? "Hiện lại" : "Ẩn comment"}
        </button>
        <button onClick={toggleFollowUp} disabled={busy === "follow"} className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60">
          {c.needsFollowUp ? "Bỏ cần xử lý" : "Đánh dấu cần xử lý"}
        </button>
        {c.status !== "ARCHIVED" && (
          <button onClick={archive} disabled={busy === "archive"} className="rounded border px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-60">
            Lưu trữ
          </button>
        )}
      </div>

      {replyOpen && (
        <div className="mt-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Nhập nội dung trả lời công khai…"
            className="w-full resize-none rounded border px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button onClick={() => setReplyOpen(false)} className="rounded border px-2.5 py-1 text-xs hover:bg-gray-50">
              Huỷ
            </button>
            <button
              onClick={sendReply}
              disabled={busy === "reply" || !replyText.trim()}
              className="rounded bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy === "reply" ? "Đang gửi…" : "Gửi trả lời"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
