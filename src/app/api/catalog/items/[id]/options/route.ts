import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogOptionSelect,
  normalizeOptionValues,
  optionValuesToJson,
  requirePhysicalCatalogItem,
} from "@/lib/catalog-variants";
import { normalizeText, parsePagination } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const where: Prisma.CatalogOptionWhereInput = { workspaceId, catalogItemId: id, deletedAt: null };
  const [items, total] = await prisma.$transaction([
    prisma.catalogOption.findMany({
      where,
      select: catalogOptionSelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.catalogOption.count({ where }),
  ]);

  return jsonOk({ items, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const body = await req.json().catch(() => ({}));
  const name = normalizeText(body.name);
  if (!name) return jsonError("Tên option không được để trống");
  const values = normalizeOptionValues(body.valuesJson ?? body.values);
  if (!values.length) return jsonError("Option cần ít nhất một giá trị");

  const option = await prisma.catalogOption.create({
    data: {
      workspaceId,
      catalogItemId: id,
      name,
      valuesJson: optionValuesToJson(values),
      position: Number.isFinite(Number(body.position)) ? Math.max(0, Math.round(Number(body.position))) : 0,
    },
    select: catalogOptionSelect,
  });

  return jsonOk({ option }, 201);
}
