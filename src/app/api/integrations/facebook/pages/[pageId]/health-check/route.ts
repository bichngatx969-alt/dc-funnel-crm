import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { runPageHealthCheck } from "@/lib/facebook/facebook-integration-service";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const { pageId } = await params;
  try {
    return jsonOk(await runPageHealthCheck(pageId, workspaceId));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Không tìm thấy Fanpage", 404);
  }
}
