import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { catalogCategorySelect, normalizeSlug } from "@/lib/catalog";
import { normalizeNullableText, normalizeText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.catalogCategory.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: catalogCategorySelect,
  });
  if (!existing) return jsonError("Không tìm thấy danh mục", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CatalogCategoryUpdateInput = {};
  if (body.deleted === true) data.deletedAt = new Date();
  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên danh mục không được để trống");
    data.name = name;
    if (!("slug" in body)) data.slug = existing.slug;
  }
  if ("slug" in body) data.slug = normalizeSlug(body.slug, ("name" in body ? body.name : existing.name) ?? existing.name);
  if ("parentId" in body) {
    const parentId = normalizeNullableText(body.parentId);
    if (parentId) {
      const parent = await prisma.catalogCategory.findFirst({
        where: { id: parentId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) return jsonError("Danh mục cha không thuộc workspace hiện tại", 400);
    }
    data.parentId = parentId;
  }
  if ("position" in body && Number.isFinite(Number(body.position))) {
    data.position = Math.round(Number(body.position));
  }

  const category = await prisma.catalogCategory.update({
    where: { id: existing.id },
    data,
    select: catalogCategorySelect,
  });

  return jsonOk({ category });
}
