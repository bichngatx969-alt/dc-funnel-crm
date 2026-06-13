import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const ALLOWED = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"] as const;

// Sửa stage (giai đoạn phễu) của khách.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const stage = String(body.stage ?? "");

  if (!ALLOWED.includes(stage as (typeof ALLOWED)[number])) {
    return jsonError("Stage không hợp lệ");
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { currentStage: stage as (typeof ALLOWED)[number] },
    });
    return jsonOk(customer);
  } catch {
    return jsonError("Không tìm thấy khách", 404);
  }
}
