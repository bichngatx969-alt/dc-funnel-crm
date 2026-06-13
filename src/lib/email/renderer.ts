import type { Customer } from "@prisma/client";
import { env } from "@/lib/env";
import { buildUnsubscribeUrl } from "./unsubscribe";

export type TemplateContext = Record<string, any>;

// Xây context cho render template từ customer (+ offer gợi ý nếu có).
export function buildTemplateContext(
  customer: Customer,
  offer?: { title?: string; offerText?: string } | null
): TemplateContext {
  return {
    customer: {
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      currentStage: customer.currentStage ?? "",
    },
    offer: { title: offer?.title ?? "", offerText: offer?.offerText ?? "" },
    unsubscribeUrl: buildUnsubscribeUrl(customer.id),
    appName: env.emailFromName,
  };
}

// Thay {{a.b}} bằng giá trị trong context. Biến thiếu -> chuỗi rỗng (không crash).
export function renderString(tpl: string, ctx: TemplateContext): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const val = path
      .split(".")
      .reduce<any>((o, k) => (o == null ? undefined : o[k]), ctx);
    return val == null ? "" : String(val);
  });
}

// Render 1 template (subject + html + text). Tự chèn link unsubscribe nếu thiếu (compliance).
export function renderTemplate(
  t: { subject: string; bodyHtml: string; bodyText?: string | null; preheader?: string | null },
  ctx: TemplateContext
): { subject: string; html: string; text?: string; preheader?: string } {
  const subject = renderString(t.subject, ctx);
  let html = renderString(t.bodyHtml, ctx);

  if (!/unsubscribe/i.test(html) && ctx.unsubscribeUrl) {
    html += `\n<p style="font-size:12px;color:#888;margin-top:24px">Nếu không muốn nhận email này nữa, <a href="${ctx.unsubscribeUrl}">bấm vào đây để hủy đăng ký</a>.</p>`;
  }

  const text = t.bodyText ? renderString(t.bodyText, ctx) : undefined;
  const preheader = t.preheader ? renderString(t.preheader, ctx) : undefined;
  return { subject, html, text, preheader };
}
