import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

function page(title: string, msg: string, ok: boolean): Response {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,Arial,sans-serif;background:#f3f4f6;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}.card{background:#fff;padding:32px 28px;border-radius:14px;box-shadow:0 1px 6px rgba(0,0,0,.08);max-width:440px;text-align:center}h1{color:${ok ? "#16a34a" : "#dc2626"};font-size:20px;margin:0 0 8px}p{color:#374151;line-height:1.5;margin:0}</style></head><body><div class="card"><h1>${title}</h1><p>${msg}</p></div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET /api/unsubscribe?token=... — hủy đăng ký email cho khách.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const customerId = token ? verifyUnsubscribeToken(token) : null;
  if (!customerId) {
    return page("Link không hợp lệ", "Link hủy đăng ký không hợp lệ hoặc đã hết hạn.", false);
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { emailStatus: "UNSUBSCRIBED", emailConsent: false, unsubscribedAt: new Date() },
    });
    await prisma.emailAutomationEnrollment.updateMany({
      where: { customerId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
  } catch {
    return page("Không tìm thấy", "Không tìm thấy thông tin đăng ký của bạn.", false);
  }

  return page("Đã hủy đăng ký", "Bạn sẽ không nhận email từ chúng tôi nữa. Cảm ơn bạn!", true);
}
