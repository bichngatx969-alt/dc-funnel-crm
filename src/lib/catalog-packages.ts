import { Prisma } from "@prisma/client";
import { catalogItemSelect } from "@/lib/catalog";
import { normalizeNullableText, normalizeText, parsePositiveInteger } from "@/lib/order";
import { prisma } from "@/lib/prisma";

export const PACKAGE_PRICING_MODES = ["INCLUDED", "DISCOUNTED", "ADD_ON"] as const;
export type PackagePricingMode = (typeof PACKAGE_PRICING_MODES)[number];

export const packageComponentSelect = {
  id: true,
  workspaceId: true,
  packageItemId: true,
  componentItemId: true,
  componentVariantId: true,
  quantity: true,
  pricingMode: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.PackageComponentSelect;

const packageCatalogItemSelect = catalogItemSelect;

const packageVariantSelect = {
  id: true,
  workspaceId: true,
  catalogItemId: true,
  name: true,
  sku: true,
  optionValuesJson: true,
  priceVnd: true,
  costVnd: true,
  inventoryTracked: true,
  inventoryQuantity: true,
  status: true,
  deletedAt: true,
} satisfies Prisma.CatalogVariantSelect;

export type PackageComponentDTO = Prisma.PackageComponentGetPayload<{ select: typeof packageComponentSelect }> & {
  componentItem: Prisma.CatalogItemGetPayload<{ select: typeof packageCatalogItemSelect }> | null;
  componentVariant: Prisma.CatalogVariantGetPayload<{ select: typeof packageVariantSelect }> | null;
  retailValueVnd: number;
  available: boolean;
  warning: string | null;
};

export function normalizePackagePricingMode(value: unknown, fallback: PackagePricingMode = "INCLUDED"): PackagePricingMode {
  const normalized = normalizeText(value).toUpperCase();
  return PACKAGE_PRICING_MODES.includes(normalized as PackagePricingMode)
    ? (normalized as PackagePricingMode)
    : fallback;
}

export async function requirePackageCatalogItem(workspaceId: string, catalogItemId: string) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: catalogItemId, workspaceId, deletedAt: null },
    select: { id: true, workspaceId: true, name: true, type: true, basePriceVnd: true, status: true },
  });
  if (!item) return { ok: false as const, error: "Không tìm thấy package" };
  if (item.type !== "PACKAGE") {
    return { ok: false as const, error: "Bundle builder chỉ áp dụng cho catalog item loại PACKAGE" };
  }
  return { ok: true as const, item };
}

export async function validatePackageComponentInput(input: {
  workspaceId: string;
  packageItemId: string;
  componentItemId: unknown;
  componentVariantId?: unknown;
  excludeComponentId?: string;
}) {
  const componentItemId = normalizeNullableText(input.componentItemId);
  if (!componentItemId) return { ok: false as const, error: "Thiếu componentItemId" };
  if (componentItemId === input.packageItemId) {
    return { ok: false as const, error: "Package không thể tự chứa chính nó" };
  }

  const componentItem = await prisma.catalogItem.findFirst({
    where: { id: componentItemId, workspaceId: input.workspaceId, deletedAt: null },
    select: packageCatalogItemSelect,
  });
  if (!componentItem) return { ok: false as const, error: "Component item không thuộc workspace hiện tại" };
  if (componentItem.status === "ARCHIVED") {
    return { ok: false as const, error: "Không thể thêm catalog item đã ẩn vào package" };
  }

  if (componentItem.type === "PACKAGE") {
    const reverse = await prisma.packageComponent.findFirst({
      where: {
        workspaceId: input.workspaceId,
        packageItemId: componentItem.id,
        componentItemId: input.packageItemId,
        deletedAt: null,
        ...(input.excludeComponentId ? { id: { not: input.excludeComponentId } } : {}),
      },
      select: { id: true },
    });
    if (reverse) return { ok: false as const, error: "Không thể tạo vòng lặp package lồng nhau" };
  }

  const componentVariantId = normalizeNullableText(input.componentVariantId);
  const componentVariant = componentVariantId
    ? await prisma.catalogVariant.findFirst({
        where: {
          id: componentVariantId,
          workspaceId: input.workspaceId,
          catalogItemId: componentItem.id,
          deletedAt: null,
        },
        select: packageVariantSelect,
      })
    : null;
  if (componentVariantId && !componentVariant) {
    return { ok: false as const, error: "Component variant không thuộc sản phẩm/workspace hiện tại" };
  }

  return { ok: true as const, componentItem, componentVariant, componentItemId, componentVariantId };
}

export function packageComponentData(body: Record<string, unknown>) {
  return {
    quantity: parsePositiveInteger(body.quantity, 1),
    pricingMode: normalizePackagePricingMode(body.pricingMode),
  };
}

export async function enrichPackageComponents<
  T extends Prisma.PackageComponentGetPayload<{ select: typeof packageComponentSelect }>,
>(workspaceId: string, components: T[]): Promise<Array<T & Omit<PackageComponentDTO, keyof T>>> {
  const componentItemIds = Array.from(new Set(components.map((component) => component.componentItemId).filter(Boolean)));
  const componentVariantIds = Array.from(
    new Set(components.map((component) => component.componentVariantId).filter((id): id is string => Boolean(id)))
  );
  const [items, variants] = await Promise.all([
    componentItemIds.length
      ? prisma.catalogItem.findMany({
          where: { id: { in: componentItemIds }, workspaceId, deletedAt: null },
          select: packageCatalogItemSelect,
        })
      : [],
    componentVariantIds.length
      ? prisma.catalogVariant.findMany({
          where: { id: { in: componentVariantIds }, workspaceId, deletedAt: null },
          select: packageVariantSelect,
        })
      : [],
  ]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  return components.map((component) => {
    const componentItem = itemById.get(component.componentItemId) ?? null;
    const componentVariant = component.componentVariantId ? variantById.get(component.componentVariantId) ?? null : null;
    const unitValue = componentVariant?.priceVnd ?? componentItem?.basePriceVnd ?? 0;
    const available =
      Boolean(componentItem) &&
      componentItem?.status !== "ARCHIVED" &&
      (!componentVariant ||
        (componentVariant.status === "ACTIVE" &&
          (!componentVariant.inventoryTracked || componentVariant.inventoryQuantity >= component.quantity)));
    const warning = !componentItem
      ? "Component item không còn tồn tại"
      : componentItem.status === "ARCHIVED"
        ? "Component item đã ẩn"
        : componentVariant && componentVariant.status !== "ACTIVE"
          ? "Biến thể không ACTIVE"
          : componentVariant?.inventoryTracked && componentVariant.inventoryQuantity < component.quantity
            ? "Biến thể không đủ tồn"
            : null;

    return {
      ...component,
      componentItem,
      componentVariant,
      retailValueVnd: Math.max(0, component.quantity) * unitValue,
      available,
      warning,
    };
  });
}
