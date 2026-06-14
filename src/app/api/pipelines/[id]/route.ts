import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { getPipelineInWorkspace, opportunityInclude } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: {
      stages: { orderBy: { position: "asc" } },
      opportunities: {
        where: { workspaceId, deletedAt: null },
        include: opportunityInclude,
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      },
    },
  });
  if (!pipeline) return jsonError("Không tìm thấy pipeline", 404);

  const stageSummaries = pipeline.stages.map((stage) => {
    const opportunities = pipeline.opportunities.filter((item) => item.stageId === stage.id);
    return {
      stageId: stage.id,
      count: opportunities.length,
      valueVnd: opportunities.reduce((sum, item) => sum + item.valueVnd, 0),
    };
  });

  return jsonOk({ pipeline, stageSummaries });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const { id } = await params;

  const existing = await getPipelineInWorkspace(id, workspaceId);
  if (!existing) return jsonError("Không tìm thấy pipeline", 404);

  const body = await req.json().catch(() => ({}));
  const data: {
    name?: string;
    industryTemplate?: string | null;
    isDefault?: boolean;
    deletedAt?: Date | null;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("Tên pipeline không được để trống");
    data.name = name;
  }
  if (body.industryTemplate !== undefined) {
    const value = String(body.industryTemplate ?? "").trim();
    data.industryTemplate = value || null;
  }
  if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);
  if (body.deleted !== undefined) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const pipeline = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.pipeline.updateMany({
        where: { workspaceId, deletedAt: null, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    await tx.pipeline.update({ where: { id }, data });
    return tx.pipeline.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { position: "asc" } },
        _count: { select: { opportunities: true } },
      },
    });
  });

  return jsonOk({ pipeline });
}
