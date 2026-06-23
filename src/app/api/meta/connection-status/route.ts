import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { buildMetaConnectionStatus } from "@/lib/meta/connection-status";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const status = await buildMetaConnectionStatus(workspaceId);
  return jsonOk(status);
}
