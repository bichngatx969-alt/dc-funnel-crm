import type {
  AutomationActionType,
  AutomationRunStatus,
  AutomationSourceType,
  AutomationTriggerType,
  Prisma,
  Stage,
} from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUTOMATION_TRIGGER_TYPES = [
  "CONTACT_CREATED",
  "CONTACT_STAGE_CHANGED",
  "OPPORTUNITY_CREATED",
  "OPPORTUNITY_STAGE_CHANGED",
  "ORDER_CREATED",
  "ORDER_STATUS_CHANGED",
  "COMMENT_CREATED",
  "COMMENT_HAS_PHONE",
  "TASK_DUE_SOON",
  "MANUAL_TEST",
] as const;

export const AUTOMATION_ACTION_TYPES = [
  "CREATE_TASK",
  "ADD_TAG",
  "UPDATE_CONTACT_STAGE",
  "CREATE_NOTE",
  "MARK_COMMENT_FOLLOWUP",
  "SEND_EMAIL",
  "WEBHOOK",
  "NOOP",
] as const;

export const AUTOMATION_SOURCE_TYPES = ["CONTACT", "OPPORTUNITY", "ORDER", "COMMENT", "TASK", "MANUAL"] as const;
export const AUTOMATION_RUN_STATUSES = ["SUCCESS", "FAILED", "SKIPPED"] as const;

const CONTACT_STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"] as const;

export const automationRuleInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { runs: true } },
} satisfies Prisma.AutomationRuleInclude;

export const automationTemplates = [
  {
    name: "Comment co SDT -> tao task goi lai",
    triggerType: "COMMENT_HAS_PHONE",
    actionType: "CREATE_TASK",
    conditionsJson: { hasPhone: true },
    actionConfigJson: { title: "Goi lai khach tu comment co SDT", dueMinutes: 30 },
  },
  {
    name: "Lead moi -> tao task follow-up",
    triggerType: "CONTACT_CREATED",
    actionType: "CREATE_TASK",
    conditionsJson: null,
    actionConfigJson: { title: "Follow-up lead moi", dueMinutes: 120 },
  },
  {
    name: "Don hoan tat -> them tag khach hang",
    triggerType: "ORDER_STATUS_CHANGED",
    actionType: "ADD_TAG",
    conditionsJson: { status: "COMPLETED" },
    actionConfigJson: { tag: "khach-da-mua" },
  },
  {
    name: "Co hoi doi stage -> ghi note",
    triggerType: "OPPORTUNITY_STAGE_CHANGED",
    actionType: "CREATE_NOTE",
    conditionsJson: null,
    actionConfigJson: { body: "Opportunity da doi stage." },
  },
] as const;

type JsonRecord = Record<string, unknown>;

export type EvaluateAutomationParams = {
  workspaceId: string;
  triggerType: AutomationTriggerType;
  sourceType?: AutomationSourceType | null;
  sourceId?: string | null;
  payload?: JsonRecord;
  dryRun?: boolean;
  ruleId?: string;
  runTriggerType?: AutomationTriggerType;
};

export function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

export function normalizeJsonInput(value: unknown): Prisma.InputJsonValue | typeof PrismaRuntime.DbNull {
  if (value === null || value === undefined || value === "") return PrismaRuntime.DbNull;
  return value as Prisma.InputJsonValue;
}

export function parseAutomationTriggerType(value: unknown): AutomationTriggerType | null {
  const normalized = normalizeText(value).toUpperCase();
  return AUTOMATION_TRIGGER_TYPES.includes(normalized as AutomationTriggerType)
    ? (normalized as AutomationTriggerType)
    : null;
}

export function parseAutomationActionType(value: unknown): AutomationActionType | null {
  const normalized = normalizeText(value).toUpperCase();
  return AUTOMATION_ACTION_TYPES.includes(normalized as AutomationActionType)
    ? (normalized as AutomationActionType)
    : null;
}

export function parseAutomationSourceType(value: unknown): AutomationSourceType | null {
  const normalized = normalizeText(value).toUpperCase();
  return AUTOMATION_SOURCE_TYPES.includes(normalized as AutomationSourceType)
    ? (normalized as AutomationSourceType)
    : null;
}

export function parseAutomationRunStatus(value: unknown): AutomationRunStatus | null {
  const normalized = normalizeText(value).toUpperCase();
  return AUTOMATION_RUN_STATUSES.includes(normalized as AutomationRunStatus)
    ? (normalized as AutomationRunStatus)
    : null;
}

export function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return undefined;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInteger(searchParams.get("page"), 1));
  const pageSize = Math.min(100, Math.max(1, parseInteger(searchParams.get("pageSize") ?? searchParams.get("limit"), 25)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export async function evaluateAutomationRules(params: EvaluateAutomationParams) {
  const rules = await prisma.automationRule.findMany({
    where: {
      workspaceId: params.workspaceId,
      deletedAt: null,
      isActive: true,
      triggerType: params.triggerType,
      ...(params.ruleId ? { id: params.ruleId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const rule of rules) {
    results.push(await executeAutomationRule(rule, params));
  }
  return results;
}

export async function testAutomationRule(params: {
  workspaceId: string;
  ruleId: string;
  sourceType?: AutomationSourceType | null;
  sourceId?: string | null;
  payload?: JsonRecord;
  dryRun?: boolean;
}) {
  const rule = await prisma.automationRule.findFirst({
    where: { id: params.ruleId, workspaceId: params.workspaceId, deletedAt: null },
  });
  if (!rule) return null;

  return executeAutomationRule(rule, {
    workspaceId: params.workspaceId,
    triggerType: rule.triggerType,
    runTriggerType: "MANUAL_TEST",
    sourceType: params.sourceType ?? "MANUAL",
    sourceId: params.sourceId ?? rule.id,
    payload: params.payload ?? { manualTest: true },
    dryRun: params.dryRun ?? true,
    ruleId: rule.id,
  });
}

async function executeAutomationRule(rule: Prisma.AutomationRuleGetPayload<{}>, params: EvaluateAutomationParams) {
  const payload = params.payload ?? {};
  const runTriggerType = params.runTriggerType ?? params.triggerType;
  const baseInput = {
    payload,
    dryRun: Boolean(params.dryRun),
    ruleTriggerType: rule.triggerType,
    evaluatedTriggerType: params.triggerType,
  };

  try {
    if (!conditionsMatch(rule.conditionsJson, payload)) {
      return createRun({
        rule,
        params,
        triggerType: runTriggerType,
        status: "SKIPPED",
        input: baseInput,
        output: { reason: "conditions_not_matched" },
      });
    }

    const output = await performAutomationAction(rule, params);
    const status: AutomationRunStatus = output.skipped ? "SKIPPED" : "SUCCESS";
    const run = await createRun({
      rule,
      params,
      triggerType: runTriggerType,
      status,
      input: baseInput,
      output,
    });
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
    return run;
  } catch (error) {
    const message = error instanceof Error ? error.message : "automation_failed";
    return createRun({
      rule,
      params,
      triggerType: runTriggerType,
      status: "FAILED",
      input: baseInput,
      output: { ok: false },
      error: message,
    });
  }
}

async function performAutomationAction(rule: Prisma.AutomationRuleGetPayload<{}>, params: EvaluateAutomationParams) {
  const config = asRecord(rule.actionConfigJson);
  const payload = params.payload ?? {};
  const dryRun = Boolean(params.dryRun);

  if (rule.actionType === "NOOP") return { ok: true, action: "NOOP", dryRun };
  if (rule.actionType === "SEND_EMAIL" || rule.actionType === "WEBHOOK") {
    return { skipped: true, action: rule.actionType, reason: "external_side_effect_disabled_in_pr7" };
  }

  if (rule.actionType === "CREATE_TASK") {
    const customerId = getString(config.customerId) ?? getString(payload.customerId);
    if (!customerId) return { skipped: true, action: "CREATE_TASK", reason: "missing_customerId" };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { skipped: true, action: "CREATE_TASK", reason: "customer_not_found" };

    const dueMinutes = parseInteger(config.dueMinutes, 60);
    const dueAt = dueMinutes > 0 ? new Date(Date.now() + dueMinutes * 60 * 1000) : null;
    const title = getString(config.title) ?? defaultTaskTitle(rule.triggerType);
    const assignedToId = getString(config.assignedToId) ?? getString(payload.ownerId) ?? null;

    if (dryRun) return { ok: true, dryRun, action: "CREATE_TASK", wouldCreate: { customerId, title, dueAt, assignedToId } };

    const task = await prisma.task.create({
      data: {
        workspaceId: params.workspaceId,
        customerId,
        assignedToId,
        type: "FOLLOW_UP",
        title,
        dueAt,
      },
      select: { id: true, title: true, customerId: true, dueAt: true },
    });
    return { ok: true, action: "CREATE_TASK", task };
  }

  if (rule.actionType === "ADD_TAG") {
    const customerId = getString(config.customerId) ?? getString(payload.customerId);
    const tag = getString(config.tag);
    if (!customerId || !tag) return { skipped: true, action: "ADD_TAG", reason: "missing_customerId_or_tag" };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true, tags: true },
    });
    if (!customer) return { skipped: true, action: "ADD_TAG", reason: "customer_not_found" };
    const tags = Array.from(new Set([...customer.tags, tag]));
    if (dryRun) return { ok: true, dryRun, action: "ADD_TAG", wouldUpdate: { customerId, tags } };
    await prisma.customer.update({ where: { id: customerId }, data: { tags, lastActivityAt: new Date() } });
    return { ok: true, action: "ADD_TAG", customerId, tag };
  }

  if (rule.actionType === "UPDATE_CONTACT_STAGE") {
    const customerId = getString(config.customerId) ?? getString(payload.customerId);
    const stage = parseStage(config.stage ?? payload.stage);
    if (!customerId || !stage) return { skipped: true, action: "UPDATE_CONTACT_STAGE", reason: "missing_customerId_or_stage" };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { skipped: true, action: "UPDATE_CONTACT_STAGE", reason: "customer_not_found" };
    if (dryRun) return { ok: true, dryRun, action: "UPDATE_CONTACT_STAGE", wouldUpdate: { customerId, stage } };
    await prisma.customer.update({ where: { id: customerId }, data: { currentStage: stage, lastActivityAt: new Date() } });
    return { ok: true, action: "UPDATE_CONTACT_STAGE", customerId, stage };
  }

  if (rule.actionType === "CREATE_NOTE") {
    const customerId = getString(config.customerId) ?? getString(payload.customerId);
    if (!customerId) return { skipped: true, action: "CREATE_NOTE", reason: "missing_customerId" };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { skipped: true, action: "CREATE_NOTE", reason: "customer_not_found" };
    const body = getString(config.body) ?? defaultNoteBody(rule.triggerType, payload);
    const authorId = getString(config.authorId) ?? null;
    if (dryRun) return { ok: true, dryRun, action: "CREATE_NOTE", wouldCreate: { customerId, body, authorId } };
    const note = await prisma.note.create({
      data: { workspaceId: params.workspaceId, customerId, authorId, body },
      select: { id: true, customerId: true, body: true },
    });
    return { ok: true, action: "CREATE_NOTE", note };
  }

  if (rule.actionType === "MARK_COMMENT_FOLLOWUP") {
    const commentId = getString(config.commentId) ?? getString(payload.commentId) ?? (params.sourceType === "COMMENT" ? params.sourceId : null);
    if (!commentId) return { skipped: true, action: "MARK_COMMENT_FOLLOWUP", reason: "missing_commentId" };
    const comment = await prisma.facebookComment.findFirst({
      where: { id: commentId, workspaceId: params.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!comment) return { skipped: true, action: "MARK_COMMENT_FOLLOWUP", reason: "comment_not_found" };
    if (dryRun) return { ok: true, dryRun, action: "MARK_COMMENT_FOLLOWUP", wouldUpdate: { commentId, needsFollowUp: true } };
    await prisma.facebookComment.update({ where: { id: commentId }, data: { needsFollowUp: true } });
    return { ok: true, action: "MARK_COMMENT_FOLLOWUP", commentId };
  }

  return { skipped: true, action: rule.actionType, reason: "action_not_supported" };
}

async function createRun(params: {
  rule: Prisma.AutomationRuleGetPayload<{}>;
  params: EvaluateAutomationParams;
  triggerType: AutomationTriggerType;
  status: AutomationRunStatus;
  input: JsonRecord;
  output: JsonRecord;
  error?: string;
}) {
  return prisma.automationRun.create({
    data: {
      workspaceId: params.rule.workspaceId,
      ruleId: params.rule.id,
      triggerType: params.triggerType,
      sourceType: params.params.sourceType ?? null,
      sourceId: params.params.sourceId ?? null,
      status: params.status,
      inputJson: toJson(params.input),
      outputJson: toJson(params.output),
      error: params.error,
    },
  });
}

function conditionsMatch(conditionsJson: Prisma.JsonValue | null, payload: JsonRecord): boolean {
  const conditions = asRecord(conditionsJson);
  const entries = Object.entries(conditions);
  if (entries.length === 0) return true;

  return entries.every(([key, expected]) => {
    if (key === "hasPhone") return Boolean(payload.hasPhone) === Boolean(expected);
    return String(payload[key] ?? "") === String(expected ?? "");
  });
}

function asRecord(value: Prisma.JsonValue | null): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function getString(value: unknown): string | null {
  const text = normalizeNullableText(value);
  return text;
}

function parseStage(value: unknown): Stage | null {
  const stage = normalizeText(value).toUpperCase();
  return CONTACT_STAGES.includes(stage as Stage) ? (stage as Stage) : null;
}

function parseInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(number);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function defaultTaskTitle(triggerType: AutomationTriggerType): string {
  if (triggerType === "COMMENT_HAS_PHONE") return "Goi lai khach co SDT trong comment";
  if (triggerType === "CONTACT_CREATED") return "Follow-up lead moi";
  if (triggerType === "ORDER_CREATED") return "Kiem tra don hang moi";
  return "Follow-up tu automation";
}

function defaultNoteBody(triggerType: AutomationTriggerType, payload: JsonRecord): string {
  if (triggerType === "OPPORTUNITY_STAGE_CHANGED") {
    return `Opportunity da doi stage: ${normalizeText(payload.previousStageId)} -> ${normalizeText(payload.stageId)}`;
  }
  return "Ghi chu tu automation rule.";
}
