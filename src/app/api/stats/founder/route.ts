import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { buildFounderStats, parseFounderStatsFilters } from "@/lib/founder-stats";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const filters = parseFounderStatsFilters(searchParams);
  const stats = await buildFounderStats({ workspaceId, filters });

  return jsonOk(stats);
}
