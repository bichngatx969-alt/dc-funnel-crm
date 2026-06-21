import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  catalogOptionSelect,
  catalogVariantSelect,
  enrichVariants,
  requirePhysicalCatalogItem,
} from "@/lib/catalog-variants";
import { calculateMargin } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const MAX_GENERATED_VARIANTS = 200;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const item = await requirePhysicalCatalogItem(workspaceId, id);
  if (!item.ok) return jsonError(item.error, item.error.includes("Không tìm thấy") ? 404 : 400);

  const options = await prisma.catalogOption.findMany({
    where: { workspaceId, catalogItemId: id, deletedAt: null },
    select: catalogOptionSelect,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  if (!options.length) return jsonError("Cần tạo option trước khi sinh biến thể");

  const optionGroups = options.map((option) => ({
    name: option.name,
    values: extractValues(option.valuesJson),
  }));
  if (optionGroups.some((option) => !option.values.length)) return jsonError("Mỗi option cần ít nhất một giá trị");

  const combinations = cartesian(optionGroups);
  if (combinations.length > MAX_GENERATED_VARIANTS) {
    return jsonError(`Số biến thể vượt quá giới hạn ${MAX_GENERATED_VARIANTS}. Hãy giảm số option/value.`, 400);
  }

  const existing = await prisma.catalogVariant.findMany({
    where: { workspaceId, catalogItemId: id, deletedAt: null },
    select: { optionValuesJson: true },
  });
  const existingKeys = new Set(existing.map((variant) => stableJsonKey(variant.optionValuesJson)));

  const data = combinations
    .filter((combo) => !existingKeys.has(stableJsonKey(combo)))
    .map((combo) => ({
      workspaceId,
      catalogItemId: id,
      name: `${item.item.name} - ${Object.values(combo).join(" / ")}`,
      optionValuesJson: combo,
      priceVnd: item.item.basePriceVnd,
      compareAtPriceVnd: item.item.compareAtPriceVnd,
      costVnd: item.item.costVnd,
      marginVnd: item.item.costVnd === null ? null : calculateMargin(item.item.basePriceVnd, item.item.costVnd),
      inventoryTracked: true,
      inventoryQuantity: 0,
      status: "ACTIVE",
    }));

  if (data.length) {
    await prisma.catalogVariant.createMany({ data });
  }

  const rawVariants = await prisma.catalogVariant.findMany({
    where: { workspaceId, catalogItemId: id, deletedAt: null },
    select: catalogVariantSelect,
    orderBy: { createdAt: "asc" },
  });
  const variants = await enrichVariants(workspaceId, rawVariants);

  return jsonOk({ createdCount: data.length, skippedExisting: combinations.length - data.length, variants });
}

function extractValues(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function cartesian(groups: Array<{ name: string; values: string[] }>) {
  return groups.reduce<Array<Record<string, string>>>(
    (acc, group) =>
      acc.flatMap((base) =>
        group.values.map((value) => ({
          ...base,
          [group.name]: value,
        }))
      ),
    [{}]
  );
}

function stableJsonKey(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, val]) => [key, String(val ?? "")] as const)
        .sort(([a], [b]) => a.localeCompare(b))
    )
  );
}
