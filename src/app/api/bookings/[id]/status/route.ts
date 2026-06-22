import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { bookingInclude, normalizeBookingStatus } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.booking.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true, status: true, customerId: true },
  });
  if (!existing) return jsonError("Không tìm thấy booking", 404);

  const body = await req.json().catch(() => ({}));
  const status = normalizeBookingStatus(body.status, existing.status);
  const booking = await prisma.$transaction(
    async (tx) => {
      await tx.booking.update({
        where: { id: existing.id },
        data: { status, ...(body.note !== undefined ? { note: String(body.note ?? "").trim() || null } : {}) },
      });
      if (existing.customerId) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { lastActivityAt: new Date() } });
      }
      return tx.booking.findUniqueOrThrow({ where: { id: existing.id }, include: bookingInclude });
    },
    { timeout: 15000 }
  );

  return jsonOk({ booking });
}
