"use client";

import { Icon } from "@/components/layout/icons";

export type ProductAudit = {
  completenessScore: number;
  missingFields: string[];
  targetSegments: string[];
  painPoints: string[];
  benefits: string[];
  faqSuggestions: string[];
  objectionHandling: string[];
  offerIdeas: string[];
  contentAngles: string[];
  salesScriptSuggestions: string[];
  nextActions: string[];
  aiConfigured?: boolean;
  fallback?: boolean;
};

export type AuditProduct = {
  id: string;
  name: string;
  aiAuditScore: number | null;
  aiAuditedAt: string | null;
  aiAuditJson: ProductAudit | null;
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function ListSection({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: "neutral" | "warn" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="py-2">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed text-gray-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "warn" ? "bg-amber-400" : "bg-gray-300"}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductAuditPanel({
  product,
  audit,
  auditing,
  aiEnabled,
  onAudit,
}: {
  product: AuditProduct;
  audit: ProductAudit | null;
  auditing: boolean;
  aiEnabled: boolean;
  onAudit: () => void;
}) {
  const score = audit?.completenessScore ?? product.aiAuditScore;
  const fallback = audit?.fallback ?? false;

  return (
    <div className="flex h-full flex-col">
      {/* Header + score + nút kiểm tra */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-gray-900">{product.name}</h3>
          <p className="text-[11px] text-gray-400">
            {product.aiAuditedAt ? `Kiểm tra lần cuối: ${new Date(product.aiAuditedAt).toLocaleString("vi-VN")}` : "Chưa kiểm tra AI"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {score != null && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreTone(score)}`}>{score}%</div>
              <div className="text-[10px] text-gray-400">độ đầy đủ</div>
            </div>
          )}
          <button
            onClick={onAudit}
            disabled={auditing}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:shadow disabled:opacity-60"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            {auditing ? "Đang kiểm tra…" : score != null ? "Kiểm tra lại" : "AI kiểm tra"}
          </button>
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-4 py-2">
        {!audit ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-400">
              <Icon name="sparkles" className="h-6 w-6" />
            </span>
            <p className="text-[13px] font-medium text-gray-600">Chưa có kết quả AI cho sản phẩm này.</p>
            <p className="max-w-xs text-[12px] text-gray-400">
              Bấm “AI kiểm tra” để AI chỉ ra thông tin còn thiếu, phân khúc khách, pain point, FAQ, xử lý phản đối, ý tưởng offer và sales script.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {!aiEnabled || fallback ? (
              <div className="flex items-center gap-1.5 py-2 text-[11px] text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Phân tích quy tắc cơ bản (AI chưa bật hoặc lỗi tạm) — không phải dữ liệu giả.
              </div>
            ) : null}
            <ListSection title="Thông tin còn thiếu" items={audit.missingFields} tone="warn" />
            <ListSection title="Phân khúc khách đề xuất" items={audit.targetSegments} />
            <ListSection title="Pain points" items={audit.painPoints} />
            <ListSection title="Lợi ích / USP" items={audit.benefits} />
            <ListSection title="FAQ gợi ý" items={audit.faqSuggestions} />
            <ListSection title="Xử lý phản đối" items={audit.objectionHandling} />
            <ListSection title="Ý tưởng offer / combo" items={audit.offerIdeas} />
            <ListSection title="Content angles" items={audit.contentAngles} />
            <ListSection title="Sales script gợi ý" items={audit.salesScriptSuggestions} />
            <ListSection title="Việc nên làm" items={audit.nextActions} tone="warn" />
          </div>
        )}
      </div>
    </div>
  );
}
