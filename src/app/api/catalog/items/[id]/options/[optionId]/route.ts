import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogOptionSelect,
  normalizeOptionValues,
  optionValuesToJson,
  requirePhysicalCatalogItem,
} from "@/lib/catalog-variants";
import { normalizeText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id, optionId } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const existing = await prisma.catalogOption.findFirst({
    where: { id: optionId, workspaceId, catalogItemId: id, deletedAt: null },
    select: catalogOptionSelect,
  });
  if (!existing) return jsonError("Không tìm thấy option", 404);

  const body = await _req.json().catch(() => ({}));
  const data: Prisma.CatalogOptionUpdateInput = {};
  if (body.deleted === true) data.deletedAt = new Date();
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên option không được để trống");
    data.name = name;
  }
  if ("valuesJson" in body || "values" in body) {
    const values = normalizeOptionValues(body.valuesJson ?? body.values);
    if (!values.length) return jsonError("Option cần ít nhất một giá trị");
    data.valuesJson = optionValuesToJson(values);
  }
  if ("position" in body && Number.isFinite(Number(body.position))) {
    data.position = Math.max(0, Math.round(Number(body.position)));
  }

  const option = await prisma.catalogOption.update({ where: { id: existing.id }, data, select: catalogOptionSelect });
  return jsonOk({ option });
}
