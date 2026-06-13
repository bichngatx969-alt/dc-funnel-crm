import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { verifyResendWebhook } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Map event Resend -> EmailLogStatus.
const STATUS_MAP: Record<string, string | null> = {
  "email.sent": "SENT",
  "email.delivered": "SENT",
  "email.delivery_delayed": null,
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
};

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifyResendWebhook(raw, req.headers, env.resendWebhookSecret)) {
    console.warn("[EMAIL][resend webhook] Chữ ký không hợp lệ.");
    return new Response("Invalid signature", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const type: string = body?.type;
    const emailId: string | undefined = body?.data?.email_id ?? body?.data?.id;
    const status = STATUS_MAP[type];
    if (emailId && status) {
      const log = await prisma.emailLog.findFirst({ where: { providerMessageId: emailId } });
      if (log) {
        await prisma.emailLog.update({ where: { id: log.id }, data: { status: status as any } });
        if (status === "BOUNCED" || status === "COMPLAINED") {
          await prisma.customer
            .update({
              where: { id: log.customerId },
              data: { emailStatus: status as any, emailConsent: false },
            })
            .catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("[EMAIL][resend webhook] Lỗi xử lý:", err);
  }

  return new Response("ok", { status: 200 });
}
