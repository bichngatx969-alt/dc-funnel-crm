"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/client";
import { Icon, type IconName } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";

type GrowthBlock = {
  key:
    | "overview"
    | "insights"
    | "bottlenecks"
    | "followUps"
    | "offerTests"
    | "products"
    | "salesTraining"
    | "tomorrowActions";
  title: string;
  status: "GOOD" | "WATCH" | "ACTION";
  summary: string;
  metrics: Record<string, number | string | null>;
  items: string[];
};

type GrowthReport = {
  generatedAt: string;
  mode: "rule_based" | string;
  aiConfigured: boolean;
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  blocks: GrowthBlock[];
};

const RANGE_OPTIONS = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
] as const;

const ICONS: Record<GrowthBlock["key"], IconName> = {
  overview: "dashboard",
  insights: "sparkles",
  bottlenecks: "pipeline",
  followUps: "contacts",
  offerTests: "offers",
  products: "products",
  salesTraining: "team",
  tomorrowActions: "tasks",
};

function statusTone(status: GrowthBlock["status"]) {
  if (status === "GOOD") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "ACTION") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function statusLabel(status: GrowthBlock["status"]) {
  if (status === "GOOD") return "Ổn";
  if (status === "ACTION") return "Cần làm";
  return "Theo dõi";
}

function formatMetric(key: string, value: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && key.toLowerCase().includes("vnd")) return formatVnd(value);
  if (typeof value === "number") return value.toLocaleString("vi-VN");
  return value;
}

export function AiGrowthReport() {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("today");
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<GrowthReport>(`/api/ai/growth-report?range=${range}`);
        if (!cancelled) setReport(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Không tải được AI Growth Report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const blocks = report?.blocks ?? [];
  const attentionCount = useMemo(() => blocks.filter((b) => b.status === "ACTION").length, [blocks]);

  return (
    <div className="space-y-5">
      <div className="dc-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-indigo-100 text-brand">
          <Icon name="sparkles" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-gray-900">AI Growth Optimizer</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Tổng hợp dữ liệu hội thoại, sản phẩm, offer, pipeline và đơn hàng để gợi ý việc nên làm tiếp theo.
          </p>
          {report && (
            <p className="mt-1 text-[11.5px] text-gray-400">
              Kỳ dữ liệu: {new Date(report.range.from).toLocaleDateString("vi-VN")} - {new Date(report.range.to).toLocaleDateString("vi-VN")} · {report.range.timezone}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                range === option.value ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${report?.aiConfigured ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${report?.aiConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
          {report?.aiConfigured ? "AI model" : "Rule-based fallback"}
        </span>
      </div>

      {error && (
        <div className="dc-card rounded-2xl border border-rose-100 bg-rose-50 p-4 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="dc-card rounded-2xl p-8 text-center">
          <Icon name="sparkles" className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-[14px] font-semibold text-gray-700">Chưa đủ dữ liệu để AI tối ưu.</p>
          <p className="mt-1 text-[13px] text-gray-400">
            Hệ thống cần thêm hội thoại, sản phẩm/dịch vụ, offer và đơn hàng để tạo báo cáo hữu ích.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="dc-card rounded-2xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Khối báo cáo</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{blocks.length}</div>
            </div>
            <div className="dc-card rounded-2xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Cần hành động</div>
              <div className="mt-1 text-2xl font-bold text-rose-600">{attentionCount}</div>
            </div>
            <div className="dc-card rounded-2xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Cập nhật</div>
              <div className="mt-1 text-sm font-bold text-gray-900">
                {report ? new Date(report.generatedAt).toLocaleString("vi-VN") : "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => (
              <section key={block.key} className="dc-card flex min-h-[230px] flex-col gap-3 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                      <Icon name={ICONS[block.key]} className="h-[18px] w-[18px]" />
                    </span>
                    <h3 className="text-[14px] font-semibold text-gray-800">{block.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(block.status)}`}>
                    {statusLabel(block.status)}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-gray-600">{block.summary}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(block.metrics).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-gray-50 px-2.5 py-2">
                      <div className="truncate text-[10.5px] text-gray-400">{key}</div>
                      <div className="mt-0.5 truncate text-[12px] font-semibold text-gray-700">{formatMetric(key, value)}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-auto space-y-1.5">
                  {block.items.slice(0, 4).map((item) => (
                    <li key={item} className="flex gap-1.5 text-[12.5px] leading-relaxed text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <p className="px-1 text-[11.5px] text-gray-400">
        Nguyên tắc: AI chỉ phân tích và gợi ý dựa trên dữ liệu trong workspace; không tự động gửi tin,
        không tạo đơn, không đổi stage và không phán xét khách hàng.
      </p>
    </div>
  );
}
