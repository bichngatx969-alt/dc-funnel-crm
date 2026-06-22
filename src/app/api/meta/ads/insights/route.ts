import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ads OS — chưa kết nối Meta Ads (ads_read). Trả trạng thái NOT_CONNECTED, không crash.
// Khi có ad account token + AdInsightSnapshot, route này sẽ trả insights thật.
export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") ?? "campaign";
  return jsonOk({
    adsStatus: "NOT_CONNECTED",
    level,
    items: [],
    note: "Chưa kết nối Meta Ads Manager. DCOS vẫn phân tích inbox/sale/catalog, nhưng chưa đánh giá được nguồn quảng cáo.",
  });
}
