import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lịch sử báo cáo: sẽ trả dữ liệu thật khi persistence (model DailyIntelligenceReport) được thêm.
// Hiện trả rỗng + ghi rõ trạng thái để UI không vỡ.
export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  await getCurrentWorkspaceId(user);
  return jsonOk({
    items: [],
    pagination: { page: 1, pageSize: 0, total: 0, pageCount: 0 },
    persistence: "memory",
    note: "Lịch sử báo cáo sẽ bật khi model DailyIntelligenceReport được thêm vào schema (đang hoãn để tránh đụng schema Codex).",
  });
}
