import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { env } from "@/lib/env";
import { renderTemplate, renderString, buildTemplateContext } from "@/lib/email/renderer";
import { pickOfferForCustomer } from "@/lib/email/send";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Preview template với 1 customer thật (customerId) hoặc dữ liệu mẫu.
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const body = await req.json().catch(() => ({}));

  let ctx: any;
  if (body.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: String(body.customerId), workspaceId },
    });
    if (!customer) return jsonError("Không tìm thấy khách", 404);
    const offer = await pickOfferForCustomer(customer).catch(() => null);
    ctx = buildTemplateContext(customer, offer);
  } else {
    ctx = {
      customer: { name: "Khách mẫu", email: "khachmau@example.com", phone: "0900000000", currentStage: "WARM" },
      offer: { title: "Combo ưu đãi mẫu", offerText: "Giảm 20% cho đơn đầu tiên." },
      unsubscribeUrl: buildUnsubscribeUrl("test-sample"),
      appName: env.emailFromName,
    };
  }

  let subject: string;
  let html: string;
  if (body.templateId) {
    const t = await prisma.emailTemplate.findFirst({
      where: { id: String(body.templateId), workspaceId },
    });
    if (!t) return jsonError("Không tìm thấy template", 404);
    const r = renderTemplate(t, ctx);
    subject = r.subject;
    html = r.html;
  } else {
    subject = renderString(String(body.subject ?? ""), ctx);
    html = renderString(String(body.bodyHtml ?? ""), ctx);
  }

  return jsonOk({ subject, html });
}
