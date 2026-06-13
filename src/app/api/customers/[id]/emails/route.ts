import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Lịch sử email đã gửi cho khách.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;
  const logs = await prisma.emailLog.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk(logs);
}
