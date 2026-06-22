import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import {
  parsePagination,
  requireBookableCatalogItem,
  serviceVariationData,
  serviceVariationSelect,
  validateStaffIds,
} from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requireBookableCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, 404);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const includeInactive = searchParams.get("includeInactive") === "true";
  const where: Prisma.ServiceVariationWhereInput = {
    workspaceId,
    catalogItemId: id,
    deletedAt: null,
    ...(includeInactive ? {} : { bookingEnabled: true }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.serviceVariation.findMany({
      where,
      select: serviceVariationSelect,
      orderBy: [{ createdAt: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.serviceVariation.count({ where }),
  ]);

  return jsonOk({
    items,
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requireBookableCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, 404);

  const body = await req.json().catch(() => ({}));
  const data = serviceVariationData(workspaceId, id, body);
  if (!data.name) return jsonError("Tên biến thể dịch vụ không được để trống");
  const staffIds = Array.isArray(data.staffIdsJson) ? data.staffIdsJson.map(String) : [];
  if (!(await validateStaffIds(workspaceId, staffIds))) {
    return jsonError("staffIds có user không thuộc workspace hiện tại", 400);
  }

  const variation = await prisma.serviceVariation.create({
    data,
    select: serviceVariationSelect,
  });

  return jsonOk({ variation }, 201);
}
