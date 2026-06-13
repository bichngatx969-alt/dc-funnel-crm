import { prisma } from "@/lib/prisma";
import { jsonOk, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { pageId } = await params;
  const logs = await prisma.facebookWebhookLog.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk(logs);
}
