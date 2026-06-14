import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { switchCurrentWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const body = await req.json().catch(() => ({}));
  const workspaceId = String(body.workspaceId ?? "").trim();
  if (!workspaceId) return jsonError("Thiếu workspaceId");

  const workspace = await switchCurrentWorkspace(user, workspaceId);
  if (!workspace) return jsonError("Không tìm thấy workspace hoặc không đủ quyền", 404);

  return jsonOk({ workspace, currentWorkspaceId: workspace.id });
}
