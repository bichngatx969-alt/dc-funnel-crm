import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { buildDailyIntelligence } from "@/lib/ai/daily-intelligence";
import { storeDailyReport } from "@/lib/ai/daily-intelligence-store";
import { sendDailyReportEmail } from "@/lib/ai/daily-intelligence-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bảo vệ: header x-cron-secret == CRON_SECRET, hoặc ?secret=, hoặc admin đăng nhập.
async function authorize(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") || url.searchParams.get("secret") || "";
  if (env.cronSecret && provided && provided === env.cronSecret) return true;
  const auth = await requireAdmin();
  return auth.ok;
}

// Cron 8h sáng (Asia/Ho_Chi_Minh): tạo báo cáo Daily Intelligence cho từng workspace.
// Hiện compute-on-demand (chưa lưu DB). Khi persistence bật: lưu report + finding/lesson/action + gửi notification.
async function run(req: Request) {
  if (!(await authorize(req))) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const workspaces = await prisma.workspace.findMany({ select: { id: true }, take: 200 });
  const results: Array<{ workspaceId: string; ok: boolean; mainBottleneck?: string; stored?: boolean; emailed?: boolean; error?: string }> = [];
  for (const ws of workspaces) {
    try {
      const report = await buildDailyIntelligence({ workspaceId: ws.id, date });
      const { stored } = await storeDailyReport(ws.id, report);
      let emailed = false;
      // Gửi email báo cáo nếu founder đã cấu hình DAILY_REPORT_EMAIL_TO (opt-in, best-effort).
      if (env.dailyReportEmailTo) {
        const mail = await sendDailyReportEmail(env.dailyReportEmailTo, report);
        emailed = mail.sent;
      }
      results.push({ workspaceId: ws.id, ok: true, mainBottleneck: report.summary.mainBottleneck, stored, emailed });
    } catch (e: any) {
      results.push({ workspaceId: ws.id, ok: false, error: e?.message ?? "error" });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const storedCount = results.filter((r) => r.stored).length;
  const emailedCount = results.filter((r) => r.emailed).length;
  console.log("[CRON] daily-intelligence:", { date: date ?? "yesterday", workspaces: results.length, ok: okCount, stored: storedCount, emailed: emailedCount });
  return jsonOk({ generated: okCount, stored: storedCount, emailed: emailedCount, total: results.length, date: date ?? "yesterday", results });
}

export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}
