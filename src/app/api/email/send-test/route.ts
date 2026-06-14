import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { env, isEmailEnabled } from "@/lib/env";
import { getEmailProvider } from "@/lib/email";
import { renderTemplate, renderString } from "@/lib/email/renderer";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { rateLimit } from "@/lib/ratelimit";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Gửi test email đến admin. Chỉ admin. Có rate limit.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const workspaceId = await getCurrentWorkspaceId(user);
  if (!isEmailEnabled())
    return jsonError("Email chưa bật (thiếu RESEND_API_KEY / EMAIL_FROM_ADDRESS)", 400);

  const rl = rateLimit(`send-test:${user.id}`, 5, 10 * 60 * 1000);
  if (!rl.ok)
    return jsonError(`Gửi test quá nhiều, thử lại sau ${Math.ceil(rl.retryAfterMs / 1000)}s`, 429);

  const body = await req.json().catch(() => ({}));
  const toEmail = String(body.toEmail || env.adminEmail || "").trim();
  if (!toEmail) return jsonError("Thiếu email người nhận test");

  const ctx = {
    customer: { name: "Khách mẫu", email: toEmail, phone: "0900000000", currentStage: "WARM" },
    offer: { title: "Combo ưu đãi mẫu", offerText: "Giảm 20% cho đơn đầu tiên." },
    unsubscribeUrl: buildUnsubscribeUrl("test-sample"),
    appName: env.emailFromName,
  };

  let subject = "";
  let html = "";
  if (body.templateId) {
    const t = await prisma.emailTemplate.findFirst({
      where: { id: String(body.templateId), workspaceId },
    });
    if (!t) return jsonError("Không tìm thấy template", 404);
    const r = renderTemplate(t, ctx);
    subject = r.subject;
    html = r.html;
  } else {
    subject = renderString(String(body.subject ?? "Test D.C Funnel Bot"), ctx);
    html = renderString(
      String(body.html ?? body.bodyHtml ?? "<p>Đây là email test từ D.C Funnel Bot.</p>"),
      ctx
    );
    if (!/unsubscribe/i.test(html))
      html += `<p style="font-size:12px;color:#888">Test · <a href="${ctx.unsubscribeUrl}">unsubscribe</a></p>`;
  }

  const provider = getEmailProvider();
  if (!provider) return jsonError("Email provider chưa sẵn sàng", 400);

  const result = await provider.sendEmail({
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html,
    headers: { "List-Unsubscribe": `<${ctx.unsubscribeUrl}>` },
  });
  if (!result.ok) return jsonError("Gửi test thất bại: " + (result.error ?? ""), 502);
  return jsonOk({ to: toEmail, providerMessageId: result.providerMessageId });
}
