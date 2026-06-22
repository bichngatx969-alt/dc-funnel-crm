import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  enrichPackageComponents,
  normalizePackagePricingMode,
  packageComponentSelect,
  requirePackageCatalogItem,
  validatePackageComponentInput,
} from "@/lib/catalog-packages";
import { parsePositiveInteger } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id, componentId } = await params;

  const item = await requirePackageCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const existing = await prisma.packageComponent.findFirst({
    where: { id: componentId, workspaceId, packageItemId: id, deletedAt: null },
    select: packageComponentSelect,
  });
  if (!existing) return jsonError("Không tìm thấy component", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.PackageComponentUncheckedUpdateInput = {};
  if ("componentItemId" in body || "componentVariantId" in body) {
    const componentInput = await validatePackageComponentInput({
      workspaceId,
      packageItemId: id,
      componentItemId: body.componentItemId ?? existing.componentItemId,
      componentVariantId: body.componentVariantId === undefined ? existing.componentVariantId : body.componentVariantId,
      excludeComponentId: existing.id,
    });
    if (!componentInput.ok) return jsonError(componentInput.error, 400);
    data.componentItemId = componentInput.componentItemId;
    data.componentVariantId = componentInput.componentVariantId;
  }
  if ("quantity" in body) data.quantity = parsePositiveInteger(body.quantity, existing.quantity);
  if ("pricingMode" in body) {
    data.pricingMode = normalizePackagePricingMode(body.pricingMode, normalizePackagePricingMode(existing.pricingMode));
  }
  if ("deleted" in body) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const component = await prisma.packageComponent.update({
    where: { id: existing.id },
    data,
    select: packageComponentSelect,
  });
  const [enriched] = await enrichPackageComponents(workspaceId, [component]);

  return jsonOk({ component: enriched });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id, componentId } = await params;

  const item = await requirePackageCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const existing = await prisma.packageComponent.findFirst({
    where: { id: componentId, workspaceId, packageItemId: id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return jsonError("Không tìm thấy component", 404);

  await prisma.packageComponent.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  return jsonOk({ deleted: true });
}
