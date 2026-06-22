import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { resolveYesterdayRange } from "@/lib/ai/daily-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Content OS — bài đăng fanpage hôm qua từ dữ liệu nội bộ (PARTIAL: chưa có reach/impressions từ Graph).
export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const pageId = searchParams.get("pageId");
  const range = resolveYesterdayRange(date);

  const posts = await prisma.facebookPost.findMany({
    where: {
      workspaceId,
      createdAt: { gte: range.from, lt: range.to },
      ...(pageId ? { pageId } : {}),
    },
    select: { id: true, pageId: true, message: true, permalink: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const postIds = posts.map((p) => p.id);
  const [commentGroups, phoneGroups] = postIds.length
    ? await Promise.all([
        prisma.facebookComment.groupBy({
          by: ["postId"],
          where: { workspaceId, postId: { in: postIds } },
          _count: { _all: true },
        }),
        prisma.facebookComment.groupBy({
          by: ["postId"],
          where: { workspaceId, postId: { in: postIds }, hasPhone: true },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const commentByPost = new Map(commentGroups.map((g) => [g.postId, g._count._all]));
  const phoneByPost = new Map(phoneGroups.map((g) => [g.postId, g._count._all]));

  const items = posts.map((p) => ({
    id: p.id,
    pageId: p.pageId,
    message: p.message,
    permalink: p.permalink,
    createdAt: p.createdAt.toISOString(),
    commentCount: commentByPost.get(p.id) ?? 0,
    phoneComments: phoneByPost.get(p.id) ?? 0,
    reach: null,
    engagement: null,
  }));

  return jsonOk({
    items,
    date: range.dateStr,
    contentInsightsStatus: items.length > 0 ? "PARTIAL" : "NONE",
    note: "Reach/impressions từ Meta chưa có (thiếu Page insights). Đang dùng bài đăng + comment nội bộ.",
  });
}
