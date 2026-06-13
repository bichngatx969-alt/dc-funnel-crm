import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");

  const flows = await prisma.flow.findMany({
    where: pageId && pageId !== "all" ? { pageId } : {},
    orderBy: { createdAt: "asc" },
    include: {
      facebookPage: { select: { pageId: true, pageName: true } },
      steps: { orderBy: { createdAt: "asc" } },
    },
  });
  return jsonOk(flows);
}
