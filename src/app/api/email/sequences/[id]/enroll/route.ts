import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enrollCustomerToSequence } from "@/lib/email/automation";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Enroll 1 khách vào sequence thủ công.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId ?? "");
  if (!customerId) return jsonError("Thiếu customerId");
  const [customer, sequence] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, workspaceId }, select: { id: true } }),
    prisma.emailSequence.findFirst({ where: { id, workspaceId }, select: { id: true } }),
  ]);
  if (!customer) return jsonError("Không tìm thấy khách", 404);
  if (!sequence) return jsonError("Không tìm thấy sequence", 404);

  const result = await enrollCustomerToSequence(customerId, id);
  return jsonOk(result);
}
