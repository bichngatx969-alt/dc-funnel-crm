import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  for (const f of ["product", "title", "offerText", "description", "priceText", "triggerTag"]) {
    if (body[f] !== undefined) data[f] = body[f] === null ? null : String(body[f]);
  }
  if (body.pageId !== undefined) {
    const pageId = String(body.pageId || "").trim();
    if (pageId) {
      const page = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId }, select: { pageId: true } });
      if (!page) return jsonError("Fanpage không thuộc workspace hiện tại", 400);
    }
    data.pageId = pageId || null;
  }
  if (body.priority !== undefined && Number.isFinite(Number(body.priority))) {
    data.priority = Number(body.priority);
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.customerStage !== undefined) {
    data.customerStage = STAGES.includes(body.customerStage) ? body.customerStage : null;
  }

  try {
    const existing = await prisma.offer.findFirst({ where: { id, workspaceId } });
    if (!existing) return jsonError("Không tìm thấy offer", 404);
    const offer = await prisma.offer.update({
      where: { id },
      data,
      include: { facebookPage: { select: { pageId: true, pageName: true } } },
    });
    return jsonOk(offer);
  } catch {
    return jsonError("Không tìm thấy offer", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const { id } = await params;
  try {
    const existing = await prisma.offer.findFirst({ where: { id, workspaceId } });
    if (!existing) return jsonError("Không tìm thấy offer", 404);
    await prisma.offer.delete({ where: { id } });
    return jsonOk({ id });
  } catch {
    return jsonError("Không tìm thấy offer", 404);
  }
}
