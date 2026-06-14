import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Trả hội thoại lại cho bot tiếp tục tự động.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { id } = await params;
  try {
    const existing = await prisma.conversation.findFirst({ where: { id, workspaceId } });
    if (!existing) return jsonError("Không tìm thấy hội thoại", 404);
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: "BOT_ACTIVE", assignedToId: null },
    });
    return jsonOk(conversation);
  } catch {
    return jsonError("Không tìm thấy hội thoại", 404);
  }
}
