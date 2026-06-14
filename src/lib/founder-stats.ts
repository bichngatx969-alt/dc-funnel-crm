import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TIMEZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const NON_REVENUE_ORDER_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED"];
const ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "PAID",
  "FULFILLING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"];

export type FounderStatsFilters = {
  range: "today" | "7d" | "30d" | "90d" | "custom";
  from?: string | null;
  to?: string | null;
  compare: "previous" | "none";
  ownerId?: string | null;
  source?: string | null;
};

type DateRange = {
  from: Date;
  to: Date;
  fromDate: string;
  toDate: string;
  timezone: string;
  compareFrom: string | null;
  compareTo: string | null;
  compareFromDate: Date | null;
  compareToDate: Date | null;
};

export function parseFounderStatsFilters(searchParams: URLSearchParams): FounderStatsFilters {
  const rawRange = searchParams.get("range")?.trim().toLowerCase();
  const range = rawRange === "today" || rawRange === "7d" || rawRange === "30d" || rawRange === "90d" || rawRange === "custom"
    ? rawRange
    : "30d";
  return {
    range,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    compare: searchParams.get("compare") === "previous" ? "previous" : "none",
    ownerId: normalizeNullableText(searchParams.get("ownerId")),
    source: normalizeNullableText(searchParams.get("source")),
  };
}

export async function buildFounderStats(params: {
  workspaceId: string;
  filters: FounderStatsFilters;
}) {
  const range = resolveRange(params.filters);
  const base = await buildFounderStatsForRange(params.workspaceId, params.filters, range.from, range.to);
  const comparison =
    params.filters.compare === "previous" && range.compareFromDate && range.compareToDate
      ? await buildFounderStatsForRange(params.workspaceId, params.filters, range.compareFromDate, range.compareToDate)
      : null;

  return {
    range: {
      from: range.fromDate,
      to: range.toDate,
      timezone: range.timezone,
      compareFrom: range.compareFrom,
      compareTo: range.compareTo,
    },
    ...base,
    comparison: comparison
      ? {
          summary: comparison.summary,
        }
      : null,
  };
}

async function buildFounderStatsForRange(
  workspaceId: string,
  filters: FounderStatsFilters,
  from: Date,
  to: Date
) {
  const dateWhere = { gte: from, lt: to };
  const ownerWhere = filters.ownerId ? { ownerId: filters.ownerId === "unassigned" ? null : filters.ownerId } : {};
  const sourceWhere = filters.source ? { source: filters.source } : {};
  const revenueOrderWhere: Prisma.OrderWhereInput = {
    workspaceId,
    deletedAt: null,
    createdAt: dateWhere,
    status: { notIn: NON_REVENUE_ORDER_STATUSES },
    ...ownerWhere,
    ...(filters.source ? { customer: { source: filters.source } } : {}),
  };
  const allOrderWhere: Prisma.OrderWhereInput = {
    workspaceId,
    deletedAt: null,
    createdAt: dateWhere,
    ...ownerWhere,
    ...(filters.source ? { customer: { source: filters.source } } : {}),
  };
  const contactWhere: Prisma.CustomerWhereInput = {
    workspaceId,
    deletedAt: null,
    createdAt: dateWhere,
    ...sourceWhere,
    ...(filters.ownerId ? { ownerId: filters.ownerId === "unassigned" ? null : filters.ownerId } : {}),
  };
  const opportunityRangeWhere: Prisma.OpportunityWhereInput = {
    workspaceId,
    deletedAt: null,
    createdAt: dateWhere,
    ...ownerWhere,
    ...sourceWhere,
  };
  const opportunityCurrentWhere: Prisma.OpportunityWhereInput = {
    workspaceId,
    deletedAt: null,
    ...ownerWhere,
    ...sourceWhere,
  };
  const commentWhere: Prisma.FacebookCommentWhereInput = {
    workspaceId,
    deletedAt: null,
    createdAt: dateWhere,
  };
  const taskBaseWhere: Prisma.TaskWhereInput = {
    workspaceId,
    ...(filters.ownerId ? { assignedToId: filters.ownerId === "unassigned" ? null : filters.ownerId } : {}),
    ...(filters.source ? { customer: { source: filters.source } } : {}),
  };
  const automationWhere: Prisma.AutomationRunWhereInput = {
    workspaceId,
    createdAt: dateWhere,
  };

  const today = resolveRange({ range: "today", compare: "none" });
  const [
    revenueAgg,
    paidRevenueAgg,
    completedRevenueAgg,
    ordersCount,
    paidOrdersCount,
    newContactsCount,
    currentOpenOppAgg,
    commentsCount,
    phoneCommentsCount,
    needsFollowUpCommentsCount,
    overdueTasksCount,
    revenueOrders,
    orderStatusGroups,
    paymentStatusGroups,
    openOpps,
    wonOppAgg,
    lostOppAgg,
    contactsBySourceRaw,
    opportunitiesBySourceRaw,
    ordersForSource,
    salesOrders,
    salesContacts,
    salesOpportunities,
    salesTasks,
    commentsByStatusRaw,
    dueTodayTasksCount,
    completedTasksCount,
    automationRunsCount,
    automationGroups,
    contactStageGroups,
  ] = await Promise.all([
    prisma.order.aggregate({ where: revenueOrderWhere, _sum: { totalVnd: true } }),
    prisma.order.aggregate({ where: { ...allOrderWhere, paymentStatus: "PAID" }, _sum: { totalVnd: true } }),
    prisma.order.aggregate({ where: { ...allOrderWhere, status: "COMPLETED" }, _sum: { totalVnd: true } }),
    prisma.order.count({ where: revenueOrderWhere }),
    prisma.order.count({ where: { ...allOrderWhere, paymentStatus: "PAID" } }),
    prisma.customer.count({ where: contactWhere }),
    prisma.opportunity.aggregate({
      where: { ...opportunityCurrentWhere, status: "OPEN" },
      _count: { _all: true },
      _sum: { valueVnd: true },
    }),
    prisma.facebookComment.count({ where: commentWhere }),
    prisma.facebookComment.count({ where: { ...commentWhere, hasPhone: true } }),
    prisma.facebookComment.count({ where: { ...commentWhere, needsFollowUp: true } }),
    prisma.task.count({ where: { ...taskBaseWhere, status: "TODO", dueAt: { lt: new Date() } } }),
    prisma.order.findMany({
      where: revenueOrderWhere,
      select: { createdAt: true, totalVnd: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: allOrderWhere,
      _count: { _all: true },
      _sum: { totalVnd: true },
    }),
    prisma.order.groupBy({
      by: ["paymentStatus"],
      where: allOrderWhere,
      _count: { _all: true },
      _sum: { totalVnd: true },
    }),
    prisma.opportunity.findMany({
      where: { ...opportunityCurrentWhere, status: "OPEN" },
      select: {
        id: true,
        valueVnd: true,
        stage: { select: { id: true, name: true, position: true, color: true, pipelineId: true } },
        pipeline: { select: { id: true, name: true } },
      },
      take: 5000,
    }),
    prisma.opportunity.aggregate({
      where: { ...opportunityRangeWhere, status: "WON" },
      _count: { _all: true },
      _sum: { valueVnd: true },
    }),
    prisma.opportunity.aggregate({
      where: { ...opportunityRangeWhere, status: "LOST" },
      _count: { _all: true },
      _sum: { valueVnd: true },
    }),
    prisma.customer.groupBy({
      by: ["source"],
      where: contactWhere,
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
      take: 20,
    }),
    prisma.opportunity.groupBy({
      by: ["source"],
      where: opportunityRangeWhere,
      _count: { _all: true },
      _sum: { valueVnd: true },
      orderBy: { _count: { source: "desc" } },
      take: 20,
    }),
    prisma.order.findMany({
      where: allOrderWhere,
      select: { totalVnd: true, customer: { select: { source: true } } },
      take: 5000,
    }),
    prisma.order.groupBy({
      by: ["ownerId"],
      where: allOrderWhere,
      _count: { _all: true },
      _sum: { totalVnd: true },
    }),
    prisma.customer.groupBy({
      by: ["ownerId"],
      where: contactWhere,
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ["ownerId", "status"],
      where: opportunityRangeWhere,
      _count: { _all: true },
      _sum: { valueVnd: true },
    }),
    prisma.task.groupBy({
      by: ["assignedToId", "status"],
      where: { ...taskBaseWhere, updatedAt: dateWhere },
      _count: { _all: true },
    }),
    prisma.facebookComment.groupBy({
      by: ["status"],
      where: commentWhere,
      _count: { _all: true },
    }),
    prisma.task.count({ where: { ...taskBaseWhere, dueAt: { gte: today.from, lt: today.to } } }),
    prisma.task.count({ where: { ...taskBaseWhere, status: "DONE", updatedAt: dateWhere } }),
    prisma.automationRun.count({ where: automationWhere }),
    prisma.automationRun.groupBy({
      by: ["status"],
      where: automationWhere,
      _count: { _all: true },
    }),
    prisma.customer.groupBy({
      by: ["currentStage"],
      where: { workspaceId, deletedAt: null, ...sourceWhere },
      _count: { _all: true },
    }),
  ]);

  const revenueVnd = revenueAgg._sum.totalVnd ?? 0;
  const paidRevenueVnd = paidRevenueAgg._sum.totalVnd ?? 0;
  const completedRevenueVnd = completedRevenueAgg._sum.totalVnd ?? 0;
  const openPipelineValueVnd = currentOpenOppAgg._sum.valueVnd ?? 0;
  const openOpportunitiesCount = currentOpenOppAgg._count._all;

  return {
    summary: {
      revenueVnd,
      paidRevenueVnd,
      completedRevenueVnd,
      ordersCount,
      paidOrdersCount,
      averageOrderValueVnd: ordersCount ? Math.round(revenueVnd / ordersCount) : 0,
      newContactsCount,
      openOpportunitiesCount,
      openPipelineValueVnd,
      commentsCount,
      phoneCommentsCount,
      needsFollowUpCommentsCount,
      overdueTasksCount,
    },
    revenue: {
      byDay: buildRevenueByDay(from, to, revenueOrders),
      byStatus: ORDER_STATUSES.map((status) => {
        const item = orderStatusGroups.find((group) => group.status === status);
        return { status, count: item?._count._all ?? 0, totalVnd: item?._sum.totalVnd ?? 0 };
      }),
      byPaymentStatus: PAYMENT_STATUSES.map((paymentStatus) => {
        const item = paymentStatusGroups.find((group) => group.paymentStatus === paymentStatus);
        return { paymentStatus, count: item?._count._all ?? 0, totalVnd: item?._sum.totalVnd ?? 0 };
      }),
    },
    pipeline: {
      stages: buildStageSummary(openOpps),
      openValueVnd: openPipelineValueVnd,
      wonValueVnd: wonOppAgg._sum.valueVnd ?? 0,
      lostValueVnd: lostOppAgg._sum.valueVnd ?? 0,
      conversion: {
        open: openOpportunitiesCount,
        won: wonOppAgg._count._all,
        lost: lostOppAgg._count._all,
        winRate:
          wonOppAgg._count._all + lostOppAgg._count._all > 0
            ? Math.round((wonOppAgg._count._all / (wonOppAgg._count._all + lostOppAgg._count._all)) * 100)
            : 0,
      },
    },
    sources: {
      contactsBySource: contactsBySourceRaw.map((item) => ({ source: item.source ?? "unknown", count: item._count._all })),
      opportunitiesBySource: opportunitiesBySourceRaw.map((item) => ({
        source: item.source ?? "unknown",
        count: item._count._all,
        valueVnd: item._sum.valueVnd ?? 0,
      })),
      ordersBySource: buildOrdersBySource(ordersForSource),
    },
    sales: {
      byOwner: await buildSalesByOwner(workspaceId, {
        orders: salesOrders,
        contacts: salesContacts,
        opportunities: salesOpportunities,
        tasks: salesTasks,
      }),
    },
    comments: {
      byStatus: commentsByStatusRaw.map((item) => ({ status: item.status, count: item._count._all })),
      phoneComments: phoneCommentsCount,
      needsFollowUp: needsFollowUpCommentsCount,
    },
    contacts: {
      byStage: contactStageGroups.map((item) => ({ stage: item.currentStage, count: item._count._all })),
    },
    tasks: {
      dueToday: dueTodayTasksCount,
      overdue: overdueTasksCount,
      completed: completedTasksCount,
    },
    automation: {
      runs: automationRunsCount,
      success: automationGroups.find((item) => item.status === "SUCCESS")?._count._all ?? 0,
      failed: automationGroups.find((item) => item.status === "FAILED")?._count._all ?? 0,
      skipped: automationGroups.find((item) => item.status === "SKIPPED")?._count._all ?? 0,
    },
  };
}

function resolveRange(filters: Pick<FounderStatsFilters, "range" | "from" | "to" | "compare">): DateRange {
  const todayStart = startOfDayInHoChiMinh();
  let from: Date;
  let to: Date;
  if (filters.range === "custom") {
    from = parseDateOnly(filters.from) ?? todayStart;
    const customTo = parseDateOnly(filters.to);
    to = customTo ? addDays(customTo, 1) : addDays(from, 1);
  } else if (filters.range === "today") {
    from = todayStart;
    to = addDays(todayStart, 1);
  } else {
    const days = filters.range === "7d" ? 7 : filters.range === "90d" ? 90 : 30;
    to = addDays(todayStart, 1);
    from = addDays(to, -days);
  }

  if (to <= from) to = addDays(from, 1);
  const duration = to.getTime() - from.getTime();
  const compareToDate = filters.compare === "previous" ? from : null;
  const compareFromDate = filters.compare === "previous" ? new Date(from.getTime() - duration) : null;

  return {
    from,
    to,
    fromDate: formatDateInHoChiMinh(from),
    toDate: formatDateInHoChiMinh(addDays(to, -1)),
    timezone: TIMEZONE,
    compareFrom: compareFromDate ? formatDateInHoChiMinh(compareFromDate) : null,
    compareTo: compareToDate ? formatDateInHoChiMinh(addDays(compareToDate, -1)) : null,
    compareFromDate,
    compareToDate,
  };
}

function startOfDayInHoChiMinh(now = new Date()): Date {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return new Date(
    Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate()) -
      VIETNAM_OFFSET_MS
  );
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - VIETNAM_OFFSET_MS);
}

function formatDateInHoChiMinh(date: Date): string {
  const vietnamDate = new Date(date.getTime() + VIETNAM_OFFSET_MS);
  const year = vietnamDate.getUTCFullYear();
  const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vietnamDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildRevenueByDay(
  from: Date,
  to: Date,
  orders: Array<{ createdAt: Date; totalVnd: number }>
) {
  const totals = new Map<string, { date: string; revenueVnd: number; ordersCount: number }>();
  for (let cursor = from; cursor < to; cursor = addDays(cursor, 1)) {
    const date = formatDateInHoChiMinh(cursor);
    totals.set(date, { date, revenueVnd: 0, ordersCount: 0 });
  }
  for (const order of orders) {
    const date = formatDateInHoChiMinh(order.createdAt);
    const item = totals.get(date) ?? { date, revenueVnd: 0, ordersCount: 0 };
    item.revenueVnd += order.totalVnd;
    item.ordersCount += 1;
    totals.set(date, item);
  }
  return Array.from(totals.values());
}

function buildStageSummary(
  opportunities: Array<{
    id: string;
    valueVnd: number;
    stage: { id: string; name: string; position: number; color: string | null; pipelineId: string };
    pipeline: { id: string; name: string };
  }>
) {
  const stages = new Map<
    string,
    {
      stageId: string;
      stageName: string;
      pipelineId: string;
      pipelineName: string;
      position: number;
      color: string | null;
      count: number;
      valueVnd: number;
    }
  >();
  for (const opportunity of opportunities) {
    const current = stages.get(opportunity.stage.id) ?? {
      stageId: opportunity.stage.id,
      stageName: opportunity.stage.name,
      pipelineId: opportunity.pipeline.id,
      pipelineName: opportunity.pipeline.name,
      position: opportunity.stage.position,
      color: opportunity.stage.color,
      count: 0,
      valueVnd: 0,
    };
    current.count += 1;
    current.valueVnd += opportunity.valueVnd;
    stages.set(opportunity.stage.id, current);
  }
  return Array.from(stages.values()).sort((a, b) => a.pipelineName.localeCompare(b.pipelineName) || a.position - b.position);
}

function buildOrdersBySource(
  orders: Array<{ totalVnd: number; customer: { source: string | null } }>
) {
  const map = new Map<string, { source: string; count: number; totalVnd: number }>();
  for (const order of orders) {
    const source = order.customer.source ?? "unknown";
    const item = map.get(source) ?? { source, count: 0, totalVnd: 0 };
    item.count += 1;
    item.totalVnd += order.totalVnd;
    map.set(source, item);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 20);
}

async function buildSalesByOwner(
  workspaceId: string,
  data: {
    orders: Array<{ ownerId: string | null; _count: { _all: number }; _sum: { totalVnd: number | null } }>;
    contacts: Array<{ ownerId: string | null; _count: { _all: number } }>;
    opportunities: Array<{
      ownerId: string | null;
      status: "OPEN" | "WON" | "LOST";
      _count: { _all: number };
      _sum: { valueVnd: number | null };
    }>;
    tasks: Array<{ assignedToId: string | null; status: "TODO" | "DONE" | "CANCELLED"; _count: { _all: number } }>;
  }
) {
  const ownerIds = new Set<string>();
  for (const item of data.orders) if (item.ownerId) ownerIds.add(item.ownerId);
  for (const item of data.contacts) if (item.ownerId) ownerIds.add(item.ownerId);
  for (const item of data.opportunities) if (item.ownerId) ownerIds.add(item.ownerId);
  for (const item of data.tasks) if (item.assignedToId) ownerIds.add(item.assignedToId);

  const users = ownerIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(ownerIds) }, workspaceMemberships: { some: { workspaceId } } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const buckets = new Map<
    string,
    {
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
    }
  >();

  function bucket(ownerId: string | null) {
    const key = ownerId ?? "unassigned";
    const user = ownerId ? userMap.get(ownerId) : null;
    const existing = buckets.get(key);
    if (existing) return existing;
    const created = {
      ownerId,
      ownerName: user?.name ?? user?.email ?? "Unassigned",
      ownerEmail: user?.email ?? null,
      revenueVnd: 0,
      ordersCount: 0,
      newContactsCount: 0,
      openOpportunitiesCount: 0,
      wonOpportunitiesCount: 0,
      lostOpportunitiesCount: 0,
      openPipelineValueVnd: 0,
      tasksTodo: 0,
      tasksDone: 0,
    };
    buckets.set(key, created);
    return created;
  }

  for (const item of data.orders) {
    const current = bucket(item.ownerId);
    current.ordersCount += item._count._all;
    current.revenueVnd += item._sum.totalVnd ?? 0;
  }
  for (const item of data.contacts) bucket(item.ownerId).newContactsCount += item._count._all;
  for (const item of data.opportunities) {
    const current = bucket(item.ownerId);
    if (item.status === "OPEN") {
      current.openOpportunitiesCount += item._count._all;
      current.openPipelineValueVnd += item._sum.valueVnd ?? 0;
    }
    if (item.status === "WON") current.wonOpportunitiesCount += item._count._all;
    if (item.status === "LOST") current.lostOpportunitiesCount += item._count._all;
  }
  for (const item of data.tasks) {
    const current = bucket(item.assignedToId);
    if (item.status === "TODO") current.tasksTodo += item._count._all;
    if (item.status === "DONE") current.tasksDone += item._count._all;
  }

  return Array.from(buckets.values()).sort((a, b) => b.revenueVnd - a.revenueVnd || b.ordersCount - a.ordersCount);
}

function normalizeNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
