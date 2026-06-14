// Kiểu UI-local cho Founder Stats, theo API contract mục 16.7 (Codex sở hữu shape backend).

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "90d", label: "90 ngày" },
  { key: "custom", label: "Tùy chọn" },
];

export type Summary = {
  revenueVnd: number;
  paidRevenueVnd: number;
  completedRevenueVnd: number;
  ordersCount: number;
  paidOrdersCount: number;
  averageOrderValueVnd: number;
  newContactsCount: number;
  openOpportunitiesCount: number;
  openPipelineValueVnd: number;
  commentsCount: number;
  phoneCommentsCount: number;
  needsFollowUpCommentsCount: number;
  overdueTasksCount: number;
};

export type FounderStats = {
  range: { from: string; to: string; timezone: string; compareFrom: string | null; compareTo: string | null };
  summary: Summary;
  revenue: {
    byDay: { date: string; revenueVnd: number; ordersCount: number }[];
    byStatus: { status: string; count: number; totalVnd: number }[];
    byPaymentStatus: { paymentStatus: string; count: number; totalVnd: number }[];
  };
  pipeline: {
    stages: {
      stageId: string;
      stageName: string;
      pipelineId: string;
      pipelineName: string;
      position: number;
      color: string | null;
      count: number;
      valueVnd: number;
    }[];
    openValueVnd: number;
    wonValueVnd: number;
    lostValueVnd: number;
    conversion: { open: number; won: number; lost: number; winRate: number };
  };
  sources: {
    contactsBySource: { source: string; count: number }[];
    opportunitiesBySource: { source: string; count: number; valueVnd: number }[];
    ordersBySource: { source: string; count: number; totalVnd: number }[];
  };
  sales: {
    byOwner: {
      ownerId: string | null;
      ownerName: string;
      ownerEmail: string | null;
      revenueVnd: number;
      ordersCount: number;
      newContactsCount: number;
      openOpportunitiesCount: number;
      wonOpportunitiesCount: number;
      lostOpportunitiesCount: number;
      openPipelineValueVnd: number;
      tasksTodo: number;
      tasksDone: number;
    }[];
  };
  comments: {
    byStatus: { status: string; count: number }[];
    phoneComments: number;
    needsFollowUp: number;
  };
  contacts: { byStage: { stage: string; count: number }[] };
  tasks: { dueToday: number; overdue: number; completed: number };
  automation: { runs: number; success: number; failed: number; skipped: number };
  comparison: { summary: Summary } | null;
};

// Format ngắn gọn cho trục biểu đồ (vd 1.2tr, 350k) — chỉ dùng cho nhãn nhỏ.
export function compactVnd(value: number): string {
  const n = Math.round(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

// % thay đổi so với kỳ trước (cho card có compare).
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function fmtDayLabel(iso: string): string {
  // iso = YYYY-MM-DD
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}
