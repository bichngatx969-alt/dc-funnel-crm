import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { sendTextMessage } from "@/lib/facebook/send";

export const dynamic = "force-dynamic";

// Sale gửi tin nhắn thủ công qua Facebook Send API.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) return jsonError("Nội dung tin nhắn trống");

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      facebookPage: { select: { pageAccessTokenEncrypted: true } },
    },
  });
  if (!conversation) return jsonError("Không tìm thấy hội thoại", 404);

  const result = await sendTextMessage(
    conversation.customer.psid,
    text,
    conversation.facebookPage?.pageAccessTokenEncrypted ?? null
  );

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      pageId: conversation.pageId,
      direction: "OUTBOUND",
      senderType: "HUMAN",
      text,
      metaMessageId: result.messageId ?? null,
      payloadJson: result.ok ? undefined : { error: String(result.error) },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  return jsonOk({
    message,
    sendOk: result.ok,
    error: result.ok ? null : "Gửi qua Meta API thất bại (đã lưu nội dung). Kiểm tra Page Access Token / cửa sổ 24h.",
  });
}
