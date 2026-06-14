import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  createPipelineFromTemplate,
  ensureDefaultPipeline,
  listPipelineTemplates,
  normalizePipelineTemplate,
  pipelineInclude,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  if (searchParams.get("ensureDefault") !== "false") {
    await ensureDefaultPipeline(workspaceId);
  }

  const pipelines = await prisma.pipeline.findMany({
    where: { workspaceId, deletedAt: null },
    include: pipelineInclude,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return jsonOk({
    items: pipelines,
    templates: listPipelineTemplates(),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const body = await req.json().catch(() => ({}));
  const existingCount = await prisma.pipeline.count({ where: { workspaceId, deletedAt: null } });
  const template = normalizePipelineTemplate(body.template ?? body.industryTemplate);
  const name = String(body.name ?? "").trim();
  const isDefault = body.isDefault === undefined ? existingCount === 0 : Boolean(body.isDefault);
  const stages = Array.isArray(body.stages) ? body.stages : undefined;

  const pipeline = await createPipelineFromTemplate(workspaceId, {
    name,
    template,
    isDefault,
    stages,
  });

  return jsonOk({ pipeline }, 201);
}
