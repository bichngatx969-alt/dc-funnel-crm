import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  contactDetailInclude,
  normalizeEmail,
  normalizeEmailStatus,
  normalizeJsonInput,
  normalizeNullableText,
  normalizeStage,
  normalizeTags,
  parseInteger,
  parseOptionalDate,
  validateFacebookPageInWorkspace,
  validateOwnerInWorkspace,
} from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const contact = await prisma.customer.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: contactDetailInclude(workspaceId),
  });
  if (!contact) return jsonError("Không tìm thấy contact", 404);

  return jsonOk({ contact });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return jsonError("Không tìm thấy contact", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CustomerUncheckedUpdateInput = {};

  if (body.name !== undefined) data.name = normalizeNullableText(body.name);
  if (body.phone !== undefined) data.phone = normalizeNullableText(body.phone);
  if (body.email !== undefined) data.email = normalizeEmail(body.email);
  if (body.gender !== undefined) data.gender = normalizeNullableText(body.gender);
  if (body.address !== undefined) data.address = normalizeNullableText(body.address);
  if (body.avatarUrl !== undefined) data.avatarUrl = normalizeNullableText(body.avatarUrl);
  if (body.source !== undefined) data.source = normalizeNullableText(body.source);
  if (body.firstCampaign !== undefined) data.firstCampaign = normalizeNullableText(body.firstCampaign);
  if (body.firstPostId !== undefined) data.firstPostId = normalizeNullableText(body.firstPostId);
  if (body.customFieldsJson !== undefined) data.customFieldsJson = normalizeJsonInput(body.customFieldsJson);
  if (body.tags !== undefined) {
    const tags = normalizeTags(body.tags);
    if (!tags) return jsonError("tags phải là mảng string");
    data.tags = tags;
  }
  if (body.leadScore !== undefined) data.leadScore = Math.max(0, parseInteger(body.leadScore, 0));
  if (body.currentStage !== undefined || body.stage !== undefined) {
    const stage = normalizeStage(body.currentStage ?? body.stage);
    if (!stage) return jsonError("Stage không hợp lệ");
    data.currentStage = stage;
  }
  if (body.ownerId !== undefined) {
    const ownerId = normalizeNullableText(body.ownerId);
    if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
      return jsonError("Owner không thuộc workspace hiện tại", 400);
    }
    data.ownerId = ownerId;
  }
  if (body.pageId !== undefined) {
    const pageId = normalizeNullableText(body.pageId);
    if (!(await validateFacebookPageInWorkspace(pageId, workspaceId))) {
      return jsonError("Fanpage không thuộc workspace hiện tại", 400);
    }
    data.pageId = pageId;
  }
  if (body.birthday !== undefined) {
    const birthday = parseOptionalDate(body.birthday);
    if (body.birthday && !birthday) return jsonError("birthday không hợp lệ");
    data.birthday = birthday;
  }
  if (body.emailConsent !== undefined) {
    data.emailConsent = Boolean(body.emailConsent);
    if (body.emailConsent) {
      data.emailStatus = "SUBSCRIBED";
      data.unsubscribedAt = null;
    }
  }
  if (body.emailStatus !== undefined) {
    const emailStatus = normalizeEmailStatus(body.emailStatus);
    if (!emailStatus) return jsonError("emailStatus không hợp lệ");
    data.emailStatus = emailStatus;
    if (emailStatus === "UNSUBSCRIBED") {
      data.emailConsent = false;
      data.unsubscribedAt = new Date();
    }
  }
  if (body.deleted !== undefined) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  data.lastActivityAt = new Date();

  const contact = await prisma.customer.update({
    where: { id },
    data,
    include: contactDetailInclude(workspaceId),
  });

  return jsonOk({ contact });
}
