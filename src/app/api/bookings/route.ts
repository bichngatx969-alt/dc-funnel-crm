import type { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  bookingInclude,
  hasStaffTimeConflict,
  normalizeBookingStatus,
  normalizeJson,
  parsePagination,
  requireBookableCatalogItem,
  resolveBookingWindow,
  validateCustomerForBooking,
  validateOrderForBooking,
  validateWorkspaceMember,
} from "@/lib/booking";
import { normalizeNullableText, parseVnd } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const customerId = normalizeNullableText(searchParams.get("customerId"));
  const catalogItemId = normalizeNullableText(searchParams.get("catalogItemId"));
  const serviceVariationId = normalizeNullableText(searchParams.get("serviceVariationId"));
  const staffId = normalizeNullableText(searchParams.get("staffId"));
  const statusParam = normalizeNullableText(searchParams.get("status"));
  const from = searchParams.get("from") ? new Date(String(searchParams.get("from"))) : null;
  const to = searchParams.get("to") ? new Date(String(searchParams.get("to"))) : null;

  const where: Prisma.BookingWhereInput = {
    workspaceId,
    deletedAt: null,
  };
  if (customerId) where.customerId = customerId;
  if (catalogItemId) where.catalogItemId = catalogItemId;
  if (serviceVariationId) where.serviceVariationId = serviceVariationId;
  if (staffId) where.staffId = staffId === "unassigned" ? null : staffId;
  if (statusParam) where.status = normalizeBookingStatus(statusParam);
  if (from && !Number.isNaN(from.getTime())) where.endAt = { gt: from };
  if (to && !Number.isNaN(to.getTime())) where.startAt = { ...(where.startAt as Prisma.DateTimeFilter), lt: to };

  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ startAt: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  return jsonOk({
    items,
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));

  const catalogItemId = String(body.catalogItemId ?? "").trim();
  if (!catalogItemId) return jsonError("Thiếu catalogItemId");
  const item = await requireBookableCatalogItem(workspaceId, catalogItemId);
  if (!item.ok) return jsonError(item.error, 400);

  const customerId = normalizeNullableText(body.customerId);
  if (!(await validateCustomerForBooking(customerId, workspaceId))) {
    return jsonError("Customer không thuộc workspace hiện tại", 400);
  }

  const serviceVariationId = normalizeNullableText(body.serviceVariationId);
  const window = await resolveBookingWindow({
    workspaceId,
    catalogItemId,
    serviceVariationId,
    startAt: body.startAt,
    endAt: body.endAt,
  });
  if (!window.ok) return jsonError(window.error, 400);

  const staffId = normalizeNullableText(body.staffId);
  if (!(await validateWorkspaceMember(staffId, workspaceId))) {
    return jsonError("Staff không thuộc workspace hiện tại", 400);
  }
  if (await hasStaffTimeConflict({ workspaceId, staffId, startAt: window.startAt, endAt: window.endAt })) {
    return jsonError("Staff đã có booking trùng khung giờ", 409);
  }

  const orderId = normalizeNullableText(body.orderId);
  if (!(await validateOrderForBooking(orderId, workspaceId, customerId))) {
    return jsonError("Order không thuộc workspace/customer hiện tại", 400);
  }

  const booking = await prisma.$transaction(
    async (tx) => {
      const created = await tx.booking.create({
        data: {
          workspaceId,
          customerId,
          catalogItemId,
          serviceVariationId,
          staffId,
          status: normalizeBookingStatus(body.status),
          startAt: window.startAt,
          endAt: window.endAt,
          location: normalizeNullableText(body.location) ?? window.profile?.location ?? null,
          intakeAnswersJson: normalizeJson(body.intakeAnswersJson ?? body.intakeAnswers),
          depositVnd: body.depositVnd === undefined ? window.profile?.depositVnd ?? 0 : parseVnd(body.depositVnd),
          orderId,
          note: normalizeNullableText(body.note),
        },
        include: bookingInclude,
      });

      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { lastActivityAt: created.createdAt },
        });
      }

      return created;
    },
    { timeout: 15000 }
  );

  return jsonOk({ booking }, 201);
}
