import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Chi tiết báo cáo theo id: cần persistence. Hiện trả note rõ ràng để UI xử lý mượt.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  await getCurrentWorkspaceId(user);
  const { id } = await params;
  return jsonOk({
    report: null,
    id,
    persistence: "memory",
    note: "Chi tiết báo cáo theo id sẽ khả dụng khi persistence được bật. Dùng GET /api/ai/daily-intelligence?date=YYYY-MM-DD để xem báo cáo theo ngày.",
  });
}
