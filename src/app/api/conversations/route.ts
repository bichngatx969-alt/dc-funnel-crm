import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const pageId = searchParams.get("pageId");

  const where: any = {};
  if (status && status !== "all") where.status = status;
  if (pageId && pageId !== "all") where.pageId = pageId;
  if (q) {
    where.customer = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { psid: { contains: q } },
      ],
    };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          psid: true,
          avatarUrl: true,
          currentStage: true,
          leadScore: true,
          tags: true,
          phone: true,
          pageId: true,
        },
      },
      facebookPage: { select: { pageId: true, pageName: true } },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, direction: true, createdAt: true },
      },
    },
  });

  const data = conversations.map((c) => ({
    id: c.id,
    status: c.status,
    lastMessageAt: c.lastMessageAt,
    customer: c.customer,
    pageId: c.pageId,
    facebookPage: c.facebookPage,
    assignedTo: c.assignedTo,
    lastMessage: c.messages[0] ?? null,
  }));

  return jsonOk(data);
}
