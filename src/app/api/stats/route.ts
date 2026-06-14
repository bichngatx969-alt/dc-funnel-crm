import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");
  const pageWhere = pageId && pageId !== "all" ? { pageId } : {};
  const workspaceWhere = { workspaceId, ...pageWhere };

  const startOfToday = startOfTodayInHoChiMinh();

  const [newCustomersToday, openConversations, hotCustomers, followUpNeeded, customers, topPostbacks] =
    await Promise.all([
      prisma.customer.count({ where: { ...workspaceWhere, createdAt: { gte: startOfToday } } }),
      prisma.conversation.count({ where: { ...workspaceWhere, status: { in: ["BOT_ACTIVE", "HUMAN_TAKEOVER"] } } }),
      prisma.customer.count({ where: { ...workspaceWhere, currentStage: "HOT" } }),
      prisma.task.count({ where: { workspaceId, status: "TODO", customer: pageWhere } }),
      prisma.customer.findMany({ where: workspaceWhere, select: { tags: true }, take: 2000 }),
      prisma.funnelEvent.groupBy({
        by: ["eventValue"],
        where: { ...pageWhere, customer: { workspaceId }, eventName: "postback", eventValue: { not: null } },
        _count: { eventValue: true },
        orderBy: { _count: { eventValue: "desc" } },
        take: 8,
      }),
    ]);

  // Đếm tag phổ biến.
  const tagCount = new Map<string, number>();
  for (const c of customers) {
    for (const t of c.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const topTags = Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topProducts = topPostbacks
    .filter((p) => p.eventValue)
    .map((p) => ({ payload: p.eventValue as string, count: p._count.eventValue }));

  return jsonOk({
    newCustomersToday,
    openConversations,
    hotCustomers,
    followUpNeeded,
    topTags,
    topProducts,
  });
}

function startOfTodayInHoChiMinh(now = new Date()): Date {
  const vietnamOffsetMs = 7 * 60 * 60 * 1000;
  const vietnamNow = new Date(now.getTime() + vietnamOffsetMs);
  return new Date(
    Date.UTC(
      vietnamNow.getUTCFullYear(),
      vietnamNow.getUTCMonth(),
      vietnamNow.getUTCDate()
    ) - vietnamOffsetMs
  );
}
