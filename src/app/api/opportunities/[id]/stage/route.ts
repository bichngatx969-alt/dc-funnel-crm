import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { evaluateAutomationRules } from "@/lib/automation";
import {
  getStageInWorkspace,
  normalizeOpportunityStatus,
  opportunityInclude,
  statusClosedAt,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.opportunity.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
  if (!existing) return jsonError("Không tìm thấy cơ hội", 404);

  const body = await req.json().catch(() => ({}));
  const stageId = String(body.stageId ?? "").trim();
  if (!stageId) return jsonError("Thiếu stageId");

  const stage = await getStageInWorkspace(stageId, workspaceId, existing.pipelineId);
  if (!stage) return jsonError("Stage không thuộc pipeline hiện tại", 400);

  const status = body.status !== undefined ? normalizeOpportunityStatus(body.status) : null;
  if (body.status !== undefined && !status) return jsonError("Trạng thái cơ hội không hợp lệ");

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      stageId,
      lastActivityAt: new Date(),
      ...(status ? { status, closedAt: statusClosedAt(status, existing.closedAt) } : {}),
    },
    include: opportunityInclude,
  });

  await evaluateAutomationRules({
    workspaceId,
    triggerType: "OPPORTUNITY_STAGE_CHANGED",
    sourceType: "OPPORTUNITY",
    sourceId: opportunity.id,
    payload: {
      opportunityId: opportunity.id,
      customerId: opportunity.customerId,
      ownerId: opportunity.ownerId,
      pipelineId: opportunity.pipelineId,
      previousStageId: existing.stageId,
      stageId: opportunity.stageId,
      status: opportunity.status,
      valueVnd: opportunity.valueVnd,
    },
  }).catch((error) => console.error("OPPORTUNITY_STAGE_CHANGED automation failed", error));

  return jsonOk({ opportunity });
}
