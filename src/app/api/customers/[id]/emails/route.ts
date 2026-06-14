import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Lịch sử email đã gửi cho khách.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!customer) return jsonError("Không tìm thấy khách", 404);
  const logs = await prisma.emailLog.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk(logs);
}
