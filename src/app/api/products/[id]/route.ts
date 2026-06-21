import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { normalizeNullableText, normalizeText, parseVnd, productSelect } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const product = await prisma.productLite.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: productSelect,
  });
  if (!product) return jsonError("Không tìm thấy sản phẩm/dịch vụ", 404);

  return jsonOk({ product });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.productLite.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: productSelect,
  });
  if (!existing) return jsonError("Không tìm thấy sản phẩm/dịch vụ", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.ProductLiteUpdateInput = {};

  if ("name" in body) {
    const name = normalizeText(body.name);
    if (!name) return jsonError("Tên sản phẩm không được để trống");
    data.name = name;
  }
  if ("sku" in body) data.sku = normalizeNullableText(body.sku);
  if ("priceVnd" in body) data.priceVnd = parseVnd(body.priceVnd);
  if ("costVnd" in body) data.costVnd = parseOptionalVnd(body.costVnd);
  if ("priceVnd" in body || "costVnd" in body) {
    const nextPrice = "priceVnd" in body ? parseVnd(body.priceVnd) : existing.priceVnd;
    const nextCost = "costVnd" in body ? parseOptionalVnd(body.costVnd) : existing.costVnd;
    data.marginVnd = nextCost === null ? null : nextPrice - nextCost;
  }
  if ("description" in body) data.description = normalizeNullableText(body.description);
  if ("targetSegment" in body) data.targetSegment = normalizeNullableText(body.targetSegment);
  if ("painPointsJson" in body || "painPoints" in body) data.painPointsJson = normalizeTextList(body.painPointsJson ?? body.painPoints);
  if ("benefitsJson" in body || "benefits" in body) data.benefitsJson = normalizeTextList(body.benefitsJson ?? body.benefits);
  if ("faqsJson" in body || "faqs" in body) data.faqsJson = normalizeTextList(body.faqsJson ?? body.faqs);
  if ("objectionsJson" in body || "objections" in body) data.objectionsJson = normalizeTextList(body.objectionsJson ?? body.objections);
  if ("offerIdeasJson" in body || "offerIdeas" in body) data.offerIdeasJson = normalizeTextList(body.offerIdeasJson ?? body.offerIdeas);
  if ("salesScript" in body) data.salesScript = normalizeNullableText(body.salesScript);
  if ("isActive" in body) data.isActive = Boolean(body.isActive);

  const product = await prisma.productLite.update({
    where: { id: existing.id },
    data,
    select: productSelect,
  });

  return jsonOk({ product });
}

function parseOptionalVnd(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return parseVnd(value);
}

function normalizeTextList(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];
  const normalized = items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 50);
  return normalized.length ? normalized : Prisma.JsonNull;
}
