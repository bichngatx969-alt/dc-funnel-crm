import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { catalogCategorySelect, normalizeSlug } from "@/lib/catalog";
import { normalizeNullableText, normalizeText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();

  const where: Prisma.CatalogCategoryWhereInput = { workspaceId, deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const categories = await prisma.catalogCategory.findMany({
    where,
    select: catalogCategorySelect,
    orderBy: [{ position: "asc" }, { name: "asc" }],
    take: 200,
  });

  return jsonOk({ categories });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const body = await req.json().catch(() => ({}));
  const name = normalizeText(body.name);
  if (!name) return jsonError("Tên danh mục không được để trống");

  const parentId = normalizeNullableText(body.parentId);
  if (parentId) {
    const parent = await prisma.catalogCategory.findFirst({
      where: { id: parentId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) return jsonError("Danh mục cha không thuộc workspace hiện tại", 400);
  }

  const category = await prisma.catalogCategory.create({
    data: {
      workspaceId,
      name,
      slug: normalizeSlug(body.slug, name),
      parentId,
      position: Number.isFinite(Number(body.position)) ? Math.round(Number(body.position)) : 0,
    },
    select: catalogCategorySelect,
  });

  return jsonOk({ category }, 201);
}
