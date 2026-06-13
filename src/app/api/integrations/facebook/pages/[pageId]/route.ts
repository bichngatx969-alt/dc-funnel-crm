import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { publicPageSelect } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { pageId } = await params;
  const page = await prisma.facebookPage.findUnique({
    where: { pageId },
    select: publicPageSelect,
  });
  if (!page) return jsonError("Không tìm thấy Fanpage", 404);
  return jsonOk(page);
}
