import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  ensureDefaultPipeline,
  getFirstStageForPipeline,
  getPipelineInWorkspace,
  getStageInWorkspace,
  normalizeOpportunityStatus,
  opportunityInclude,
  parseDateOrNull,
  parseVnd,
  statusClosedAt,
  validateCustomerInWorkspace,
  validateOwnerInWorkspace,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get("pipelineId");
  const stageId = searchParams.get("stageId");
  const customerId = searchParams.get("customerId");
  const ownerId = searchParams.get("ownerId");
  const status = normalizeOpportunityStatus(searchParams.get("status"));

  const opportunities = await prisma.opportunity.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(pipelineId ? { pipelineId } : {}),
      ...(stageId ? { stageId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(status ? { status } : {}),
    },
    include: opportunityInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  return jsonOk({ items: opportunities });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId ?? body.contactId ?? "").trim();
  if (!customerId) return jsonError("Thiếu customerId");

  const customer = await validateCustomerInWorkspace(customerId, workspaceId);
  if (!customer) return jsonError("Không tìm thấy khách trong workspace hiện tại", 404);

  const pipelineId = String(body.pipelineId ?? "").trim();
  const pipeline = pipelineId
    ? await getPipelineInWorkspace(pipelineId, workspaceId)
    : await ensureDefaultPipeline(workspaceId);
  if (!pipeline) return jsonError("Không tìm thấy pipeline", 404);

  const requestedStageId = String(body.stageId ?? "").trim();
  const stage = requestedStageId
    ? await getStageInWorkspace(requestedStageId, workspaceId, pipeline.id)
    : await getFirstStageForPipeline(pipeline.id);
  if (!stage) return jsonError("Không tìm thấy stage trong pipeline", 400);

  const ownerId = body.ownerId === undefined ? user.id : String(body.ownerId || "").trim() || null;
  if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
    return jsonError("Owner không thuộc workspace hiện tại", 400);
  }

  const status = normalizeOpportunityStatus(body.status) ?? "OPEN";
  const title = String(body.title ?? "").trim() || customer.name || "Cơ hội mới";
  const expectedCloseAt = parseDateOrNull(body.expectedCloseAt);
  const lastActivityAt = parseDateOrNull(body.lastActivityAt) ?? new Date();

  const opportunity = await prisma.opportunity.create({
    data: {
      workspaceId,
      customerId,
      pipelineId: pipeline.id,
      stageId: stage.id,
      title,
      valueVnd: parseVnd(body.valueVnd),
      status,
      ownerId,
      source: String(body.source ?? "").trim() || null,
      expectedCloseAt,
      lastActivityAt,
      closedAt: statusClosedAt(status),
    },
    include: opportunityInclude,
  });

  return jsonOk({ opportunity }, 201);
}
