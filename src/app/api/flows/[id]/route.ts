import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"];

// Cập nhật flow (name, isActive) và nội dung các step (messageText, quickRepliesJson...).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.flow.findFirst({ where: { id, workspaceId } });
  if (!existing) return jsonError("Không tìm thấy flow", 404);

  const flowData: { name?: string; isActive?: boolean; pageId?: string | null } = {};
  if (body.name !== undefined) flowData.name = String(body.name);
  if (body.isActive !== undefined) flowData.isActive = Boolean(body.isActive);
  if (body.pageId !== undefined) {
    const pageId = String(body.pageId || "").trim();
    if (pageId) {
      const page = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId }, select: { pageId: true } });
      if (!page) return jsonError("Fanpage không thuộc workspace hiện tại", 400);
    }
    flowData.pageId = pageId || null;
  }

  const steps = Array.isArray(body.steps) ? body.steps : [];

  // Chuẩn hóa + validate quickRepliesJson cho từng step trước khi ghi.
  const stepUpdates: { id: string; data: any }[] = [];
  for (const s of steps) {
    if (!s?.id) continue;
    const data: any = {};
    if (s.messageText !== undefined) data.messageText = String(s.messageText);
    if (s.scoreDelta !== undefined) data.scoreDelta = Number(s.scoreDelta) || 0;
    if (s.stageToSet !== undefined) {
      data.stageToSet = STAGES.includes(s.stageToSet) ? s.stageToSet : null;
    }
    if (s.tagsToAdd !== undefined && Array.isArray(s.tagsToAdd)) {
      data.tagsToAdd = s.tagsToAdd.map((t: unknown) => String(t).trim()).filter(Boolean);
    }
    if (s.quickRepliesJson !== undefined) {
      const parsed = parseQuickReplies(s.quickRepliesJson);
      if (parsed === "INVALID") {
        return jsonError(`Quick replies JSON không hợp lệ ở step "${s.key ?? s.id}"`);
      }
      data.quickRepliesJson = parsed;
    }
    if (Object.keys(data).length) stepUpdates.push({ id: s.id, data });
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(flowData).length) {
      await tx.flow.update({ where: { id }, data: flowData });
    }
    for (const u of stepUpdates) {
      await tx.flowStep.update({ where: { id: u.id }, data: u.data });
    }
  });

  const flow = await prisma.flow.findUnique({
    where: { id },
    include: {
      facebookPage: { select: { pageId: true, pageName: true } },
      steps: { orderBy: { createdAt: "asc" } },
    },
  });
  return jsonOk(flow);
}

// Trả về: mảng đã parse | null | "INVALID"
function parseQuickReplies(value: unknown): any[] | null | "INVALID" {
  if (value === null || value === "") return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr : "INVALID";
    } catch {
      return "INVALID";
    }
  }
  return "INVALID";
}
