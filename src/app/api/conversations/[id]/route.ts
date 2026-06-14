import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId },
    include: {
      customer: true,
      facebookPage: { select: { pageId: true, pageName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!conversation) return jsonError("Không tìm thấy hội thoại", 404);

  const tasks = await prisma.task.findMany({
    where: { workspaceId, customerId: conversation.customerId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return jsonOk({ conversation, tasks });
}
