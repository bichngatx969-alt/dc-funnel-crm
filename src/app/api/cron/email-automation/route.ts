import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { env } from "@/lib/env";
import { processDueEmails } from "@/lib/email/automation";

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

async function run(req: Request) {
  if (!(await authorize(req))) return jsonError("Unauthorized", 401);
  const result = await processDueEmails(100);
  console.log("[CRON] email-automation:", result);
  return jsonOk(result);
}

// Hỗ trợ cả POST (mặc định) và GET (cho Vercel Cron / cron service GET).
export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}
