"use client";

import { useState } from "react";
import { apiSend } from "@/lib/client";
import { ProfileBlock } from "./ProfileBlock";
import { InboxIcon } from "../icons";

// Các chỉ dấu AI sẽ tổng hợp (theo HÀNH VI hội thoại, không phán xét con người).
const INSIGHT_FIELDS = [
  "Mức độ mua: Lạnh / Ấm / Nóng / Sẵn sàng chốt",
  "Giai đoạn phễu",
  "Tâm trạng hội thoại",
  "Phong cách giao tiếp (tín hiệu DISC)",
  "Nhu cầu chính",
  "Phản đối chính",
  "Sản phẩm đang quan tâm",
  "Dữ liệu còn thiếu",
  "Offer nên dùng",
  "Việc nên làm tiếp theo",
];

// AI Insight: phần phân tích sâu CHỜ backend (không fake); phần gợi ý câu trả lời
// dùng API hiện có /api/ai/suggest (AI chỉ gợi ý — sale tự duyệt & gửi).
export function AiInsightBlock({
  conversationId,
  aiEnabled,
}: {
  conversationId: string;
  aiEnabled: boolean;
}) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function suggest() {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const res = await apiSend<{ enabled: boolean; suggestion: string | null }>(
        `/api/ai/suggest`,
        "POST",
        { conversationId }
      );
      if (!res.enabled) setError("AI chưa bật (thiếu OPENAI_API_KEY).");
      else if (!res.suggestion) setError("AI chưa tạo được gợi ý. Thử lại sau.");
      else setSuggestion(res.suggestion);
    } catch (e: any) {
      setError(e?.message ?? "Không gọi được AI.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <ProfileBlock id="block-ai" title="AI Insight" icon="sparkles" collapsible defaultOpen>
      {/* Phân tích sâu — chờ API backend (không hiển thị dữ liệu giả) */}
      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-700">
          <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
          Phân tích hội thoại
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-violet-700/70">
          AI sẽ đọc tín hiệu hội thoại và tổng hợp thành chỉ dấu bán hàng:
        </p>
        <ul className="mt-2 space-y-1">
          {INSIGHT_FIELDS.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-[12px] text-violet-900/70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          title="Đang chờ API phân tích từ backend"
          className="mt-3 inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-violet-200/70 px-3 py-1.5 text-[12px] font-semibold text-violet-500"
        >
          <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
          Phân tích hội thoại
        </button>
        <p className="mt-1.5 text-[11px] text-violet-500/70">
          Đang chờ API phân tích từ backend (Codex). Khi sẵn sàng, kết quả sẽ hiện tại đây.
        </p>
      </div>

      {/* Gợi ý câu trả lời — dùng được ngay (AI chỉ gợi ý, sale tự duyệt & gửi) */}
      <div className="mt-3">
        <button
          type="button"
          onClick={suggest}
          disabled={loading || !aiEnabled}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand/15 disabled:opacity-50"
        >
          <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
          {loading ? "Đang nghĩ…" : "Gợi ý câu trả lời"}
        </button>
        {!aiEnabled && (
          <p className="mt-1.5 text-[11px] text-amber-600">AI chưa bật (thiếu OPENAI_API_KEY).</p>
        )}
        {error && <p className="mt-1.5 text-[11px] text-rose-500">{error}</p>}
        {suggestion && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-gray-800">{suggestion}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-gray-400">AI chỉ gợi ý — sale tự duyệt & gửi.</span>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              >
                <InboxIcon name={copied ? "userCheck" : "copy"} className="h-3.5 w-3.5" />
                {copied ? "Đã chép" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProfileBlock>
  );
}
