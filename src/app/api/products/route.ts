import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  normalizeNullableText,
  normalizeText,
  parsePagination,
  parseVnd,
  productSelect,
} from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const active = searchParams.get("active");
  const { page, pageSize, skip } = parsePagination(searchParams);

  const where: Prisma.ProductLiteWhereInput = {
    workspaceId,
    deletedAt: null,
  };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const [items, total] = await prisma.$transaction([
    prisma.productLite.findMany({
      where,
      select: productSelect,
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.productLite.count({ where }),
  ]);

  return jsonOk({
    items,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const body = await req.json().catch(() => ({}));
  const name = normalizeText(body.name);
  if (!name) return jsonError("Tên sản phẩm không được để trống");

  const product = await prisma.productLite.create({
    data: {
      workspaceId,
      name,
      sku: normalizeNullableText(body.sku),
      priceVnd: parseVnd(body.priceVnd),
      description: normalizeNullableText(body.description),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
    select: productSelect,
  });

  return jsonOk({ product }, 201);
}
