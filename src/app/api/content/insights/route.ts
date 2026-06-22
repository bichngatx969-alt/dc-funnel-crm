import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { buildDailyIntelligence } from "@/lib/ai/daily-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Content insights = lớp organic của Daily Intelligence (rule-based, internal).
export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const report = await buildDailyIntelligence({ workspaceId, date });
  return jsonOk({
    date: report.reportDate,
    contentInsightsStatus: report.contentInsightsStatus,
    organic: report.organic,
    recommendations: report.contentRecommendations,
  });
}
