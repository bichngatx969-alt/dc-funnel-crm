import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { isEmailEnabled } from "@/lib/env";
import { sendEmailToCustomer } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Gửi email one-off cho 1 khách (tôn trọng consent). templateId hoặc subject+html.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  if (!isEmailEnabled()) return jsonError("Email chưa bật (thiếu RESEND_API_KEY / EMAIL_FROM_ADDRESS)", 400);

  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!customer) return jsonError("Không tìm thấy khách", 404);
  const body = await req.json().catch(() => ({}));
  const templateId = body.templateId ? String(body.templateId) : undefined;
  const subject = body.subject ? String(body.subject) : undefined;
  const html = body.html ? String(body.html) : body.bodyHtml ? String(body.bodyHtml) : undefined;

  if (!templateId && (!subject || !html))
    return jsonError("Cần templateId hoặc subject + html");

  const result = await sendEmailToCustomer({
    customerId: id,
    templateId,
    subjectOverride: subject,
    htmlOverride: html,
  });

  if (!result.ok) {
    const blocked = (result.error ?? "").startsWith("blocked");
    return jsonError("Gửi email thất bại: " + (result.error ?? ""), blocked ? 400 : 502);
  }
  return jsonOk(result);
}
