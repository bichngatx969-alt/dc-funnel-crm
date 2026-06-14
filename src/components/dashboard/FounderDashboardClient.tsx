"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";
import { formatVnd } from "@/components/money";
import { StageBadge } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/components/orders/types";
import { COMMENT_STATUS_LABEL } from "@/components/comments/types";
import {
  RANGE_OPTIONS,
  compactVnd,
  deltaPercent,
  fmtDayLabel,
  type FounderStats,
  type RangeKey,
} from "@/components/dashboard/types";

const QUICK_LINKS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/orders", label: "Đơn hàng" },
  { href: "/contacts", label: "Khách hàng" },
  { href: "/comments", label: "Bình luận" },
  { href: "/automation", label: "Tự động hóa" },
];

export function FounderDashboardClient() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [compare, setCompare] = useState(false);
  const [data, setData] = useState<FounderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (range === "custom" && (!appliedFrom || !appliedTo)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ range });
    if (compare) params.set("compare", "previous");
    if (range === "custom") {
      params.set("from", appliedFrom);
      params.set("to", appliedTo);
    }
    try {
      const res = await apiGet<FounderStats>(`/api/stats/founder?${params.toString()}`);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được số liệu");
    } finally {
      setLoading(false);
    }
  }, [range, compare, appliedFrom, appliedTo]);

  useEffect(() => {
    load();
  }, [load]);

  const prev = data?.comparison?.summary ?? null;

  return (
    <div className="space-y-4">
      {/* Bộ lọc thời gian + compare */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                range === r.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4" />
          So với kỳ trước
        </label>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Từ ngày</span>
            <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Đến ngày</span>
            <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
          </label>
          <button
            onClick={() => {
              setAppliedFrom(fromInput);
              setAppliedTo(toInput);
            }}
            disabled={!fromInput || !toInput}
            className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Áp dụng
          </button>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full border px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            {l.label} →
          </Link>
        ))}
      </div>

      {data?.range && (
        <p className="text-xs text-gray-400">
          Kỳ: {data.range.from} → {data.range.to} ({data.range.timezone})
          {compare && data.range.compareFrom ? ` · so với ${data.range.compareFrom} → ${data.range.compareTo}` : ""}
        </p>
      )}

      {range === "custom" && (!appliedFrom || !appliedTo) ? (
        <EmptyState title="Chọn khoảng thời gian" description="Chọn Từ ngày và Đến ngày rồi bấm Áp dụng để xem số liệu." />
      ) : error ? (
        <div className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={load} className="shrink-0 rounded border border-rose-300 px-2 py-1 text-xs hover:bg-rose-100">Thử lại</button>
        </div>
      ) : loading ? (
        <DashboardSkeleton />
      ) : data ? (
        <DashboardBody data={data} prev={prev} />
      ) : null}
    </div>
  );
}

function DashboardBody({ data, prev }: { data: FounderStats; prev: FounderStats["summary"] | null }) {
  const s = data.summary;
  const isAllEmpty =
    s.ordersCount === 0 &&
    s.newContactsCount === 0 &&
    s.commentsCount === 0 &&
    s.openOpportunitiesCount === 0 &&
    data.automation.runs === 0 &&
    data.tasks.dueToday === 0 &&
    data.tasks.overdue === 0 &&
    data.tasks.completed === 0;

  if (isAllEmpty) {
    return (
      <EmptyState
        icon="📊"
        title="Chưa có dữ liệu trong kỳ này"
        description="Khi có khách, đơn hàng, bình luận hay automation chạy, số liệu sẽ hiện ở đây. Thử đổi khoảng thời gian."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Doanh thu" value={formatVnd(s.revenueVnd)} accent="text-emerald-600" delta={deltaPercent(s.revenueVnd, prev?.revenueVnd ?? 0)} show={!!prev} />
        <Card label="Đã thanh toán" value={formatVnd(s.paidRevenueVnd)} accent="text-emerald-700" sub={`${s.paidOrdersCount} đơn đã trả`} />
        <Card label="Đơn hàng" value={String(s.ordersCount)} accent="text-indigo-600" delta={deltaPercent(s.ordersCount, prev?.ordersCount ?? 0)} show={!!prev} />
        <Card label="Giá trị TB/đơn" value={formatVnd(s.averageOrderValueVnd)} />
        <Card label="Khách mới" value={String(s.newContactsCount)} accent="text-sky-600" delta={deltaPercent(s.newContactsCount, prev?.newContactsCount ?? 0)} show={!!prev} />
        <Card label="Pipeline đang mở" value={formatVnd(s.openPipelineValueVnd)} sub={`${s.openOpportunitiesCount} cơ hội`} />
        <Card label="Comment có SĐT" value={String(s.phoneCommentsCount)} accent="text-emerald-600" sub={`/${s.commentsCount} bình luận`} />
        <Card label="Việc quá hạn" value={String(s.overdueTasksCount)} accent={s.overdueTasksCount > 0 ? "text-rose-600" : "text-gray-900"} />
      </div>

      {/* Doanh thu */}
      <Section title="Doanh thu">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500">Theo ngày</div>
            <DayBars byDay={data.revenue.byDay} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500">Theo trạng thái đơn</div>
              <BarList items={data.revenue.byStatus.filter((x) => x.count > 0).map((x) => ({ label: ORDER_STATUS_LABEL[x.status] ?? x.status, value: x.totalVnd, note: `${x.count} đơn` }))} money />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500">Theo thanh toán</div>
              <BarList items={data.revenue.byPaymentStatus.filter((x) => x.count > 0).map((x) => ({ label: PAYMENT_STATUS_LABEL[x.paymentStatus] ?? x.paymentStatus, value: x.totalVnd, note: `${x.count} đơn` }))} money />
            </div>
          </div>
        </div>
      </Section>

      {/* Pipeline */}
      <Section title="Pipeline" link={{ href: "/pipeline", label: "Mở Pipeline" }}>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Đang mở" value={formatVnd(data.pipeline.openValueVnd)} />
          <MiniStat label="Đã thắng" value={formatVnd(data.pipeline.wonValueVnd)} accent="text-emerald-600" />
          <MiniStat label="Đã mất" value={formatVnd(data.pipeline.lostValueVnd)} accent="text-rose-600" />
          <MiniStat label="Tỉ lệ thắng" value={`${data.pipeline.conversion.winRate}%`} />
        </div>
        <BarList
          items={data.pipeline.stages.map((st) => ({ label: st.stageName, value: st.valueVnd, note: `${st.count} · ${st.pipelineName}`, color: st.color ?? undefined }))}
          money
          emptyText="Chưa có cơ hội đang mở."
        />
      </Section>

      {/* Nguồn */}
      <Section title="Theo nguồn">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500">Khách theo nguồn</div>
            <BarList items={data.sources.contactsBySource.map((x) => ({ label: x.source, value: x.count }))} emptyText="—" />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500">Cơ hội theo nguồn</div>
            <BarList items={data.sources.opportunitiesBySource.map((x) => ({ label: x.source, value: x.valueVnd, note: `${x.count}` }))} money emptyText="—" />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-500">Đơn theo nguồn</div>
            <BarList items={data.sources.ordersBySource.map((x) => ({ label: x.source, value: x.totalVnd, note: `${x.count}` }))} money emptyText="—" />
          </div>
        </div>
      </Section>

      {/* Sale */}
      <Section title="Hiệu suất theo nhân viên">
        {data.sales.byOwner.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu theo nhân viên.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2 pr-2 font-medium">Nhân viên</th>
                  <th className="py-2 pr-2 text-right font-medium">Doanh thu</th>
                  <th className="py-2 pr-2 text-right font-medium">Đơn</th>
                  <th className="py-2 pr-2 text-right font-medium">Khách mới</th>
                  <th className="py-2 pr-2 text-right font-medium">Thắng/Mất</th>
                  <th className="py-2 pr-2 text-right font-medium">Việc (chờ/xong)</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.byOwner.map((o) => (
                  <tr key={o.ownerId ?? "unassigned"} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-medium text-gray-900">{o.ownerId ? o.ownerName : "Chưa gán"}</td>
                    <td className="py-2 pr-2 text-right font-semibold text-emerald-700">{formatVnd(o.revenueVnd)}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">{o.ordersCount}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">{o.newContactsCount}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">{o.wonOpportunitiesCount}/{o.lostOpportunitiesCount}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">{o.tasksTodo}/{o.tasksDone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Comment + Task + Automation */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Bình luận" link={{ href: "/comments", label: "Mở" }}>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <MiniStat label="Tổng" value={String(data.comments.byStatus.reduce((a, b) => a + b.count, 0))} />
            <MiniStat label="Có SĐT" value={String(data.comments.phoneComments)} accent="text-emerald-600" />
            <MiniStat label="Cần xử lý" value={String(data.comments.needsFollowUp)} accent="text-rose-600" />
          </div>
          <BarList items={data.comments.byStatus.map((x) => ({ label: COMMENT_STATUS_LABEL[x.status] ?? x.status, value: x.count }))} emptyText="Chưa có bình luận." />
        </Section>

        <Section title="Việc cần làm" link={{ href: "/automation", label: "" }}>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Hôm nay" value={String(data.tasks.dueToday)} />
            <MiniStat label="Quá hạn" value={String(data.tasks.overdue)} accent={data.tasks.overdue > 0 ? "text-rose-600" : "text-gray-900"} />
            <MiniStat label="Đã xong" value={String(data.tasks.completed)} accent="text-emerald-600" />
          </div>
        </Section>

        <Section title="Tự động hóa" link={{ href: "/automation", label: "Mở" }}>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Lượt chạy" value={String(data.automation.runs)} />
            <MiniStat label="Thành công" value={String(data.automation.success)} accent="text-emerald-600" />
            <MiniStat label="Lỗi" value={String(data.automation.failed)} accent={data.automation.failed > 0 ? "text-rose-600" : "text-gray-900"} />
            <MiniStat label="Bỏ qua" value={String(data.automation.skipped)} accent="text-amber-600" />
          </div>
        </Section>
      </div>

      {/* Contact theo stage */}
      <Section title="Khách theo giai đoạn" link={{ href: "/contacts", label: "Mở" }}>
        {data.contacts.byStage.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có khách.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.contacts.byStage.map((x) => (
              <div key={x.stage} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                <StageBadge stage={x.stage} />
                <span className="font-bold text-gray-900">{x.count}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------- Helper components ---------- */

function Card({
  label,
  value,
  sub,
  accent,
  delta,
  show,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delta?: number | null;
  show?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${accent ?? "text-gray-900"}`}>{value}</div>
      {show && delta !== null && delta !== undefined && (
        <div className={`mt-0.5 text-[11px] font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% so với kỳ trước
        </div>
      )}
      {sub && <div className="mt-0.5 text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-center">
      <div className={`text-lg font-bold ${accent ?? "text-gray-900"}`}>{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

function Section({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {link && link.label && (
          <Link href={link.href} className="text-xs text-brand hover:underline">
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function BarList({
  items,
  money,
  emptyText,
}: {
  items: { label: string; value: number; note?: string; color?: string }[];
  money?: boolean;
  emptyText?: string;
}) {
  const visible = items.filter((i) => i.value > 0 || i.note);
  if (visible.length === 0) return <p className="text-sm text-gray-400">{emptyText ?? "Chưa có dữ liệu."}</p>;
  const max = Math.max(1, ...visible.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {visible.map((i, idx) => (
        <div key={`${i.label}-${idx}`} className="text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-gray-700">
              {i.label}
              {i.note ? <span className="text-gray-400"> · {i.note}</span> : ""}
            </span>
            <span className="shrink-0 font-medium text-gray-900">{money ? formatVnd(i.value) : i.value}</span>
          </div>
          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${i.color ? "" : "bg-brand"}`}
              style={{
                width: `${Math.max(2, Math.round((i.value / max) * 100))}%`,
                ...(i.color ? { backgroundColor: i.color } : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DayBars({ byDay }: { byDay: { date: string; revenueVnd: number; ordersCount: number }[] }) {
  if (byDay.length === 0) return <p className="text-sm text-gray-400">Chưa có doanh thu.</p>;
  const max = Math.max(1, ...byDay.map((d) => d.revenueVnd));
  const total = byDay.reduce((a, b) => a + b.revenueVnd, 0);
  if (total === 0) return <p className="text-sm text-gray-400">Chưa có doanh thu trong kỳ.</p>;
  return (
    <div>
      <div className="flex h-32 items-end gap-0.5 overflow-x-auto">
        {byDay.map((d) => (
          <div
            key={d.date}
            title={`${fmtDayLabel(d.date)}: ${formatVnd(d.revenueVnd)} · ${d.ordersCount} đơn`}
            className="flex min-w-[6px] flex-1 flex-col justify-end"
          >
            <div
              className="rounded-t bg-brand"
              style={{ height: `${Math.max(2, Math.round((d.revenueVnd / max) * 100))}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{fmtDayLabel(byDay[0].date)}</span>
        <span>Cao nhất: {compactVnd(max)}</span>
        <span>{fmtDayLabel(byDay[byDay.length - 1].date)}</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border bg-white" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border bg-white" />
      <div className="h-40 animate-pulse rounded-xl border bg-white" />
    </div>
  );
}
