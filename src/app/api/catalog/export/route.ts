import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/api";
import { catalogItemSelect, enrichCatalogItems, normalizeCatalogItemStatus, normalizeCatalogItemType } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: Prisma.CatalogItemWhereInput = { workspaceId, deletedAt: null };
  if (type) where.type = normalizeCatalogItemType(type);
  if (status) where.status = normalizeCatalogItemStatus(status, "ACTIVE");

  const rawItems = await prisma.catalogItem.findMany({
    where,
    select: catalogItemSelect,
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    take: 1000,
  });
  const items = await enrichCatalogItems(workspaceId, rawItems);
  const [serviceCounts, packageCounts] = await Promise.all([
    items.length
      ? prisma.serviceVariation.groupBy({
          by: ["catalogItemId"],
          where: { workspaceId, catalogItemId: { in: items.map((item) => item.id) }, deletedAt: null },
          _count: { _all: true },
        })
      : [],
    items.length
      ? prisma.packageComponent.groupBy({
          by: ["packageItemId"],
          where: { workspaceId, packageItemId: { in: items.map((item) => item.id) }, deletedAt: null },
          _count: { _all: true },
        })
      : [],
  ]);
  const serviceCountByItem = new Map(serviceCounts.map((row) => [row.catalogItemId, row._count._all]));
  const packageCountByItem = new Map(packageCounts.map((row) => [row.packageItemId, row._count._all]));

  const csv = toCsv([
    [
      "id",
      "type",
      "name",
      "sku",
      "status",
      "basePriceVnd",
      "compareAtPriceVnd",
      "costVnd",
      "marginVnd",
      "variantCount",
      "activeVariantCount",
      "totalStock",
      "lowStockVariantCount",
      "serviceVariationCount",
      "packageComponentCount",
      "aiAuditScore",
      "updatedAt",
    ],
    ...items.map((item) => [
      item.id,
      item.type,
      item.name,
      item.sku ?? "",
      item.status,
      item.basePriceVnd,
      item.compareAtPriceVnd ?? "",
      item.costVnd ?? "",
      item.marginVnd ?? "",
      item.variantCount,
      item.activeVariantCount,
      item.totalStock,
      item.lowStockVariantCount,
      serviceCountByItem.get(item.id) ?? 0,
      packageCountByItem.get(item.id) ?? 0,
      item.aiAuditScore ?? "",
      item.updatedAt.toISOString(),
    ]),
  ]);

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="catalog-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
