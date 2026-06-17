import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  automationRuleInclude,
  automationTemplates,
  normalizeJsonInput,
  normalizeNullableText,
  parseAutomationActionType,
  parseAutomationTriggerType,
  parseBoolean,
  parsePagination,
} from "@/lib/automation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const triggerType = parseAutomationTriggerType(searchParams.get("triggerType"));
  const actionType = parseAutomationActionType(searchParams.get("actionType"));
  const isActive = parseBoolean(searchParams.get("isActive"));
  const withTotal = searchParams.get("withTotal") === "true";

  const where: Prisma.AutomationRuleWhereInput = { workspaceId, deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (triggerType) where.triggerType = triggerType;
  if (actionType) where.actionType = actionType;
  if (isActive !== undefined) where.isActive = isActive;

  const items = await prisma.automationRule.findMany({
    where,
    include: automationRuleInclude,
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    skip,
    take: pageSize,
  });
  const total = withTotal
    ? await prisma.automationRule.count({ where })
    : skip + items.length + (items.length === pageSize ? 1 : 0);

  return jsonOk({
    items,
    templates: searchParams.get("templates") === "true" ? automationTemplates : undefined,
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const body = await req.json().catch(() => ({}));
  const name = normalizeNullableText(body.name);
  if (!name) return jsonError("Thiếu tên automation rule");

  const triggerType = parseAutomationTriggerType(body.triggerType);
  if (!triggerType) return jsonError("triggerType không hợp lệ");
  const actionType = parseAutomationActionType(body.actionType);
  if (!actionType) return jsonError("actionType không hợp lệ");

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId,
      name,
      description: normalizeNullableText(body.description),
      triggerType,
      actionType,
      conditionsJson: normalizeJsonInput(body.conditionsJson),
      actionConfigJson: normalizeJsonInput(body.actionConfigJson),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      createdById: user.id,
    },
    include: automationRuleInclude,
  });

  return jsonOk({ rule }, 201);
}
