import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  contactListSelect,
  createManualPsid,
  normalizeEmail,
  normalizeEmailStatus,
  normalizeJsonInput,
  normalizeNullableText,
  normalizeStage,
  normalizeTags,
  parseInteger,
  parseOptionalDate,
  parsePagination,
  validateFacebookPageInWorkspace,
  validateOwnerInWorkspace,
} from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const stage = normalizeStage(searchParams.get("stage"));
  const ownerId = searchParams.get("ownerId")?.trim();
  const { page, pageSize, skip } = parsePagination(searchParams);

  const where: Prisma.CustomerWhereInput = {
    workspaceId,
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { psid: { contains: q } },
    ];
  }
  if (tag) where.tags = { has: tag };
  if (stage) where.currentStage = stage;
  if (ownerId) where.ownerId = ownerId === "unassigned" ? null : ownerId;

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: contactListSelect,
      orderBy: [{ lastActivityAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
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
  const name = normalizeNullableText(body.name);
  const phone = normalizeNullableText(body.phone);
  const email = normalizeEmail(body.email);
  if (!name && !phone && !email) {
    return jsonError("Cần ít nhất tên, số điện thoại hoặc email");
  }

  const ownerId = body.ownerId === undefined ? user.id : normalizeNullableText(body.ownerId);
  if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
    return jsonError("Owner không thuộc workspace hiện tại", 400);
  }

  const pageId = normalizeNullableText(body.pageId);
  if (!(await validateFacebookPageInWorkspace(pageId, workspaceId))) {
    return jsonError("Fanpage không thuộc workspace hiện tại", 400);
  }

  const birthday = parseOptionalDate(body.birthday);
  if (body.birthday && !birthday) return jsonError("birthday không hợp lệ");

  const currentStage = normalizeStage(body.currentStage ?? body.stage) ?? "COLD";
  const emailStatus = normalizeEmailStatus(body.emailStatus) ?? "SUBSCRIBED";
  const now = new Date();
  const createData: Prisma.CustomerUncheckedCreateInput = {
    workspaceId,
    ownerId,
    pageId,
    psid: normalizeNullableText(body.psid) ?? createManualPsid(),
    name,
    phone,
    email,
    gender: normalizeNullableText(body.gender),
    birthday,
    address: normalizeNullableText(body.address),
    avatarUrl: normalizeNullableText(body.avatarUrl),
    source: normalizeNullableText(body.source) ?? "manual",
    firstCampaign: normalizeNullableText(body.firstCampaign),
    firstPostId: normalizeNullableText(body.firstPostId),
    currentStage,
    leadScore: Math.max(0, parseInteger(body.leadScore, 0)),
    tags: normalizeTags(body.tags) ?? [],
    emailConsent: Boolean(body.emailConsent),
    emailStatus,
    unsubscribedAt: emailStatus === "UNSUBSCRIBED" ? now : null,
    lastInteractionAt: now,
    lastActivityAt: now,
  };

  if (body.customFieldsJson !== undefined) {
    createData.customFieldsJson = normalizeJsonInput(body.customFieldsJson);
  }

  try {
    const contact = await prisma.customer.create({
      data: createData,
      select: contactListSelect,
    });
    return jsonOk({ contact }, 201);
  } catch {
    return jsonError("Không tạo được contact; kiểm tra dữ liệu trùng hoặc không hợp lệ", 400);
  }
}
