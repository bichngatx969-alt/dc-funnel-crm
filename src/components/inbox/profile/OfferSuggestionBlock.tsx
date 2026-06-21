"use client";

import { useState } from "react";
import { apiSend } from "@/lib/client";
import { InboxIcon } from "../icons";
import { ProfileBlock, BlockEmpty, BlockCta } from "./ProfileBlock";

type OfferSuggestion = {
  offerId: string | null;
  offerTitle: string | null;
  productId: string | null;
  productName: string | null;
  reason: string;
  suggestedReply: string;
  nextActions: string[];
  alternatives: Array<{
    offerId: string | null;
    offerTitle: string | null;
    productId: string | null;
    productName: string | null;
    reason: string;
  }>;
  confidence: number;
};

type OfferSuggestionResp = {
  aiConfigured: boolean;
  status: string;
  suggestion: OfferSuggestion;
  error?: string | null;
};

export function OfferSuggestionBlock({ conversationId }: { conversationId: string }) {
  const [suggestion, setSuggestion] = useState<OfferSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadSuggestion() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiSend<OfferSuggestionResp>(
        `/api/ai/conversations/${conversationId}/offer-suggestion`,
        "POST"
      );
      setSuggestion(res.suggestion);
      setFallback(!res.aiConfigured || res.status === "AI_NOT_CONFIGURED" || res.status === "SKIPPED");
      if (!res.aiConfigured) setError("AI chưa bật — đang dùng gợi ý quy tắc cơ bản.");
      else if (res.status === "FAILED") setError("AI lỗi tạm thời — đang dùng gợi ý quy tắc cơ bản.");
    } catch (e: any) {
      setError(e?.message ?? "Không lấy được gợi ý ưu đãi.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply() {
    if (!suggestion?.suggestedReply) return;
    try {
      await navigator.clipboard.writeText(suggestion.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  const confidence = suggestion ? Math.round(suggestion.confidence * 100) : null;

  return (
    <ProfileBlock
      id="block-offers"
      title="Ưu đãi / Gợi ý bán hàng"
      icon="gift"
      collapsible
      defaultOpen
      action={
        suggestion ? (
          <button
            type="button"
            onClick={loadSuggestion}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-dark disabled:opacity-50"
          >
            <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
            {loading ? "Đang gợi ý…" : "Gợi ý lại"}
          </button>
        ) : undefined
      }
    >
      {!suggestion ? (
        <BlockEmpty
          text={error ?? "Chưa có ưu đãi phù hợp cho khách này."}
          cta={
            <div className="flex flex-wrap justify-center gap-2">
              <BlockCta icon="sparkles" label={loading ? "Đang gợi ý…" : "AI gợi ý offer"} onClick={loadSuggestion} />
              <BlockCta icon="gift" label="Quản lý ưu đãi" href="/offers" />
            </div>
          }
        />
      ) : (
        <div className="space-y-2.5">
          <div className="rounded-xl bg-brand-light/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Gợi ý nên dùng</p>
                <h4 className="mt-1 text-[13.5px] font-bold text-gray-900">
                  {suggestion.offerTitle ?? suggestion.productName ?? "Chưa đủ dữ liệu offer"}
                </h4>
                {suggestion.productName && (
                  <p className="mt-0.5 text-[12px] text-gray-500">Sản phẩm: {suggestion.productName}</p>
                )}
              </div>
              {confidence !== null && (
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand ring-1 ring-brand/10">
                  {confidence}%
                </span>
              )}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-gray-700">{suggestion.reason}</p>
          </div>

          {suggestion.suggestedReply && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Câu sale có thể dùng</div>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-gray-800">{suggestion.suggestedReply}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-gray-400">AI chỉ gợi ý — sale tự duyệt trước khi gửi.</span>
                <button
                  type="button"
                  onClick={copyReply}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  <InboxIcon name={copied ? "userCheck" : "copy"} className="h-3.5 w-3.5" />
                  {copied ? "Đã chép" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {suggestion.nextActions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bước tiếp theo</p>
              <ul className="mt-1 space-y-1 text-[12.5px] text-gray-700">
                {suggestion.nextActions.slice(0, 4).map((item) => (
                  <li key={item} className="flex gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.alternatives.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestion.alternatives.slice(0, 4).map((item) => (
                <span
                  key={`${item.offerId ?? item.productId ?? item.offerTitle ?? item.productName}-${item.reason}`}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                  title={item.reason}
                >
                  {item.offerTitle ?? item.productName ?? "Phương án khác"}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${fallback ? "bg-amber-400" : "bg-emerald-400"}`} />
            {fallback ? "Gợi ý quy tắc cơ bản" : "Gợi ý bởi AI"}
          </div>
          {error && <p className="text-[11px] text-amber-600">{error}</p>}
        </div>
      )}
    </ProfileBlock>
  );
}
