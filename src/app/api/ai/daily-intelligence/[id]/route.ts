import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { getStoredReportById } from "@/lib/ai/daily-intelligence-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Chi tiết báo cáo đã lưu theo id.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;
  const report = await getStoredReportById(workspaceId, id);
  if (!report) {
    return jsonOk({
      report: null,
      id,
      note: "Không tìm thấy báo cáo đã lưu (có thể migration chưa apply hoặc id không tồn tại). Dùng GET /api/ai/daily-intelligence?date= để tạo mới.",
    });
  }
  return jsonOk({ report, id });
}
