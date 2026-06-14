import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const { pageId } = await params;
  const page = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId }, select: { pageId: true } });
  if (!page) return jsonError("Không tìm thấy Fanpage", 404);
  const logs = await prisma.facebookWebhookLog.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk(logs);
}
