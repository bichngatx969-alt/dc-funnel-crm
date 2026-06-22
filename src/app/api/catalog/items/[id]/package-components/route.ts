import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  enrichPackageComponents,
  packageComponentData,
  packageComponentSelect,
  requirePackageCatalogItem,
  validatePackageComponentInput,
} from "@/lib/catalog-packages";
import { parsePagination } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePackageCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const [rawItems, total] = await prisma.$transaction([
    prisma.packageComponent.findMany({
      where: { workspaceId, packageItemId: id, deletedAt: null },
      select: packageComponentSelect,
      orderBy: [{ createdAt: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.packageComponent.count({ where: { workspaceId, packageItemId: id, deletedAt: null } }),
  ]);
  const items = await enrichPackageComponents(workspaceId, rawItems);
  const retailValueVnd = items.reduce((sum, component) => sum + component.retailValueVnd, 0);

  return jsonOk({
    items,
    summary: {
      count: items.length,
      retailValueVnd,
      packagePriceVnd: item.item.basePriceVnd,
      savingsVnd: Math.max(0, retailValueVnd - item.item.basePriceVnd),
    },
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePackageCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const body = await req.json().catch(() => ({}));
  const componentInput = await validatePackageComponentInput({
    workspaceId,
    packageItemId: id,
    componentItemId: body.componentItemId,
    componentVariantId: body.componentVariantId,
  });
  if (!componentInput.ok) return jsonError(componentInput.error, 400);

  const data = packageComponentData(body);
  const component = await prisma.packageComponent.create({
    data: {
      workspaceId,
      packageItemId: id,
      componentItemId: componentInput.componentItemId,
      componentVariantId: componentInput.componentVariantId,
      ...data,
    },
    select: packageComponentSelect,
  });
  const [enriched] = await enrichPackageComponents(workspaceId, [component]);

  return jsonOk({ component: enriched }, 201);
}
