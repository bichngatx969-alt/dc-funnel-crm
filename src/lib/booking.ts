import { Prisma, type BookingStatus, type ServiceLocationMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeNullableText,
  normalizeText,
  parsePagination,
  parsePositiveInteger,
  parseVnd,
} from "@/lib/order";

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export const SERVICE_LOCATION_MODES = ["ONLINE", "OFFLINE", "CUSTOMER_LOCATION", "HYBRID"] as const;
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED"];

export const serviceProfileSelect = {
  id: true,
  workspaceId: true,
  catalogItemId: true,
  bookingEnabled: true,
  defaultDurationMinutes: true,
  bufferBeforeMinutes: true,
  bufferAfterMinutes: true,
  depositRequired: true,
  depositVnd: true,
  cancellationPolicy: true,
  intakeFormJson: true,
  locationMode: true,
  location: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServiceProfileSelect;

export const serviceVariationSelect = {
  id: true,
  workspaceId: true,
  catalogItemId: true,
  name: true,
  durationMinutes: true,
  priceVnd: true,
  description: true,
  bookingEnabled: true,
  staffIdsJson: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ServiceVariationSelect;

export const bookingInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true, currentStage: true } },
  catalogItem: { select: { id: true, name: true, type: true, basePriceVnd: true, status: true } },
  serviceVariation: { select: serviceVariationSelect },
  staff: { select: { id: true, name: true, email: true } },
  order: { select: { id: true, code: true, status: true, totalVnd: true } },
} satisfies Prisma.BookingInclude;

export { parsePagination };

export function normalizeBookingStatus(value: unknown, fallback: BookingStatus = "PENDING"): BookingStatus {
  const normalized = normalizeText(value).toUpperCase();
  return BOOKING_STATUSES.includes(normalized as BookingStatus) ? (normalized as BookingStatus) : fallback;
}

export function normalizeServiceLocationMode(
  value: unknown,
  fallback: ServiceLocationMode = "OFFLINE"
): ServiceLocationMode {
  const normalized = normalizeText(value).toUpperCase();
  return SERVICE_LOCATION_MODES.includes(normalized as ServiceLocationMode)
    ? (normalized as ServiceLocationMode)
    : fallback;
}

export function parseOptionalNonNegativeInt(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

export function parseDateInput(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function normalizeJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null || value === "") return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export function normalizeStaffIds(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  return Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean))).slice(0, 50);
}

export async function requireBookableCatalogItem(workspaceId: string, catalogItemId: string) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: catalogItemId, workspaceId, deletedAt: null },
    select: { id: true, workspaceId: true, name: true, type: true, basePriceVnd: true, status: true },
  });
  if (!item) return { ok: false as const, error: "Không tìm thấy dịch vụ" };
  if (item.type !== "BOOKABLE_SERVICE") {
    return { ok: false as const, error: "Booking chỉ áp dụng cho catalog item loại BOOKABLE_SERVICE" };
  }
  return { ok: true as const, item };
}

export async function validateCustomerForBooking(customerId: string | null, workspaceId: string) {
  if (!customerId) return true;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, workspaceId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(customer);
}

export async function validateOrderForBooking(orderId: string | null, workspaceId: string, customerId: string | null) {
  if (!orderId) return true;
  const order = await prisma.order.findFirst({
    where: { id: orderId, workspaceId, deletedAt: null },
    select: { id: true, customerId: true },
  });
  if (!order) return false;
  return !customerId || order.customerId === customerId;
}

export async function validateWorkspaceMember(userId: string | null, workspaceId: string) {
  if (!userId) return true;
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, workspace: { deletedAt: null } },
    select: { id: true },
  });
  return Boolean(member);
}

export async function validateStaffIds(workspaceId: string, staffIds: string[]) {
  if (!staffIds.length) return true;
  const count = await prisma.workspaceMember.count({
    where: { workspaceId, userId: { in: staffIds }, workspace: { deletedAt: null } },
  });
  return count === staffIds.length;
}

export async function validateVariationForBooking(
  serviceVariationId: string | null,
  workspaceId: string,
  catalogItemId: string
) {
  if (!serviceVariationId) return null;
  return prisma.serviceVariation.findFirst({
    where: { id: serviceVariationId, workspaceId, catalogItemId, deletedAt: null },
    select: serviceVariationSelect,
  });
}

export async function resolveBookingWindow(input: {
  workspaceId: string;
  catalogItemId: string;
  serviceVariationId: string | null;
  startAt: unknown;
  endAt?: unknown;
}) {
  const startAt = parseDateInput(input.startAt);
  if (!startAt) return { ok: false as const, error: "startAt không hợp lệ" };

  const [profile, variation] = await Promise.all([
    prisma.serviceProfile.findUnique({
      where: { catalogItemId: input.catalogItemId },
      select: {
        defaultDurationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        depositVnd: true,
        location: true,
      },
    }),
    validateVariationForBooking(input.serviceVariationId, input.workspaceId, input.catalogItemId),
  ]);
  if (input.serviceVariationId && !variation) {
    return { ok: false as const, error: "Service variation không thuộc dịch vụ/workspace hiện tại" };
  }

  const explicitEndAt = parseDateInput(input.endAt);
  const duration = variation?.durationMinutes ?? profile?.defaultDurationMinutes ?? 60;
  const endAt = explicitEndAt ?? addMinutes(startAt, duration);
  if (endAt <= startAt) return { ok: false as const, error: "endAt phải sau startAt" };

  return {
    ok: true as const,
    startAt,
    endAt,
    variation,
    profile,
  };
}

export async function hasStaffTimeConflict(input: {
  workspaceId: string;
  staffId: string | null;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}) {
  if (!input.staffId) return false;
  const conflict = await prisma.booking.findFirst({
    where: {
      workspaceId: input.workspaceId,
      staffId: input.staffId,
      deletedAt: null,
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true },
  });
  return Boolean(conflict);
}

export function serviceProfileData(body: Record<string, unknown>) {
  return {
    bookingEnabled: body.bookingEnabled === undefined ? undefined : Boolean(body.bookingEnabled),
    defaultDurationMinutes:
      body.defaultDurationMinutes === undefined
        ? undefined
        : parsePositiveInteger(body.defaultDurationMinutes, 60),
    bufferBeforeMinutes:
      body.bufferBeforeMinutes === undefined ? undefined : parseOptionalNonNegativeInt(body.bufferBeforeMinutes, 0),
    bufferAfterMinutes:
      body.bufferAfterMinutes === undefined ? undefined : parseOptionalNonNegativeInt(body.bufferAfterMinutes, 0),
    depositRequired: body.depositRequired === undefined ? undefined : Boolean(body.depositRequired),
    depositVnd: body.depositVnd === undefined ? undefined : parseVnd(body.depositVnd),
    cancellationPolicy:
      body.cancellationPolicy === undefined ? undefined : normalizeNullableText(body.cancellationPolicy),
    intakeFormJson: body.intakeFormJson === undefined ? undefined : normalizeJson(body.intakeFormJson),
    locationMode: body.locationMode === undefined ? undefined : normalizeServiceLocationMode(body.locationMode),
    location: body.location === undefined ? undefined : normalizeNullableText(body.location),
  };
}

export function serviceVariationData(workspaceId: string, catalogItemId: string, body: Record<string, unknown>) {
  const name = normalizeText(body.name);
  const staffIds = normalizeStaffIds(body.staffIdsJson ?? body.staffIds);
  return {
    workspaceId,
    catalogItemId,
    name,
    durationMinutes: parsePositiveInteger(body.durationMinutes, 60),
    priceVnd: parseVnd(body.priceVnd),
    description: normalizeNullableText(body.description),
    bookingEnabled: body.bookingEnabled === undefined ? true : Boolean(body.bookingEnabled),
    staffIdsJson: staffIds.length ? (staffIds as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
}
