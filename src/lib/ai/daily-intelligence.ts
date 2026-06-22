import { prisma } from "@/lib/prisma";
import { buildFounderStats } from "@/lib/founder-stats";

// DCOS Daily Intelligence — collector + rule-based generator.
// Compute-on-demand từ dữ liệu internal (không cần bảng mới). Persistence (DailyIntelligenceReport...)
// sẽ bổ sung sau khi schema settle — xem docs/RESUME_CHECKPOINT.md.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type BottleneckArea = "TRUYỀN THÔNG" | "ADS" | "SALE" | "CATALOG-OFFER" | "KHÔNG RÕ";

export type DailyIntelligenceReport = {
  reportDate: string;
  generatedAt: string;
  mode: "rule_based" | "ai";
  aiConfigured: boolean;
  adsStatus: "NOT_CONNECTED" | "PERMISSION_REQUIRED" | "CONNECTED";
  contentInsightsStatus: "PARTIAL" | "NONE" | "FULL";
  persistence: "memory" | "stored";
  summary: {
    headline: string;
    overallScore: number;
    mainBottleneck: BottleneckArea;
    mainOpportunity: string;
  };
  organic: {
    postCount: number;
    reach: number | null;
    engagement: number | null;
    commentCount: number;
    phoneComments: number;
    inboxGenerated: number | null;
    posts: Array<{ id: string; message: string | null; permalink: string | null; createdAt: string }>;
    recommendations: string[];
  };
  ads: {
    status: "NOT_CONNECTED" | "PERMISSION_REQUIRED" | "CONNECTED";
    spendVnd: number;
    messages: number;
    costPerMessageVnd: number | null;
    note: string;
    recommendations: string[];
  };
  inbox: {
    newConversations: number;
    inboundMessages: number;
    newComments: number;
    phoneCaptured: number;
    needsFollowUp: number;
    overdueTasks: number;
    note: string;
  };
  sales: {
    orders: number;
    revenueVnd: number;
    averageOrderValueVnd: number;
    newContacts: number;
    openPipelineValueVnd: number;
    revenueDeltaVnd: number | null;
  };
  catalog: {
    activeItems: number;
    draftItems: number;
    missingImageItems: number;
    activeOffers: number;
    note: string;
  };
  conversionFunnel: {
    demandSignals: number;
    phoneSignals: number;
    orders: number;
    demandToPhoneRate: number;
    phoneToOrderRate: number;
    demandToOrderRate: number;
  };
  strengths: string[];
  weaknesses: string[];
  bottlenecks: Array<{ area: BottleneckArea; detail: string }>;
  actionItems: Array<{ title: string; priority: "HIGH" | "MEDIUM" | "LOW"; source: string }>;
  contentRecommendations: string[];
  adsRecommendations: string[];
  lessons: string[];
};

export function resolveYesterdayRange(dateStr?: string | null): { from: Date; to: Date; dateStr: string } {
  let dayStart: Date;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    dayStart = new Date(Date.UTC(y, m - 1, d) - VN_OFFSET_MS);
  } else {
    const nowVn = new Date(Date.now() + VN_OFFSET_MS);
    const todayStart = new Date(Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate()) - VN_OFFSET_MS);
    dayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  }
  const to = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { from: dayStart, to, dateStr: formatHcm(dayStart) };
}

function formatHcm(date: Date): string {
  const v = new Date(date.getTime() + VN_OFFSET_MS);
  return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
}

function rate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export async function buildDailyIntelligence(params: {
  workspaceId: string;
  date?: string | null;
}): Promise<DailyIntelligenceReport> {
  const range = resolveYesterdayRange(params.date);
  const dateWhere = { gte: range.from, lt: range.to };

  const [stats, newConversations, inboundMessages, posts, activeItems, draftItems, missingImageItems, activeOffers] =
    await Promise.all([
      buildFounderStats({
        workspaceId: params.workspaceId,
        filters: { range: "custom", from: range.dateStr, to: range.dateStr, compare: "previous" },
      }),
      prisma.conversation.count({ where: { workspaceId: params.workspaceId, createdAt: dateWhere } }),
      prisma.message.count({ where: { workspaceId: params.workspaceId, direction: "INBOUND", createdAt: dateWhere } }),
      prisma.facebookPost.findMany({
        where: { workspaceId: params.workspaceId, createdAt: dateWhere },
        select: { id: true, message: true, permalink: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.catalogItem.count({ where: { workspaceId: params.workspaceId, deletedAt: null, status: "ACTIVE" } }),
      prisma.catalogItem.count({ where: { workspaceId: params.workspaceId, deletedAt: null, status: "DRAFT" } }),
      prisma.catalogItem.count({
        where: { workspaceId: params.workspaceId, deletedAt: null, status: "ACTIVE", coverImageId: null },
      }),
      prisma.offer.count({ where: { workspaceId: params.workspaceId, isActive: true } }),
    ]);

  const summary = stats.summary;
  const prevRevenue = stats.comparison?.summary.revenueVnd ?? null;
  const revenueDeltaVnd = prevRevenue == null ? null : summary.revenueVnd - prevRevenue;

  // Funnel signals (internal data only).
  const demandSignals = newConversations + summary.commentsCount;
  const phoneSignals = summary.phoneCommentsCount;
  const orders = summary.ordersCount;
  const demandToPhoneRate = rate(phoneSignals, demandSignals);
  const phoneToOrderRate = rate(orders, phoneSignals);
  const demandToOrderRate = rate(orders, demandSignals);

  // Bottleneck heuristic.
  const { mainBottleneck, bottlenecks } = detectBottlenecks({
    postCount: posts.length,
    demandSignals,
    phoneSignals,
    orders,
    needsFollowUp: summary.needsFollowUpCommentsCount,
    overdueTasks: summary.overdueTasksCount,
    activeItems,
    missingImageItems,
    activeOffers,
  });

  const strengths = buildStrengths({ stats, demandSignals, orders, postCount: posts.length });
  const weaknesses = buildWeaknesses({
    summary,
    demandSignals,
    orders,
    postCount: posts.length,
    missingImageItems,
    activeOffers,
  });
  const actionItems = buildActionItems({ summary, mainBottleneck, posts: posts.length, missingImageItems, activeOffers });
  const lessons = buildLessons({ mainBottleneck, summary, demandSignals, orders });

  const overallScore = computeScore({ demandSignals, orders, revenueVnd: summary.revenueVnd, needsFollowUp: summary.needsFollowUpCommentsCount, overdueTasks: summary.overdueTasksCount });

  const mainOpportunity = buildMainOpportunity({ mainBottleneck, phoneSignals, summary, postCount: posts.length });

  return {
    reportDate: range.dateStr,
    generatedAt: new Date().toISOString(),
    mode: "rule_based",
    aiConfigured: false,
    adsStatus: "NOT_CONNECTED",
    contentInsightsStatus: posts.length > 0 ? "PARTIAL" : "NONE",
    persistence: "memory",
    summary: {
      headline: buildHeadline({ mainBottleneck, orders, revenueVnd: summary.revenueVnd, demandSignals }),
      overallScore,
      mainBottleneck,
      mainOpportunity,
    },
    organic: {
      postCount: posts.length,
      reach: null,
      engagement: null,
      commentCount: summary.commentsCount,
      phoneComments: summary.phoneCommentsCount,
      inboxGenerated: null,
      posts: posts.map((p) => ({ id: p.id, message: p.message, permalink: p.permalink, createdAt: p.createdAt.toISOString() })),
      recommendations: buildContentRecommendations({ postCount: posts.length, comments: summary.commentsCount, phoneComments: summary.phoneCommentsCount }),
    },
    ads: {
      status: "NOT_CONNECTED",
      spendVnd: 0,
      messages: 0,
      costPerMessageVnd: null,
      note: "Chưa kết nối Meta Ads Manager. DCOS vẫn phân tích inbox/sale/catalog, nhưng chưa đánh giá được nguồn quảng cáo.",
      recommendations: ["Kết nối Meta Ads (ads_read) để DCOS đo spend/CPM/cost-per-message và chất lượng lead."],
    },
    inbox: {
      newConversations,
      inboundMessages,
      newComments: summary.commentsCount,
      phoneCaptured: summary.phoneCommentsCount,
      needsFollowUp: summary.needsFollowUpCommentsCount,
      overdueTasks: summary.overdueTasksCount,
      note: "Số liệu từ inbox/comment nội bộ DCOS.",
    },
    sales: {
      orders: summary.ordersCount,
      revenueVnd: summary.revenueVnd,
      averageOrderValueVnd: summary.averageOrderValueVnd,
      newContacts: summary.newContactsCount,
      openPipelineValueVnd: summary.openPipelineValueVnd,
      revenueDeltaVnd,
    },
    catalog: {
      activeItems,
      draftItems,
      missingImageItems,
      activeOffers,
      note: missingImageItems > 0 ? `${missingImageItems} sản phẩm đang bán thiếu ảnh.` : "Catalog cơ bản đủ ảnh.",
    },
    conversionFunnel: {
      demandSignals,
      phoneSignals,
      orders,
      demandToPhoneRate,
      phoneToOrderRate,
      demandToOrderRate,
    },
    strengths,
    weaknesses,
    bottlenecks,
    actionItems,
    contentRecommendations: buildContentRecommendations({ postCount: posts.length, comments: summary.commentsCount, phoneComments: summary.phoneCommentsCount }),
    adsRecommendations: ["Kết nối Meta Ads để bổ sung lớp phân tích quảng cáo."],
    lessons,
  };
}

function detectBottlenecks(d: {
  postCount: number;
  demandSignals: number;
  phoneSignals: number;
  orders: number;
  needsFollowUp: number;
  overdueTasks: number;
  activeItems: number;
  missingImageItems: number;
  activeOffers: number;
}): { mainBottleneck: BottleneckArea; bottlenecks: Array<{ area: BottleneckArea; detail: string }> } {
  const bottlenecks: Array<{ area: BottleneckArea; detail: string }> = [];

  if (d.postCount === 0 && d.demandSignals === 0) {
    bottlenecks.push({ area: "TRUYỀN THÔNG", detail: "Không có bài đăng và không có nhu cầu (comment/inbox) hôm qua." });
  } else if (d.demandSignals === 0) {
    bottlenecks.push({ area: "TRUYỀN THÔNG", detail: "Có hoạt động nhưng không tạo được comment/inbox — nội dung chưa kéo nhu cầu." });
  }

  if (d.demandSignals > 0 && d.phoneSignals > 0 && d.orders === 0) {
    bottlenecks.push({ area: "SALE", detail: `Có ${d.phoneSignals} tín hiệu SĐT nhưng 0 đơn — sale chưa chốt được.` });
  }
  if (d.needsFollowUp > 0 || d.overdueTasks > 0) {
    bottlenecks.push({ area: "SALE", detail: `${d.needsFollowUp} comment cần follow-up, ${d.overdueTasks} task quá hạn chưa xử lý.` });
  }

  if (d.activeItems > 0 && d.missingImageItems / Math.max(d.activeItems, 1) >= 0.3) {
    bottlenecks.push({ area: "CATALOG-OFFER", detail: `${d.missingImageItems}/${d.activeItems} sản phẩm đang bán thiếu ảnh.` });
  }
  if (d.activeOffers === 0) {
    bottlenecks.push({ area: "CATALOG-OFFER", detail: "Chưa có offer active để sale dùng khi khách hỏi giá." });
  }

  const mainBottleneck: BottleneckArea = bottlenecks[0]?.area ?? "KHÔNG RÕ";
  return { mainBottleneck, bottlenecks };
}

function buildStrengths(d: { stats: Awaited<ReturnType<typeof buildFounderStats>>; demandSignals: number; orders: number; postCount: number }): string[] {
  const out: string[] = [];
  if (d.orders > 0) out.push(`Đã tạo ${d.orders} đơn với doanh thu ${formatVnd(d.stats.summary.revenueVnd)}.`);
  if (d.postCount > 0) out.push(`Có ${d.postCount} bài đăng fanpage hôm qua.`);
  if (d.demandSignals > 0) out.push(`Tạo ${d.demandSignals} tín hiệu nhu cầu (comment + inbox).`);
  if (d.stats.summary.phoneCommentsCount > 0) out.push(`${d.stats.summary.phoneCommentsCount} comment có SĐT — lead nóng dễ chốt.`);
  if (!out.length) out.push("Chưa có điểm mạnh nổi bật hôm qua.");
  return out;
}

function buildWeaknesses(d: {
  summary: Awaited<ReturnType<typeof buildFounderStats>>["summary"];
  demandSignals: number;
  orders: number;
  postCount: number;
  missingImageItems: number;
  activeOffers: number;
}): string[] {
  const out: string[] = [];
  if (d.postCount === 0) out.push("Không có bài đăng fanpage hôm qua.");
  if (d.demandSignals > 0 && d.orders === 0) out.push("Có nhu cầu nhưng chưa chốt được đơn nào.");
  if (d.summary.needsFollowUpCommentsCount > 0) out.push(`${d.summary.needsFollowUpCommentsCount} comment cần follow-up chưa xử lý.`);
  if (d.summary.overdueTasksCount > 0) out.push(`${d.summary.overdueTasksCount} task quá hạn.`);
  if (d.missingImageItems > 0) out.push(`${d.missingImageItems} sản phẩm đang bán thiếu ảnh.`);
  if (d.activeOffers === 0) out.push("Chưa có offer active.");
  if (!out.length) out.push("Không có điểm yếu rõ rệt hôm qua.");
  return out;
}

function buildActionItems(d: {
  summary: Awaited<ReturnType<typeof buildFounderStats>>["summary"];
  mainBottleneck: BottleneckArea;
  posts: number;
  missingImageItems: number;
  activeOffers: number;
}): Array<{ title: string; priority: "HIGH" | "MEDIUM" | "LOW"; source: string }> {
  const out: Array<{ title: string; priority: "HIGH" | "MEDIUM" | "LOW"; source: string }> = [];
  if (d.summary.needsFollowUpCommentsCount > 0)
    out.push({ title: `Follow-up ${d.summary.needsFollowUpCommentsCount} comment (ưu tiên comment có SĐT).`, priority: "HIGH", source: "INBOX" });
  if (d.summary.overdueTasksCount > 0)
    out.push({ title: `Xử lý ${d.summary.overdueTasksCount} task quá hạn trước 11h.`, priority: "HIGH", source: "SALE" });
  if (d.posts === 0)
    out.push({ title: "Đăng ít nhất 1 bài nội dung tạo nhu cầu hôm nay.", priority: "MEDIUM", source: "CONTENT" });
  if (d.missingImageItems > 0)
    out.push({ title: `Bổ sung ảnh cho ${d.missingImageItems} sản phẩm đang bán.`, priority: "MEDIUM", source: "CATALOG" });
  if (d.activeOffers === 0)
    out.push({ title: "Tạo ít nhất 1 offer chủ lực để sale dùng khi khách hỏi giá.", priority: "MEDIUM", source: "OFFER" });
  if (!out.length)
    out.push({ title: "Chọn 1 sản phẩm + 1 offer + 1 nhóm lead để đẩy mạnh hôm nay.", priority: "LOW", source: "GROWTH" });
  return out.slice(0, 8);
}

function buildLessons(d: {
  mainBottleneck: BottleneckArea;
  summary: Awaited<ReturnType<typeof buildFounderStats>>["summary"];
  demandSignals: number;
  orders: number;
}): string[] {
  const out: string[] = [];
  if (d.mainBottleneck === "SALE") out.push("Khi đã có lead/SĐT, tốc độ follow-up quyết định tỷ lệ chốt — cần quy trình phản hồi nhanh.");
  if (d.mainBottleneck === "TRUYỀN THÔNG") out.push("Ngày không đăng bài hoặc bài không kéo tương tác thì phễu cạn từ đầu.");
  if (d.mainBottleneck === "CATALOG-OFFER") out.push("Thiếu ảnh/offer làm khách hỏi nhưng khó chốt — hoàn thiện catalog trước khi đẩy traffic.");
  if (!out.length) out.push("Theo dõi liên tục để tích lũy bài học khi có đủ dữ liệu nhiều ngày.");
  return out;
}

function computeScore(d: { demandSignals: number; orders: number; revenueVnd: number; needsFollowUp: number; overdueTasks: number }): number {
  let score = 50;
  if (d.demandSignals > 0) score += 10;
  if (d.orders > 0) score += 20;
  if (d.revenueVnd > 0) score += 10;
  if (d.needsFollowUp > 0) score -= Math.min(15, d.needsFollowUp * 3);
  if (d.overdueTasks > 0) score -= Math.min(15, d.overdueTasks * 3);
  return Math.max(0, Math.min(100, score));
}

function buildHeadline(d: { mainBottleneck: BottleneckArea; orders: number; revenueVnd: number; demandSignals: number }): string {
  if (d.orders > 0) return `Hôm qua: ${d.orders} đơn, ${formatVnd(d.revenueVnd)}. Điểm nghẽn chính: ${d.mainBottleneck}.`;
  if (d.demandSignals > 0) return `Có nhu cầu nhưng chưa ra đơn. Điểm nghẽn chính: ${d.mainBottleneck}.`;
  return `Phễu cạn nhu cầu hôm qua. Điểm nghẽn chính: ${d.mainBottleneck}.`;
}

function buildMainOpportunity(d: {
  mainBottleneck: BottleneckArea;
  phoneSignals: number;
  summary: Awaited<ReturnType<typeof buildFounderStats>>["summary"];
  postCount: number;
}): string {
  if (d.phoneSignals > 0) return `Gọi/nhắn lại ${d.phoneSignals} comment có SĐT — lead nóng nhất để ra đơn nhanh.`;
  if (d.mainBottleneck === "TRUYỀN THÔNG") return "Đẩy lại bài sản phẩm từng có comment hỏi giá để tạo nhu cầu mới.";
  if (d.summary.openPipelineValueVnd > 0) return `Chốt pipeline đang mở (${formatVnd(d.summary.openPipelineValueVnd)}).`;
  return "Tập trung 1 sản phẩm chủ lực + 1 offer rõ ràng hôm nay.";
}

function buildContentRecommendations(d: { postCount: number; comments: number; phoneComments: number }): string[] {
  const out: string[] = [];
  if (d.postCount === 0) out.push("Hôm qua không đăng bài — lên lịch tối thiểu 1 bài/ngày.");
  if (d.comments > 0 && d.phoneComments > 0) out.push("Bài có comment hỏi SĐT: cân nhắc boost hoặc đăng lại biến thể.");
  if (d.comments === 0 && d.postCount > 0) out.push("Bài đăng nhưng ít tương tác — thử hook/CTA mạnh hơn.");
  if (!out.length) out.push("Duy trì nhịp đăng và gắn CTA hỏi SĐT/inbox vào mỗi bài.");
  return out;
}
