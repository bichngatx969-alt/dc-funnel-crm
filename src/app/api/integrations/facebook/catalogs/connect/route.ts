import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { connectCatalog } from "@/lib/facebook/facebook-integration-service";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  const body = await req.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const catalogName = String(body.catalogName ?? "").trim() || null;
  if (!businessId) return jsonError("Thiếu businessId");
  if (!catalogId) return jsonError("Thiếu catalogId");

  try {
    return jsonOk(await connectCatalog(workspaceId, { businessId, catalogId, catalogName }));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : String(err), 400);
  }
}
