import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  automationRuleInclude,
  normalizeJsonInput,
  normalizeNullableText,
  parseAutomationActionType,
  parseAutomationTriggerType,
} from "@/lib/automation";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const rule = await prisma.automationRule.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: automationRuleInclude,
  });
  if (!rule) return jsonError("Không tìm thấy automation rule", 404);

  return jsonOk({ rule });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.automationRule.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return jsonError("Không tìm thấy automation rule", 404);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.AutomationRuleUncheckedUpdateInput = {};

  if (body.name !== undefined) {
    const name = normalizeNullableText(body.name);
    if (!name) return jsonError("Tên automation rule không được trống");
    data.name = name;
  }
  if (body.description !== undefined) data.description = normalizeNullableText(body.description);
  if (body.triggerType !== undefined) {
    const triggerType = parseAutomationTriggerType(body.triggerType);
    if (!triggerType) return jsonError("triggerType không hợp lệ");
    data.triggerType = triggerType;
  }
  if (body.actionType !== undefined) {
    const actionType = parseAutomationActionType(body.actionType);
    if (!actionType) return jsonError("actionType không hợp lệ");
    data.actionType = actionType;
  }
  if (body.conditionsJson !== undefined) data.conditionsJson = normalizeJsonInput(body.conditionsJson);
  if (body.actionConfigJson !== undefined) data.actionConfigJson = normalizeJsonInput(body.actionConfigJson);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.deleted !== undefined) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const rule = await prisma.automationRule.update({
    where: { id },
    data,
    include: automationRuleInclude,
  });

  return jsonOk({ rule });
}
