import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  parseAutomationRunStatus,
  parseAutomationSourceType,
  parseAutomationTriggerType,
  parsePagination,
} from "@/lib/automation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const ruleId = searchParams.get("ruleId")?.trim();
  const triggerType = parseAutomationTriggerType(searchParams.get("triggerType"));
  const sourceType = parseAutomationSourceType(searchParams.get("sourceType"));
  const sourceId = searchParams.get("sourceId")?.trim();
  const status = parseAutomationRunStatus(searchParams.get("status"));

  const where: Prisma.AutomationRunWhereInput = { workspaceId };
  if (ruleId) where.ruleId = ruleId;
  if (triggerType) where.triggerType = triggerType;
  if (sourceType) where.sourceType = sourceType;
  if (sourceId) where.sourceId = sourceId;
  if (status) where.status = status;

  const [items, total] = await prisma.$transaction([
    prisma.automationRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        rule: { select: { id: true, name: true, triggerType: true, actionType: true, isActive: true } },
      },
      skip,
      take: pageSize,
    }),
    prisma.automationRun.count({ where }),
  ]);

  return jsonOk({
    items,
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  });
}
