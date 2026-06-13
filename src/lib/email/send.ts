import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "./index";
import { renderTemplate, renderString, buildTemplateContext } from "./renderer";
import { recordUnsubscribeToken } from "./unsubscribe";
import { isValidEmail } from "@/lib/funnel/email";

const BLOCKED_STATUSES = ["UNSUBSCRIBED", "BOUNCED", "COMPLAINED"];

// Kiểm tra khách có được phép nhận email marketing/automation không.
export function canEmailCustomer(customer: Customer): { ok: boolean; reason?: string } {
  if (!customer.email || !isValidEmail(customer.email)) return { ok: false, reason: "no_email" };
  if (!customer.emailConsent) return { ok: false, reason: "no_consent" };
  if (customer.unsubscribedAt) return { ok: false, reason: "unsubscribed" };
  if (BLOCKED_STATUSES.includes(customer.emailStatus))
    return { ok: false, reason: customer.emailStatus.toLowerCase() };
  return { ok: true };
}

// Chọn offer gợi ý cho email (theo pageId + tag + stage). Offer MVP không còn field brand.
export async function pickOfferForCustomer(
  customer: Customer
): Promise<{ title: string; offerText: string } | null> {
  const offers = await prisma.offer.findMany({
    where: { isActive: true, OR: [{ pageId: customer.pageId }, { pageId: null }] },
    orderBy: { priority: "desc" },
  });
  if (!offers.length) return null;
  const pageSpecific = offers.filter((o) => o.pageId === customer.pageId);
  const pool = pageSpecific.length ? pageSpecific : offers;
  const byTag = pool.find((o) => o.triggerTag && customer.tags.includes(o.triggerTag));
  const chosen =
    byTag ?? pool.find((o) => o.customerStage === customer.currentStage) ?? pool[0];
  return { title: chosen.title, offerText: chosen.offerText };
}

export type SendToCustomerOpts = {
  customerId: string;
  templateId?: string | null;
  sequenceId?: string | null;
  subjectOverride?: string;
  htmlOverride?: string;
  textOverride?: string;
  bypassConsent?: boolean; // test/admin one-off
  toOverride?: string; // gửi tới địa chỉ khác (test)
};

export type SendResult = { ok: boolean; logId?: string; error?: string; providerMessageId?: string };

// Gửi 1 email tới khách + ghi EmailLog. Dùng chung cho one-off, test, sequence step.
export async function sendEmailToCustomer(opts: SendToCustomerOpts): Promise<SendResult> {
  const customer = await prisma.customer.findUnique({ where: { id: opts.customerId } });
  if (!customer) return { ok: false, error: "customer_not_found" };

  // Consent gate (trừ khi bypass cho admin/test).
  if (!opts.bypassConsent) {
    const gate = canEmailCustomer(customer);
    if (!gate.ok) {
      await prisma.emailLog.create({
        data: {
          customerId: customer.id,
          templateId: opts.templateId ?? null,
          sequenceId: opts.sequenceId ?? null,
          provider: "RESEND",
          toEmail: customer.email ?? "(none)",
          subject: "(blocked)",
          status: "FAILED",
          errorMessage: `blocked:${gate.reason}`,
        },
      });
      return { ok: false, error: `blocked:${gate.reason}` };
    }
  }

  const offer = await pickOfferForCustomer(customer).catch(() => null);
  const ctx = buildTemplateContext(customer, offer);
  await recordUnsubscribeToken(customer.id);

  // Resolve nội dung: từ template hoặc override (đều render biến).
  let subject = "";
  let html = "";
  let text: string | undefined;
  if (opts.templateId) {
    const t = await prisma.emailTemplate.findUnique({ where: { id: opts.templateId } });
    if (!t) return { ok: false, error: "template_not_found" };
    const r = renderTemplate(t, ctx);
    subject = r.subject;
    html = r.html;
    text = r.text;
  } else {
    subject = renderString(opts.subjectOverride ?? "", ctx);
    html = renderString(opts.htmlOverride ?? "", ctx);
    text = opts.textOverride ? renderString(opts.textOverride, ctx) : undefined;
    if (!/unsubscribe/i.test(html)) {
      html += `\n<p style="font-size:12px;color:#888;margin-top:24px">Hủy đăng ký: <a href="${ctx.unsubscribeUrl}">tại đây</a>.</p>`;
    }
  }

  const toEmail = opts.toOverride ?? customer.email ?? "";
  if (!toEmail) return { ok: false, error: "no_recipient" };

  // Tạo log QUEUED trước khi gửi.
  const log = await prisma.emailLog.create({
    data: {
      customerId: customer.id,
      templateId: opts.templateId ?? null,
      sequenceId: opts.sequenceId ?? null,
      provider: "RESEND",
      toEmail,
      subject,
      status: "QUEUED",
      metadataJson: opts.bypassConsent ? { mode: "bypass_consent" } : undefined,
    },
  });

  const provider = getEmailProvider();
  if (!provider) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMessage: "email_disabled" },
    });
    return { ok: false, logId: log.id, error: "email_disabled" };
  }

  const result = await provider.sendEmail({
    to: toEmail,
    subject,
    html,
    text,
    headers: { "List-Unsubscribe": `<${ctx.unsubscribeUrl}>` },
  });

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      providerMessageId: result.providerMessageId ?? null,
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.ok ? null : result.error ?? "send_failed",
    },
  });

  return {
    ok: result.ok,
    logId: log.id,
    providerMessageId: result.providerMessageId,
    error: result.ok ? undefined : result.error,
  };
}
