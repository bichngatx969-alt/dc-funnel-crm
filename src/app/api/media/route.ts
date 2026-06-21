import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { mediaAssetSelect, normalizeMediaAssetSource, normalizeUrl, parsePagination } from "@/lib/catalog";
import { normalizeNullableText } from "@/lib/order";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const source = searchParams.get("source");
  const { page, pageSize, skip } = parsePagination(searchParams);

  const where: Prisma.MediaAssetWhereInput = { workspaceId, deletedAt: null };
  if (q) {
    where.OR = [
      { fileName: { contains: q, mode: "insensitive" } },
      { altText: { contains: q, mode: "insensitive" } },
      { url: { contains: q, mode: "insensitive" } },
    ];
  }
  if (source) where.source = normalizeMediaAssetSource(source);

  const [items, total] = await prisma.$transaction([
    prisma.mediaAsset.findMany({
      where,
      select: mediaAssetSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.mediaAsset.count({ where }),
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
  const url = normalizeUrl(body.url);
  if (!url) return jsonError("Media URL phải là http/https hợp lệ");

  const item = await prisma.mediaAsset.create({
    data: {
      workspaceId,
      url,
      fileName: normalizeNullableText(body.fileName),
      mimeType: normalizeNullableText(body.mimeType),
      sizeBytes: Number.isFinite(Number(body.sizeBytes)) ? Math.max(0, Math.round(Number(body.sizeBytes))) : null,
      width: Number.isFinite(Number(body.width)) ? Math.max(0, Math.round(Number(body.width))) : null,
      height: Number.isFinite(Number(body.height)) ? Math.max(0, Math.round(Number(body.height))) : null,
      altText: normalizeNullableText(body.altText),
      source: normalizeMediaAssetSource(body.source),
    },
    select: mediaAssetSelect,
  });

  return jsonOk({ item }, 201);
}
