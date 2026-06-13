import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { isAiEnabled } from "@/lib/env";
import { aiSuggestReply } from "@/lib/ai/suggest";

export const dynamic = "force-dynamic";

// Gợi ý câu trả lời cho sale. CHỈ gợi ý, không tự gửi.
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  if (!isAiEnabled()) {
    return jsonOk({ enabled: false, suggestion: null });
  }

  const body = await req.json().catch(() => ({}));
  const conversationId = String(body.conversationId ?? "");
  if (!conversationId) return jsonError("Thiếu conversationId");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true },
  });
  if (!conversation) return jsonError("Không tìm thấy hội thoại", 404);

  const [messages, offers, brandProfile] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.offer.findMany({
      where: {
        isActive: true,
        OR: [{ pageId: conversation.pageId }, { pageId: null }],
      },
      orderBy: { priority: "desc" },
      take: 10,
    }),
    prisma.brandProfile.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  const ordered = messages.reverse();
  const lastInbound = [...ordered].reverse().find((m) => m.direction === "INBOUND");

  const result = await aiSuggestReply({
    customer: {
      name: conversation.customer.name,
      currentStage: conversation.customer.currentStage,
      tags: conversation.customer.tags,
      leadScore: conversation.customer.leadScore,
    },
    recentMessages: ordered.map((m) => ({
      direction: m.direction,
      senderType: m.senderType,
      text: m.text,
    })),
    latestMessage: lastInbound?.text ?? "",
    brandName: brandProfile?.brandName ?? "brand hiện tại",
    offers: offers.map((o) => ({
      product: o.product,
      title: o.title,
      offerText: o.offerText,
      priceText: o.priceText,
    })),
  });

  if (!result.ok) {
    return jsonError("Không tạo được gợi ý AI: " + (result.error ?? "unknown"), 502);
  }

  return jsonOk({ enabled: true, suggestion: result.suggestion });
}
