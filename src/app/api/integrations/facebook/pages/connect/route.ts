import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { connectPage } from "@/lib/facebook/facebook-integration-service";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const body = await req.json().catch(() => ({}));
  const pageId = String(body.pageId ?? "").trim();
  if (!pageId) return jsonError("Thiếu pageId");

  try {
    return jsonOk(await connectPage(pageId, workspaceId));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : String(err), 400);
  }
}
