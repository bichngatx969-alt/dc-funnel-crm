import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import {
  normalizeStaffIds,
  parseOptionalNonNegativeInt,
  parsePagination,
  requireBookableCatalogItem,
  serviceVariationSelect,
  validateStaffIds,
} from "@/lib/booking";
import { normalizeNullableText, normalizeText, parsePositiveInteger, parseVnd } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; variationId: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id, variationId } = await params;

  const item = await requireBookableCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, 404);

  const existing = await prisma.serviceVariation.findFirst({
    where: { id: variationId, workspaceId, catalogItemId: id, deletedAt: null },
    select: serviceVariationSelect,
  });
  if (!existing) return jsonError("Không tìm thấy biến thể dịch vụ", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.ServiceVariationUpdateInput = {};
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên biến thể dịch vụ không được để trống");
    data.name = name;
  }
  if ("durationMinutes" in body) data.durationMinutes = parsePositiveInteger(body.durationMinutes, existing.durationMinutes);
  if ("priceVnd" in body) data.priceVnd = parseVnd(body.priceVnd);
  if ("description" in body) data.description = normalizeNullableText(body.description);
  if ("bookingEnabled" in body) data.bookingEnabled = Boolean(body.bookingEnabled);
  if ("staffIdsJson" in body || "staffIds" in body) {
    const staffIds = normalizeStaffIds(body.staffIdsJson ?? body.staffIds);
    if (!(await validateStaffIds(workspaceId, staffIds))) {
      return jsonError("staffIds có user không thuộc workspace hiện tại", 400);
    }
    data.staffIdsJson = staffIds.length ? staffIds : Prisma.JsonNull;
  }
  if ("deleted" in body) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const variation = await prisma.serviceVariation.update({
    where: { id: existing.id },
    data,
    select: serviceVariationSelect,
  });

  return jsonOk({ variation });
}
