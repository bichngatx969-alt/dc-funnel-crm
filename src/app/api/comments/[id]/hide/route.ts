import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { hideFacebookComment } from "@/lib/facebook/comments";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const hide = body.hide === undefined ? true : Boolean(body.hide);

  const result = await hideFacebookComment({ workspaceId, commentId: id, hide });
  if (!result.ok) {
    const status = result.error === "comment_not_found" ? 404 : 400;
    return jsonError(readableFacebookCommentError(result.error), status);
  }

  return jsonOk({ hidden: hide });
}

function readableFacebookCommentError(error: string | undefined) {
  if (error === "comment_not_found") return "Không tìm thấy comment";
  if (error === "missing_page_access_token") return "Fanpage chưa có page token để ẩn comment";
  return error || "Không cập nhật được trạng thái ẩn comment qua Facebook";
}
