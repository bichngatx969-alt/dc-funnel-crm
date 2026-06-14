import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { buildContactTimeline, getContactInWorkspace, parseInteger } from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const contact = await getContactInWorkspace(id, workspaceId);
  if (!contact) return jsonError("Không tìm thấy contact", 404);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInteger(searchParams.get("limit"), 50)));
  const items = await buildContactTimeline(id, workspaceId, limit);

  return jsonOk({ items });
}
