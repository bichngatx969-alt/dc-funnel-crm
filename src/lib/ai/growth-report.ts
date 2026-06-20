import type { FounderStatsFilters } from "@/lib/founder-stats";
import { buildFounderStats } from "@/lib/founder-stats";
import { prisma } from "@/lib/prisma";

export type GrowthReportBlock = {
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

export async function buildAiGrowthReport(params: {
  workspaceId: string;
  filters: FounderStatsFilters;
}) {
  const [stats, products, offers] = await Promise.all([
    buildFounderStats({ workspaceId: params.workspaceId, filters: params.filters }),
    prisma.productLite.findMany({
      where: { workspaceId: params.workspaceId, deletedAt: null, isActive: true },
      orderBy: [{ aiAuditScore: "asc" }, { updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        priceVnd: true,
        aiAuditScore: true,
        aiAuditedAt: true,
      },
    }),
    prisma.offer.findMany({
      where: { workspaceId: params.workspaceId, isActive: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        product: true,
        priority: true,
        priceText: true,
      },
    }),
  ]);

  const blocks = buildBlocks(stats, products, offers);

  return {
    generatedAt: new Date().toISOString(),
    mode: "rule_based",
    aiConfigured: false,
    range: stats.range,
    blocks,
    stats,
  };
}

function buildBlocks(
  stats: Awaited<ReturnType<typeof buildFounderStats>>,
  products: Array<{ id: string; name: string; priceVnd: number; aiAuditScore: number | null; aiAuditedAt: Date | null }>,
  offers: Array<{ id: string; title: string; product: string; priority: number; priceText: string | null }>
): GrowthReportBlock[] {
  const summary = stats.summary;
  const topStage = [...stats.pipeline.stages].sort((a, b) => b.valueVnd - a.valueVnd || b.count - a.count)[0] ?? null;
  const topSource = stats.sources.contactsBySource[0] ?? null;
  const topSale = stats.sales.byOwner[0] ?? null;
  const weakProducts = products.filter((product) => product.aiAuditScore === null || product.aiAuditScore < 70).slice(0, 4);
  const hasAttention =
    summary.overdueTasksCount > 0 ||
    summary.needsFollowUpCommentsCount > 0 ||
    stats.automation.failed > 0 ||
    weakProducts.length > 0;

  return [
    {
      key: "overview",
      title: "Tổng quan tăng trưởng",
      status: summary.revenueVnd > 0 || summary.newContactsCount > 0 ? "GOOD" : "WATCH",
      summary: `Doanh thu ${formatVnd(summary.revenueVnd)}, ${summary.ordersCount} đơn, ${summary.newContactsCount} khách mới trong kỳ.`,
      metrics: {
        revenueVnd: summary.revenueVnd,
        ordersCount: summary.ordersCount,
        averageOrderValueVnd: summary.averageOrderValueVnd,
        newContactsCount: summary.newContactsCount,
      },
      items: [
        `Paid revenue: ${formatVnd(summary.paidRevenueVnd)}.`,
        `Completed revenue: ${formatVnd(summary.completedRevenueVnd)}.`,
        summary.averageOrderValueVnd > 0
          ? `AOV hiện tại: ${formatVnd(summary.averageOrderValueVnd)}.`
          : "Chưa đủ đơn để tính AOV đáng tin.",
      ],
    },
    {
      key: "insights",
      title: "Insight khách hàng",
      status: topSource ? "GOOD" : "WATCH",
      summary: topSource
        ? `Nguồn lead nổi bật: ${topSource.source} (${topSource.count} contact).`
        : "Chưa có nguồn lead đủ rõ trong kỳ.",
      metrics: {
        topSource: topSource?.source ?? null,
        topSourceContacts: topSource?.count ?? 0,
        phoneComments: stats.comments.phoneComments,
        needsFollowUp: stats.comments.needsFollowUp,
      },
      items: [
        `${stats.comments.phoneComments} bình luận có SĐT.`,
        `${stats.comments.needsFollowUp} bình luận cần xử lý.`,
        ...stats.contacts.byStage.slice(0, 3).map((stage) => `Stage ${stage.stage}: ${stage.count} khách.`),
      ],
    },
    {
      key: "bottlenecks",
      title: "Điểm nghẽn pipeline",
      status: stats.pipeline.openValueVnd > 0 ? "ACTION" : "WATCH",
      summary: topStage
        ? `Giá trị mở lớn nhất đang ở stage ${topStage.stageName}: ${formatVnd(topStage.valueVnd)}.`
        : "Chưa có cơ hội mở để xác định điểm nghẽn.",
      metrics: {
        openValueVnd: stats.pipeline.openValueVnd,
        wonValueVnd: stats.pipeline.wonValueVnd,
        lostValueVnd: stats.pipeline.lostValueVnd,
        winRate: stats.pipeline.conversion.winRate,
      },
      items: [
        `Open opportunities: ${stats.pipeline.conversion.open}.`,
        `Win rate kỳ này: ${stats.pipeline.conversion.winRate}%.`,
        topStage ? `Ưu tiên rà stage ${topStage.stageName} (${topStage.count} cơ hội).` : "Tạo pipeline/opportunity để đo phễu rõ hơn.",
      ],
    },
    {
      key: "followUps",
      title: "Follow-up cần xử lý",
      status: summary.overdueTasksCount || summary.needsFollowUpCommentsCount ? "ACTION" : "GOOD",
      summary: `${summary.overdueTasksCount} task quá hạn, ${stats.tasks.dueToday} task tới hạn hôm nay, ${summary.needsFollowUpCommentsCount} comment cần follow-up.`,
      metrics: {
        overdueTasks: summary.overdueTasksCount,
        dueToday: stats.tasks.dueToday,
        completed: stats.tasks.completed,
        needsFollowUpComments: summary.needsFollowUpCommentsCount,
      },
      items: [
        summary.overdueTasksCount ? "Xử lý task quá hạn trước khi tạo campaign mới." : "Không có task quá hạn nổi bật.",
        stats.tasks.dueToday ? "Chốt danh sách task hôm nay theo sale owner." : "Không có task tới hạn hôm nay.",
        summary.needsFollowUpCommentsCount ? "Ưu tiên comment có SĐT vì dễ chuyển đơn nhanh." : "Comment follow-up đang ổn.",
      ],
    },
    {
      key: "offerTests",
      title: "Offer nên test",
      status: offers.length ? "GOOD" : "WATCH",
      summary: offers[0]
        ? `Offer ưu tiên hiện tại: ${offers[0].title} cho ${offers[0].product}.`
        : "Chưa có offer active để test.",
      metrics: {
        activeOffers: offers.length,
        topOfferPriority: offers[0]?.priority ?? 0,
      },
      items: offers.length
        ? offers.slice(0, 4).map((offer) => `${offer.title}${offer.priceText ? ` (${offer.priceText})` : ""} — ${offer.product}.`)
        : ["Tạo ít nhất 1 offer theo sản phẩm chủ lực.", "Gắn triggerTag/stage để Offer Engine chọn chính xác hơn."],
    },
    {
      key: "products",
      title: "Sản phẩm nên đẩy",
      status: weakProducts.length ? "ACTION" : products.length ? "GOOD" : "WATCH",
      summary: weakProducts.length
        ? `${weakProducts.length} sản phẩm cần audit/bổ sung thông tin trước khi đẩy mạnh.`
        : products.length
          ? "Sản phẩm active đã có nền audit tương đối ổn."
          : "Chưa có sản phẩm active.",
      metrics: {
        activeProductsSampled: products.length,
        weakProducts: weakProducts.length,
      },
      items: weakProducts.length
        ? weakProducts.map((product) => `${product.name}: audit score ${product.aiAuditScore ?? "chưa audit"}.`)
        : products.slice(0, 4).map((product) => `${product.name}: ${formatVnd(product.priceVnd)}.`),
    },
    {
      key: "salesTraining",
      title: "Huấn luyện sale",
      status: topSale ? "GOOD" : "WATCH",
      summary: topSale
        ? `${topSale.ownerName} đang dẫn đầu với ${topSale.ordersCount} đơn và ${formatVnd(topSale.revenueVnd)} doanh thu.`
        : "Chưa đủ dữ liệu owner để huấn luyện theo sale.",
      metrics: {
        topOwnerRevenueVnd: topSale?.revenueVnd ?? 0,
        topOwnerOrders: topSale?.ordersCount ?? 0,
      },
      items: stats.sales.byOwner.slice(0, 4).map((sale) => {
        const todoNote = sale.tasksTodo ? `, ${sale.tasksTodo} task TODO` : "";
        return `${sale.ownerName}: ${sale.ordersCount} đơn, ${formatVnd(sale.revenueVnd)}${todoNote}.`;
      }),
    },
    {
      key: "tomorrowActions",
      title: "Việc nên làm ngày mai",
      status: hasAttention ? "ACTION" : "GOOD",
      summary: hasAttention ? "Có vài điểm cần xử lý trước khi mở rộng traffic." : "Nền vận hành đang ổn, có thể tăng nhịp test offer.",
      metrics: {
        attentionScore: [
          summary.overdueTasksCount,
          summary.needsFollowUpCommentsCount,
          stats.automation.failed,
          weakProducts.length,
        ].reduce((sum, value) => sum + Number(value), 0),
      },
      items: buildTomorrowActions(stats, weakProducts, offers),
    },
  ];
}

function buildTomorrowActions(
  stats: Awaited<ReturnType<typeof buildFounderStats>>,
  weakProducts: Array<{ name: string; aiAuditScore: number | null }>,
  offers: Array<{ title: string; product: string }>
): string[] {
  const actions: string[] = [];
  if (stats.summary.overdueTasksCount) actions.push(`Dọn ${stats.summary.overdueTasksCount} task quá hạn trước 11h.`);
  if (stats.summary.needsFollowUpCommentsCount) actions.push(`Gọi/nhắn lại ${stats.summary.needsFollowUpCommentsCount} comment cần follow-up.`);
  if (stats.pipeline.stages[0]) actions.push(`Rà stage ${stats.pipeline.stages[0].stageName} và kéo cơ hội có value cao nhất.`);
  if (weakProducts[0]) actions.push(`Audit/bổ sung thông tin cho sản phẩm ${weakProducts[0].name}.`);
  if (offers[0]) actions.push(`Test lại offer ${offers[0].title} với nhóm khách đang hỏi ${offers[0].product}.`);
  if (stats.automation.failed) actions.push(`Kiểm tra ${stats.automation.failed} automation run bị failed.`);
  if (!actions.length) actions.push("Chọn 1 offer chủ lực, 1 sản phẩm chủ lực và 1 nhóm lead để test trong ngày mai.");
  return actions.slice(0, 6);
}

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}
