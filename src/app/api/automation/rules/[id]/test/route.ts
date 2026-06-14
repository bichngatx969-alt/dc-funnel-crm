import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { parseAutomationSourceType, testAutomationRule } from "@/lib/automation";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const sourceType = parseAutomationSourceType(body.sourceType) ?? "MANUAL";
  const sourceId = typeof body.sourceId === "string" && body.sourceId.trim() ? body.sourceId.trim() : id;
  const dryRun = body.dryRun === undefined ? true : Boolean(body.dryRun);

  const run = await testAutomationRule({
    workspaceId,
    ruleId: id,
    sourceType,
    sourceId,
    payload: isObject(body.payload) ? body.payload : { manualTest: true },
    dryRun,
  });
  if (!run) return jsonError("Không tìm thấy automation rule", 404);

  return jsonOk({ run, dryRun });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
