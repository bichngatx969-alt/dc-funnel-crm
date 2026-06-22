import type { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  bookingInclude,
  hasStaffTimeConflict,
  normalizeBookingStatus,
  normalizeJson,
  parseDateInput,
  requireBookableCatalogItem,
  resolveBookingWindow,
  validateCustomerForBooking,
  validateOrderForBooking,
  validateVariationForBooking,
  validateWorkspaceMember,
} from "@/lib/booking";
import { normalizeNullableText, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: bookingInclude,
  });
  if (!booking) return jsonError("Không tìm thấy booking", 404);

  return jsonOk({ booking });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.booking.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      customerId: true,
      catalogItemId: true,
      serviceVariationId: true,
      staffId: true,
      status: true,
      startAt: true,
      endAt: true,
      orderId: true,
    },
  });
  if (!existing) return jsonError("Không tìm thấy booking", 404);

  const body = await req.json().catch(() => ({}));
  const catalogItemId =
    body.catalogItemId === undefined ? existing.catalogItemId : String(body.catalogItemId ?? "").trim();
  if (!catalogItemId) return jsonError("Thiếu catalogItemId");
  const item = await requireBookableCatalogItem(workspaceId, catalogItemId);
  if (!item.ok) return jsonError(item.error, 400);

  const customerId = body.customerId === undefined ? existing.customerId : normalizeNullableText(body.customerId);
  if (!(await validateCustomerForBooking(customerId, workspaceId))) {
    return jsonError("Customer không thuộc workspace hiện tại", 400);
  }

  const serviceVariationId =
    body.serviceVariationId === undefined ? existing.serviceVariationId : normalizeNullableText(body.serviceVariationId);
  if (serviceVariationId && !(await validateVariationForBooking(serviceVariationId, workspaceId, catalogItemId))) {
    return jsonError("Service variation không thuộc dịch vụ/workspace hiện tại", 400);
  }

  let startAt = body.startAt === undefined ? existing.startAt : parseDateInput(body.startAt);
  let endAt = body.endAt === undefined ? existing.endAt : parseDateInput(body.endAt);
  if (body.catalogItemId !== undefined || body.serviceVariationId !== undefined || body.startAt !== undefined) {
    const window = await resolveBookingWindow({
      workspaceId,
      catalogItemId,
      serviceVariationId,
      startAt,
      endAt: body.endAt === undefined ? undefined : endAt,
    });
    if (!window.ok) return jsonError(window.error, 400);
    startAt = window.startAt;
    endAt = window.endAt;
  }
  if (!startAt || !endAt || endAt <= startAt) return jsonError("Khung giờ booking không hợp lệ", 400);

  const staffId = body.staffId === undefined ? existing.staffId : normalizeNullableText(body.staffId);
  if (!(await validateWorkspaceMember(staffId, workspaceId))) {
    return jsonError("Staff không thuộc workspace hiện tại", 400);
  }
  if (await hasStaffTimeConflict({ workspaceId, staffId, startAt, endAt, excludeBookingId: existing.id })) {
    return jsonError("Staff đã có booking trùng khung giờ", 409);
  }

  const orderId = body.orderId === undefined ? existing.orderId : normalizeNullableText(body.orderId);
  if (!(await validateOrderForBooking(orderId, workspaceId, customerId))) {
    return jsonError("Order không thuộc workspace/customer hiện tại", 400);
  }

  const data: Prisma.BookingUncheckedUpdateInput = {
    catalogItemId,
    customerId,
    serviceVariationId,
    staffId,
    startAt,
    endAt,
    orderId,
  };
  if ("status" in body) data.status = normalizeBookingStatus(body.status, existing.status);
  if ("location" in body) data.location = normalizeNullableText(body.location);
  if ("intakeAnswersJson" in body || "intakeAnswers" in body) {
    data.intakeAnswersJson = normalizeJson(body.intakeAnswersJson ?? body.intakeAnswers);
  }
  if ("depositVnd" in body) data.depositVnd = parseVnd(body.depositVnd);
  if ("note" in body) data.note = normalizeNullableText(body.note);
  if ("deleted" in body) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const booking = await prisma.$transaction(
    async (tx) => {
      await tx.booking.update({ where: { id: existing.id }, data });
      if (customerId) {
        await tx.customer.update({ where: { id: customerId }, data: { lastActivityAt: new Date() } });
      }
      return tx.booking.findUniqueOrThrow({ where: { id: existing.id }, include: bookingInclude });
    },
    { timeout: 15000 }
  );

  return jsonOk({ booking });
}
