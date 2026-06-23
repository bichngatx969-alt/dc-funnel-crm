"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";
import type { DailyIntelligenceReport } from "@/lib/ai/daily-intelligence";

const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "content", label: "Truyền thông" },
  { key: "ads", label: "Ads" },
  { key: "inbox", label: "Inbox" },
  { key: "sales", label: "Sale" },
  { key: "catalog", label: "Catalog" },
  { key: "actions", label: "Việc cần làm" },
  { key: "lessons", label: "Bài học" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type ActionRow = { id: string; title: string; source: string; priority: string; status: string };
type LessonRow = { id: string; source: string; title: string; lesson: string; appliedCount: number };

const BOTTLENECK_TONE: Record<string, string> = {
  "TRUYỀN THÔNG": "bg-violet-100 text-violet-700",
  ADS: "bg-sky-100 text-sky-700",
  SALE: "bg-rose-100 text-rose-700",
  "CATALOG-OFFER": "bg-amber-100 text-amber-800",
  "KHÔNG RÕ": "bg-gray-100 text-gray-600",
};

export function DailyIntelligenceClient() {
  const [date, setDate] = useState("");
  const [report, setReport] = useState<DailyIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [storedActions, setStoredActions] = useState<ActionRow[] | null>(null);
  const [storedLessons, setStoredLessons] = useState<LessonRow[] | null>(null);

  const loadMemory = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([
        apiGet<{ items: ActionRow[] }>("/api/ai/action-items?status=TODO"),
        apiGet<{ items: LessonRow[] }>("/api/ai/lessons"),
      ]);
      setStoredActions(a.items ?? []);
      setStoredLessons(l.items ?? []);
    } catch {
      setStoredActions([]);
      setStoredLessons([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = date ? `?date=${date}` : "";
      const res = await apiGet<{ report: DailyIntelligenceReport }>(`/api/ai/daily-intelligence${qs}`);
      setReport(res.report);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được báo cáo.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  async function regenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiSend<{ report: DailyIntelligenceReport }>("/api/ai/daily-intelligence/generate", "POST", {
        date: date || undefined,
      });
      setReport(res.report);
      void loadMemory();
    } catch (e: any) {
      setError(e?.message ?? "Không tạo được báo cáo.");
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmail() {
    setEmailing(true);
    setEmailMsg(null);
    try {
      const res = await apiSend<{ to: string }>("/api/ai/daily-intelligence/send-email", "POST", { date: date || undefined });
      setEmailMsg(`Đã gửi báo cáo tới ${res.to}`);
    } catch (e: any) {
      setEmailMsg(e?.message ?? "Không gửi được email (kiểm tra cấu hình Resend).");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="dc-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-gray-600">
            <span className="font-medium">Ngày</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </label>
          {date && (
            <button type="button" onClick={() => setDate("")} className="text-[12px] font-medium text-gray-400 hover:text-gray-600">
              Hôm qua
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500 sm:inline-flex">
            <Icon name="automation" className="h-3.5 w-3.5" /> Lịch 8h sáng
          </span>
          <button
            type="button"
            onClick={sendEmail}
            disabled={emailing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Icon name="email" className="h-4 w-4" />
            {emailing ? "Đang gửi..." : "Gửi email"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            {generating ? "Đang tạo..." : "Tạo lại báo cáo"}
          </button>
        </div>
      </div>
      {emailMsg && <p className="dc-card rounded-2xl px-4 py-2 text-[12px] text-gray-600">{emailMsg}</p>}

      {error && (
        <div className="dc-card rounded-2xl p-4 text-[13px] text-rose-500">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      ) : !report ? (
        !error && <div className="dc-card rounded-2xl p-8 text-center text-[13px] text-gray-400">Chưa có báo cáo.</div>
      ) : (
        <>
          <HeroSummary report={report} />

          {/* Tabs */}
          <div className="dc-card overflow-hidden rounded-2xl">
            <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-gray-100 p-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${tab === t.key ? "bg-brand-light text-brand" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === "overview" && <OverviewTab report={report} />}
              {tab === "content" && <ContentTab report={report} />}
              {tab === "ads" && <AdsTab report={report} />}
              {tab === "inbox" && <InboxTab report={report} />}
              {tab === "sales" && <SalesTab report={report} />}
              {tab === "catalog" && <CatalogTab report={report} />}
              {tab === "actions" && <ActionsTab report={report} stored={storedActions} onChanged={loadMemory} />}
              {tab === "lessons" && <LessonsTab report={report} stored={storedLessons} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HeroSummary({ report }: { report: DailyIntelligenceReport }) {
  const s = report.summary;
  return (
    <div className="dc-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BOTTLENECK_TONE[s.mainBottleneck] ?? "bg-gray-100 text-gray-600"}`}>
              Nghẽn: {s.mainBottleneck}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">Ngày {report.reportDate}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
              {report.mode === "rule_based" ? "Phân tích cơ bản" : "AI"}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{s.headline}</h3>
          <p className="mt-1 text-[13px] text-gray-600">
            <span className="font-semibold text-gray-700">Cơ hội: </span>
            {s.mainOpportunity}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing score={s.overallScore} />
          <span className="mt-1 text-[11px] text-gray-400">Điểm tổng</span>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const tone = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${score >= 75 ? "border-emerald-200" : score >= 50 ? "border-amber-200" : "border-rose-200"}`}>
      <span className={`text-xl font-bold ${tone}`}>{score}</span>
    </div>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-gray-900"}`}>{value}</div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-3">
      <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">{title}</h4>
      {items.length === 0 ? (
        <p className="text-[12px] text-gray-400">Chưa có dữ liệu.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-gray-700">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "bad" ? "bg-rose-400" : tone === "good" ? "bg-emerald-400" : "bg-brand"}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OverviewTab({ report }: { report: DailyIntelligenceReport }) {
  const f = report.conversionFunnel;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Doanh thu" value={formatVnd(report.sales.revenueVnd)} hint={`${report.sales.orders} đơn`} tone={report.sales.revenueVnd > 0 ? "good" : undefined} />
        <StatCard label="Nhu cầu (cmt+inbox)" value={f.demandSignals} />
        <StatCard label="Tín hiệu SĐT" value={f.phoneSignals} tone={f.phoneSignals > 0 ? "good" : undefined} />
        <StatCard label="Cần follow-up" value={report.inbox.needsFollowUp} tone={report.inbox.needsFollowUp > 0 ? "warn" : undefined} />
      </div>

      <div className="rounded-2xl border border-gray-100 p-3">
        <h4 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-500">Phễu chuyển đổi (dữ liệu nội bộ)</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <FunnelStep label="Nhu cầu → SĐT" value={`${f.demandToPhoneRate}%`} />
          <FunnelStep label="SĐT → Đơn" value={`${f.phoneToOrderRate}%`} />
          <FunnelStep label="Nhu cầu → Đơn" value={`${f.demandToOrderRate}%`} />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 p-3">
        <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">Nguồn khách &amp; đơn (ước tính)</h4>
        {report.attribution.byChannel.length === 0 ? (
          <p className="text-[12px] text-gray-400">Chưa có dữ liệu nguồn để phân bổ.</p>
        ) : (
          <div className="space-y-1.5">
            {report.attribution.byChannel.map((c) => (
              <div key={c.channel} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
                <span className="font-semibold text-gray-700">{c.label}</span>
                <span className="text-gray-500">
                  {c.contacts} khách · {c.orders} đơn · {formatVnd(c.revenueVnd)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[10.5px] text-gray-400">{report.attribution.note}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListBlock title="Điểm mạnh" items={report.strengths} tone="good" />
        <ListBlock title="Điểm yếu" items={report.weaknesses} tone="bad" />
      </div>

      <div className="rounded-2xl border border-gray-100 p-3">
        <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">Điểm nghẽn</h4>
        {report.bottlenecks.length === 0 ? (
          <p className="text-[12px] text-gray-400">Không phát hiện điểm nghẽn rõ rệt.</p>
        ) : (
          <ul className="space-y-2">
            {report.bottlenecks.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${BOTTLENECK_TONE[b.area] ?? "bg-gray-100 text-gray-600"}`}>{b.area}</span>
                <span className="text-[13px] text-gray-700">{b.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

function ContentTab({ report }: { report: DailyIntelligenceReport }) {
  const o = report.organic;
  return (
    <div className="space-y-4">
      {report.contentInsightsStatus !== "FULL" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          Reach/impressions từ Meta chưa có (thiếu Page insights permission). Đang dùng bài đăng + comment nội bộ — trạng thái PARTIAL.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Số bài đăng" value={o.postCount} />
        <StatCard label="Comment" value={o.commentCount} />
        <StatCard label="Comment có SĐT" value={o.phoneComments} tone={o.phoneComments > 0 ? "good" : undefined} />
        <StatCard label="Reach" value={o.reach ?? "—"} hint={o.reach == null ? "Chưa có dữ liệu" : undefined} />
      </div>
      <ListBlock title="Gợi ý nội dung" items={o.recommendations} />
      <div className="rounded-2xl border border-gray-100 p-3">
        <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">Bài đăng hôm qua</h4>
        {o.posts.length === 0 ? (
          <p className="text-[12px] text-gray-400">Không có bài đăng nào hôm qua.</p>
        ) : (
          <ul className="space-y-2">
            {o.posts.map((p) => (
              <li key={p.id} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="line-clamp-2 text-[13px] text-gray-700">{p.message || "(không có nội dung text)"}</p>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-brand hover:underline">
                    Xem bài
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdsTab({ report }: { report: DailyIntelligenceReport }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-400">
          <Icon name="integrations" className="h-6 w-6" />
        </span>
        <p className="text-[13px] font-medium text-gray-600">Chưa kết nối Meta Ads Manager</p>
        <p className="max-w-[26rem] text-[12px] text-gray-400">{report.ads.note}</p>
        <a href="/settings/integrations/facebook" className="mt-1 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark">
          Kết nối Meta Ads
        </a>
      </div>
      <ListBlock title="Gợi ý ads" items={report.ads.recommendations} />
    </div>
  );
}

function InboxTab({ report }: { report: DailyIntelligenceReport }) {
  const i = report.inbox;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Hội thoại mới" value={i.newConversations} />
        <StatCard label="Tin nhắn đến" value={i.inboundMessages} />
        <StatCard label="Comment mới" value={i.newComments} />
        <StatCard label="SĐT thu được" value={i.phoneCaptured} tone={i.phoneCaptured > 0 ? "good" : undefined} />
        <StatCard label="Cần follow-up" value={i.needsFollowUp} tone={i.needsFollowUp > 0 ? "warn" : undefined} />
        <StatCard label="Task quá hạn" value={i.overdueTasks} tone={i.overdueTasks > 0 ? "bad" : undefined} />
      </div>
      <p className="text-[12px] text-gray-400">{i.note}</p>
    </div>
  );
}

function SalesTab({ report }: { report: DailyIntelligenceReport }) {
  const s = report.sales;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Đơn" value={s.orders} tone={s.orders > 0 ? "good" : undefined} />
        <StatCard label="Doanh thu" value={formatVnd(s.revenueVnd)} />
        <StatCard label="AOV" value={s.averageOrderValueVnd > 0 ? formatVnd(s.averageOrderValueVnd) : "—"} />
        <StatCard label="Khách mới" value={s.newContacts} />
        <StatCard label="Pipeline mở" value={formatVnd(s.openPipelineValueVnd)} />
        <StatCard
          label="So với hôm trước"
          value={s.revenueDeltaVnd == null ? "—" : `${s.revenueDeltaVnd >= 0 ? "+" : ""}${formatVnd(s.revenueDeltaVnd)}`}
          tone={s.revenueDeltaVnd == null ? undefined : s.revenueDeltaVnd >= 0 ? "good" : "bad"}
        />
      </div>
    </div>
  );
}

function CatalogTab({ report }: { report: DailyIntelligenceReport }) {
  const c = report.catalog;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Đang bán" value={c.activeItems} />
        <StatCard label="Bản nháp" value={c.draftItems} />
        <StatCard label="Thiếu ảnh" value={c.missingImageItems} tone={c.missingImageItems > 0 ? "warn" : undefined} />
        <StatCard label="Offer active" value={c.activeOffers} tone={c.activeOffers === 0 ? "warn" : undefined} />
      </div>
      <p className="text-[12px] text-gray-400">{c.note}</p>
    </div>
  );
}

const PRIORITY_TONE: Record<string, string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-gray-100 text-gray-600",
};

function ActionsTab({
  report,
  stored,
  onChanged,
}: {
  report: DailyIntelligenceReport;
  stored: ActionRow[] | null;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: "DONE" | "DISMISSED") {
    setBusyId(id);
    try {
      await apiSend(`/api/ai/action-items/${id}`, "PATCH", { status });
      onChanged();
    } catch {
      // im lặng — UI sẽ tự refetch lần sau
    } finally {
      setBusyId(null);
    }
  }

  // Nếu đã có action queue lưu trữ (sau khi apply migration + generate) → tương tác được.
  if (stored && stored.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-gray-400">Action queue (lưu trữ) — đánh dấu xong hoặc bỏ qua.</p>
        {stored.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_TONE[a.priority] ?? "bg-gray-100 text-gray-600"}`}>{a.priority}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-gray-800">{a.title}</p>
              <p className="text-[11px] text-gray-400">{a.source}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" disabled={busyId === a.id} onClick={() => setStatus(a.id, "DONE")} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Xong</button>
              <button type="button" disabled={busyId === a.id} onClick={() => setStatus(a.id, "DISMISSED")} className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-400 hover:bg-gray-100 disabled:opacity-50">Bỏ qua</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: action items tính trực tiếp (chưa lưu trữ / chưa apply migration).
  return (
    <div className="space-y-2">
      {report.actionItems.length === 0 ? (
        <p className="text-[12px] text-gray-400">Không có việc cần làm nổi bật.</p>
      ) : (
        report.actionItems.map((a, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_TONE[a.priority] ?? "bg-gray-100 text-gray-600"}`}>{a.priority}</span>
            <div className="min-w-0">
              <p className="text-[13px] text-gray-800">{a.title}</p>
              <p className="text-[11px] text-gray-400">{a.source}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function LessonsTab({ report, stored }: { report: DailyIntelligenceReport; stored: LessonRow[] | null }) {
  if (stored && stored.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-gray-400">Thư viện bài học (tích lũy nhiều ngày).</p>
        {stored.map((l) => (
          <div key={l.id} className="rounded-xl border border-gray-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-gray-800">{l.lesson}</span>
              {l.appliedCount > 1 && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">lặp {l.appliedCount}×</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ListBlock title="Bài học hôm qua" items={report.lessons} />
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-[12px] text-gray-400">
        Thư viện bài học tích lũy + phát hiện vấn đề lặp lại sẽ hiện ở đây sau khi báo cáo được lưu (cron 8h hoặc bấm “Tạo lại”).
      </p>
    </div>
  );
}
