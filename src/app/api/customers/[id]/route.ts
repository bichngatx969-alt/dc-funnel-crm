import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return jsonError("Không tìm thấy khách", 404);
  return jsonOk(customer);
}

// Cập nhật tên / số điện thoại khách.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.name !== undefined) data.name = body.name ? String(body.name) : null;
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null;
  if (body.email !== undefined) data.email = body.email ? String(body.email).trim().toLowerCase() : null;
  if (body.emailConsent !== undefined) {
    data.emailConsent = Boolean(body.emailConsent);
    if (body.emailConsent) {
      data.emailStatus = "SUBSCRIBED";
      data.unsubscribedAt = null;
    }
  }
  if (
    body.emailStatus !== undefined &&
    ["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"].includes(body.emailStatus)
  ) {
    data.emailStatus = body.emailStatus;
    if (body.emailStatus === "UNSUBSCRIBED") {
      data.emailConsent = false;
      data.unsubscribedAt = new Date();
    }
  }

  try {
    const customer = await prisma.customer.update({ where: { id }, data });
    return jsonOk(customer);
  } catch {
    return jsonError("Không tìm thấy khách", 404);
  }
}
