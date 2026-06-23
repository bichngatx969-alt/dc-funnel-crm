import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { updateActionItemStatus } from "@/lib/ai/daily-intelligence-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = ["TODO", "DONE", "DISMISSED"];

// PATCH: đổi trạng thái action item (mark done / dismiss). An toàn — không xóa cứng.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").toUpperCase();
  if (!ALLOWED.includes(status)) return jsonError("Trạng thái không hợp lệ (TODO/DONE/DISMISSED)");
  const res = await updateActionItemStatus(workspaceId, id, status);
  if (!res.ok) return jsonError("Không cập nhật được action item (có thể chưa apply migration hoặc id không tồn tại)", 404);
  return jsonOk({ id, status });
}
