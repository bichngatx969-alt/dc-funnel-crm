import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"];

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");
  const offers = await prisma.offer.findMany({
    where: { workspaceId, ...(pageId && pageId !== "all" ? { pageId } : {}) },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { facebookPage: { select: { pageId: true, pageName: true } } },
  });
  return jsonOk(offers);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const body = await req.json().catch(() => ({}));
  const product = String(body.product ?? "").trim();
  const title = String(body.title ?? "").trim();
  const offerText = String(body.offerText ?? "").trim();

  if (!product || !title || !offerText) {
    return jsonError("Vui lòng nhập đủ product, title, offerText");
  }

  const customerStage = STAGES.includes(body.customerStage) ? body.customerStage : null;
  const pageId = String(body.pageId || "").trim() || null;
  if (pageId) {
    const page = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId }, select: { pageId: true } });
    if (!page) return jsonError("Fanpage không thuộc workspace hiện tại", 400);
  }

  const offer = await prisma.offer.create({
    data: {
      workspaceId,
      pageId,
      product,
      title,
      offerText,
      description: body.description ? String(body.description) : null,
      priceText: body.priceText ? String(body.priceText) : null,
      triggerTag: body.triggerTag ? String(body.triggerTag).trim() : null,
      customerStage,
      priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
    include: { facebookPage: { select: { pageId: true, pageName: true } } },
  });
  return jsonOk(offer);
}
