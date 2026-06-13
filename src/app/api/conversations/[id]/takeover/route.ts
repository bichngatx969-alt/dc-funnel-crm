import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Sale tiếp quản hội thoại: bot ngừng tự trả lời.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { id } = await params;
  try {
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: "HUMAN_TAKEOVER", assignedToId: user.id },
    });
    return jsonOk(conversation);
  } catch {
    return jsonError("Không tìm thấy hội thoại", 404);
  }
}
