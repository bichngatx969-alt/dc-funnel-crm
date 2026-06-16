import { jsonOk, requireAdmin } from "@/lib/api";
import { listAvailableBusinesses } from "@/lib/facebook/facebook-integration-service";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);
  return jsonOk(await listAvailableBusinesses(workspaceId));
}
