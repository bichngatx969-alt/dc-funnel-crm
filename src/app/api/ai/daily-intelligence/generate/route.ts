import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { buildDailyIntelligence } from "@/lib/ai/daily-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST: tạo (compute) báo cáo Daily Intelligence cho ngày chỉ định (mặc định hôm qua).
// Hiện compute-on-demand; persistence (DailyIntelligenceReport) sẽ bật sau khi schema có model.
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const date = body?.date ?? searchParams.get("date");
  const report = await buildDailyIntelligence({ workspaceId, date });
  return jsonOk({ report, stored: false });
}
