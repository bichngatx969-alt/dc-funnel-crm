import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { buildDailyIntelligence } from "@/lib/ai/daily-intelligence";
import { sendDailyReportEmail } from "@/lib/ai/daily-intelligence-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Gửi báo cáo cho chính người đang đăng nhập (mặc định email của họ) — an toàn, không gửi cho khách.
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const date = body?.date ?? searchParams.get("date");
  const to = typeof body?.to === "string" && body.to.includes("@") ? body.to : user.email;
  if (!to) return jsonError("Không có địa chỉ email người nhận.");

  const report = await buildDailyIntelligence({ workspaceId, date });
  const res = await sendDailyReportEmail(to, report);
  if (!res.sent) return jsonError(res.error ?? "Không gửi được email", res.emailEnabled ? 502 : 400);
  return jsonOk({ sent: true, to });
}
