"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { ProfileBlock } from "./ProfileBlock";
import { InboxIcon } from "../icons";

type Insight = {
  buyingIntent: string | null;
  funnelStage: string | null;
  communicationStyle: string | null;
  sentiment: string | null;
  customerSegment: string | null;
  mainNeed: string | null;
  objectionsJson: string[] | null;
  productsInterestedJson: string[] | null;
  missingDataJson: string[] | null;
  nextBestAction: string | null;
  recommendedOffer: string | null;
  suggestedReply: string | null;
  confidence: number | null;
  modelName: string | null;
  updatedAt: string | null;
  rawJson?: { fallback?: boolean } | null;
};

type AnalyzeResp = {
  aiConfigured: boolean;
  status: string;
  insight: Insight | null;
  error?: string | null;
};

const INTENT_TONE: Record<string, string> = {
  "Lạnh": "bg-sky-100 text-sky-700",
  "Ấm": "bg-amber-100 text-amber-800",
  "Nóng": "bg-orange-100 text-orange-800",
  "Sẵn sàng chốt": "bg-rose-100 text-rose-700",
};

function Chip({ children, tone = "bg-gray-100 text-gray-600" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{children}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex flex-col gap-1 py-1">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-[12.5px] font-medium text-gray-700">{value}</span>
    </div>
  );
}

// AI Insight: dùng API thật của Codex (analyze/insight). Có fallback rule-based khi
// thiếu OPENAI_API_KEY (vẫn là phân tích thật, không fake). AI chỉ gợi ý — sale quyết định.
export function AiInsightBlock({
  conversationId,
  aiEnabled,
  onCreateTask,
}: {
  conversationId: string;
  aiEnabled: boolean;
  onCreateTask?: (title: string) => void | Promise<void>;
}) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCache, setLoadingCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  // Tải insight đã cache (rẻ) khi mở hội thoại — KHÔNG tự gọi AI.
  const loadCached = useCallback(async () => {
    setLoadingCache(true);
    setError(null);
    setInsight(null);
    setFallback(false);
    try {
      const d = await apiGet<{ insight: Insight | null }>(`/api/ai/conversations/${conversationId}/insight`);
      if (d.insight) {
        setInsight(d.insight);
        setFallback(Boolean(d.insight.rawJson?.fallback));
      }
    } catch {
      /* chưa có insight — bỏ qua */
    } finally {
      setLoadingCache(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadCached();
  }, [loadCached]);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiSend<AnalyzeResp>(`/api/ai/conversations/${conversationId}/analyze`, "POST");
      if (res.insight) {
        setInsight(res.insight);
        setFallback(!res.aiConfigured || Boolean(res.insight.rawJson?.fallback));
      }
      if (!res.aiConfigured) setError("AI chưa bật (thiếu OPENAI_API_KEY) — đang dùng phân tích quy tắc cơ bản.");
      else if (res.status === "FAILED") setError("AI lỗi tạm thời — đang hiển thị phân tích quy tắc cơ bản.");
    } catch (e: any) {
      setError(e?.message ?? "Không phân tích được hội thoại.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply() {
    if (!insight?.suggestedReply) return;
    try {
      await navigator.clipboard.writeText(insight.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  async function createTaskFromAction() {
    if (!insight?.nextBestAction || !onCreateTask) return;
    await onCreateTask(insight.nextBestAction.slice(0, 140));
    setTaskDone(true);
    setTimeout(() => setTaskDone(false), 1500);
  }

  const pct = insight?.confidence != null ? Math.round(insight.confidence * 100) : null;

  return (
    <ProfileBlock
      id="block-ai"
      title="AI Insight"
      icon="sparkles"
      collapsible
      defaultOpen
      action={
        insight ? (
          <button
            onClick={analyze}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50"
          >
            <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
            {loading ? "Đang phân tích…" : "Phân tích lại"}
          </button>
        ) : undefined
      }
    >
      {loadingCache ? (
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      ) : !insight ? (
        // Chưa có insight → CTA phân tích (API thật, có fallback rule-based)
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-center">
          <p className="text-[12.5px] text-violet-700/80">
            Phân tích tín hiệu hội thoại: mức độ mua, nhu cầu, phản đối, offer nên dùng, việc nên làm tiếp.
          </p>
          <button
            onClick={analyze}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
          >
            <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
            {loading ? "Đang phân tích…" : "Phân tích hội thoại"}
          </button>
          {!aiEnabled && (
            <p className="mt-1.5 text-[11px] text-violet-500/70">
              AI chưa bật — sẽ dùng phân tích quy tắc cơ bản (không phải fake).
            </p>
          )}
          {error && <p className="mt-1.5 text-[11px] text-rose-500">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Hàng chỉ dấu chính */}
          <div className="flex flex-wrap items-center gap-1.5">
            {insight.buyingIntent && (
              <Chip tone={INTENT_TONE[insight.buyingIntent] ?? "bg-violet-100 text-violet-700"}>
                {insight.buyingIntent}
              </Chip>
            )}
            {insight.funnelStage && <Chip tone="bg-indigo-50 text-indigo-700">{insight.funnelStage}</Chip>}
            {insight.sentiment && <Chip>{insight.sentiment}</Chip>}
            {insight.communicationStyle && insight.communicationStyle !== "chưa rõ" && (
              <Chip tone="bg-gray-100 text-gray-600">DISC: {insight.communicationStyle}</Chip>
            )}
            {pct != null && (
              <span className="ml-auto text-[11px] text-gray-400">Độ tin cậy {pct}%</span>
            )}
          </div>

          <Field label="Nhu cầu chính" value={insight.mainNeed} />
          <Field label="Phân khúc" value={insight.customerSegment} />
          {insight.objectionsJson && insight.objectionsJson.length > 0 && (
            <Field
              label="Phản đối chính"
              value={
                <span className="flex flex-wrap gap-1">
                  {insight.objectionsJson.map((o) => (
                    <Chip key={o} tone="bg-amber-50 text-amber-700">{o}</Chip>
                  ))}
                </span>
              }
            />
          )}
          {insight.productsInterestedJson && insight.productsInterestedJson.length > 0 && (
            <Field
              label="Sản phẩm quan tâm"
              value={
                <span className="flex flex-wrap gap-1">
                  {insight.productsInterestedJson.map((p) => (
                    <Chip key={p} tone="bg-emerald-50 text-emerald-700">{p}</Chip>
                  ))}
                </span>
              }
            />
          )}
          {insight.missingDataJson && insight.missingDataJson.length > 0 && (
            <Field
              label="Dữ liệu còn thiếu"
              value={
                <span className="flex flex-wrap gap-1">
                  {insight.missingDataJson.map((m) => (
                    <Chip key={m} tone="bg-gray-100 text-gray-500">{m}</Chip>
                  ))}
                </span>
              }
            />
          )}
          <Field label="Offer nên dùng" value={insight.recommendedOffer} />

          {/* Next best action + tạo task */}
          {insight.nextBestAction && (
            <div className="rounded-xl bg-violet-50/70 p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Việc nên làm tiếp</div>
              <p className="mt-1 text-[12.5px] text-gray-700">{insight.nextBestAction}</p>
              {onCreateTask && (
                <button
                  onClick={createTaskFromAction}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  <InboxIcon name={taskDone ? "userCheck" : "calendar"} className="h-3.5 w-3.5" />
                  {taskDone ? "Đã tạo task" : "Tạo task từ gợi ý"}
                </button>
              )}
            </div>
          )}

          {/* Câu trả lời gợi ý */}
          {insight.suggestedReply && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Câu trả lời gợi ý</div>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-gray-800">{insight.suggestedReply}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10.5px] text-gray-400">AI chỉ gợi ý — sale tự duyệt &amp; gửi.</span>
                <button
                  onClick={copyReply}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  <InboxIcon name={copied ? "userCheck" : "copy"} className="h-3.5 w-3.5" />
                  {copied ? "Đã chép" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Footer trạng thái nguồn phân tích */}
          <div className="flex items-center gap-1.5 pt-0.5 text-[10.5px] text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${fallback ? "bg-amber-400" : "bg-emerald-400"}`} />
            {fallback ? "Phân tích quy tắc cơ bản (AI chưa bật/ lỗi tạm)" : "Phân tích bởi AI"}
            {insight.modelName ? ` · ${insight.modelName}` : ""}
          </div>
          {error && <p className="text-[11px] text-amber-600">{error}</p>}
        </div>
      )}
    </ProfileBlock>
  );
}
