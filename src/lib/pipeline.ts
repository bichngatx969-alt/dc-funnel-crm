import type { Industry, OpportunityStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = ["OPEN", "WON", "LOST"];

export type PipelineTemplateKey = "FASHION" | "STUDIO" | "SALON" | "AGENCY";

type PipelineTemplate = {
  key: PipelineTemplateKey;
  label: string;
  pipelineName: string;
  stages: { name: string; color: string; showInReports?: boolean }[];
};

const TEMPLATES: Record<PipelineTemplateKey, PipelineTemplate> = {
  FASHION: {
    key: "FASHION",
    label: "Thời trang",
    pipelineName: "Pipeline thời trang",
    stages: [
      { name: "Lead mới", color: "#60a5fa" },
      { name: "Hỏi mẫu/size", color: "#38bdf8" },
      { name: "Đã gửi set", color: "#818cf8" },
      { name: "Đang cân nhắc", color: "#f59e0b" },
      { name: "Chốt đơn", color: "#22c55e" },
      { name: "Giao hàng", color: "#14b8a6" },
      { name: "Mua lại", color: "#ec4899" },
    ],
  },
  STUDIO: {
    key: "STUDIO",
    label: "Studio",
    pipelineName: "Pipeline studio",
    stages: [
      { name: "Lead mới", color: "#60a5fa" },
      { name: "Tư vấn concept", color: "#a78bfa" },
      { name: "Báo giá", color: "#f59e0b" },
      { name: "Chờ cọc", color: "#fb7185" },
      { name: "Đã đặt lịch", color: "#22c55e" },
      { name: "Đã chụp", color: "#14b8a6" },
      { name: "Giao ảnh", color: "#38bdf8" },
      { name: "Xin review", color: "#ec4899" },
    ],
  },
  SALON: {
    key: "SALON",
    label: "Salon/Spa",
    pipelineName: "Pipeline salon/spa",
    stages: [
      { name: "Lead mới", color: "#60a5fa" },
      { name: "Đã tư vấn", color: "#a78bfa" },
      { name: "Đã đặt lịch", color: "#22c55e" },
      { name: "Đã đến", color: "#14b8a6" },
      { name: "Đã thanh toán", color: "#16a34a" },
      { name: "Chăm sóc lại", color: "#ec4899" },
    ],
  },
  AGENCY: {
    key: "AGENCY",
    label: "Agency",
    pipelineName: "Pipeline agency",
    stages: [
      { name: "Lead mới", color: "#60a5fa" },
      { name: "Đã trao đổi", color: "#38bdf8" },
      { name: "Audit", color: "#a78bfa" },
      { name: "Proposal", color: "#f59e0b" },
      { name: "Đàm phán", color: "#fb7185" },
      { name: "Chốt hợp đồng", color: "#22c55e" },
      { name: "Onboarding", color: "#14b8a6" },
    ],
  },
};

export function listPipelineTemplates() {
  return Object.values(TEMPLATES).map((template) => ({
    key: template.key,
    label: template.label,
    pipelineName: template.pipelineName,
    stages: template.stages.map((stage, index) => ({
      name: stage.name,
      position: index,
      color: stage.color,
      showInReports: stage.showInReports ?? true,
    })),
  }));
}

export function normalizePipelineTemplate(value: unknown, fallbackIndustry?: Industry): PipelineTemplateKey {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "FASHION" || normalized === "THOI_TRANG" || normalized === "THỜI TRANG") return "FASHION";
  if (normalized === "STUDIO" || normalized === "WEDDING") return "STUDIO";
  if (normalized === "SALON" || normalized === "SPA" || normalized === "SALON_SPA") return "SALON";
  if (normalized === "AGENCY" || normalized === "SERVICE") return "AGENCY";
  return templateForIndustry(fallbackIndustry);
}

export function templateForIndustry(industry?: Industry | null): PipelineTemplateKey {
  if (industry === "FASHION") return "FASHION";
  if (industry === "STUDIO" || industry === "WEDDING") return "STUDIO";
  if (industry === "SALON") return "SALON";
  return "AGENCY";
}

export async function ensureDefaultPipeline(workspaceId: string) {
  const existingDefault = await prisma.pipeline.findFirst({
    where: { workspaceId, deletedAt: null, isDefault: true },
    include: pipelineInclude,
    orderBy: { createdAt: "asc" },
  });
  if (existingDefault) return existingDefault;

  const existing = await prisma.pipeline.findFirst({
    where: { workspaceId, deletedAt: null },
    include: pipelineInclude,
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { industry: true },
  });
  return createPipelineFromTemplate(workspaceId, {
    template: templateForIndustry(workspace?.industry),
    isDefault: true,
  });
}

export async function createPipelineFromTemplate(
  workspaceId: string,
  input: {
    name?: string;
    template?: PipelineTemplateKey;
    isDefault?: boolean;
    stages?: { name: string; color?: string | null; showInReports?: boolean }[];
  }
) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { industry: true },
  });
  const templateKey = input.template ?? templateForIndustry(workspace?.industry);
  const template = TEMPLATES[templateKey];
  const stageInput = normalizeStageInput(input.stages, template);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.pipeline.updateMany({
        where: { workspaceId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.pipeline.create({
      data: {
        workspaceId,
        name: normalizeText(input.name) || template.pipelineName,
        industryTemplate: template.key,
        isDefault: input.isDefault ?? false,
        stages: {
          create: stageInput.map((stage, index) => ({
            name: stage.name,
            position: index,
            color: stage.color,
            showInReports: stage.showInReports,
          })),
        },
      },
      include: pipelineInclude,
    });
  });
}

export async function getPipelineInWorkspace(id: string, workspaceId: string) {
  return prisma.pipeline.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: pipelineInclude,
  });
}

export async function getStageInWorkspace(stageId: string, workspaceId: string, pipelineId?: string) {
  return prisma.pipelineStage.findFirst({
    where: {
      id: stageId,
      ...(pipelineId ? { pipelineId } : {}),
      pipeline: { workspaceId, deletedAt: null },
    },
    include: { pipeline: { select: { id: true, workspaceId: true } } },
  });
}

export async function getFirstStageForPipeline(pipelineId: string) {
  return prisma.pipelineStage.findFirst({
    where: { pipelineId },
    orderBy: { position: "asc" },
  });
}

export async function validateCustomerInWorkspace(customerId: string, workspaceId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    select: { id: true, name: true },
  });
}

export async function validateOwnerInWorkspace(ownerId: string | null, workspaceId: string) {
  if (!ownerId) return true;
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: ownerId, workspaceId, workspace: { deletedAt: null } },
    select: { id: true },
  });
  return Boolean(member);
}

export function parseVnd(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

export function parseDateOrNull(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeOpportunityStatus(value: unknown): OpportunityStatus | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return OPPORTUNITY_STATUSES.includes(normalized as OpportunityStatus)
    ? (normalized as OpportunityStatus)
    : null;
}

export function statusClosedAt(status: OpportunityStatus, existingClosedAt?: Date | null) {
  if (status === "OPEN") return null;
  return existingClosedAt ?? new Date();
}

export const pipelineInclude = {
  stages: { orderBy: { position: "asc" } },
  _count: { select: { opportunities: true } },
} satisfies Prisma.PipelineInclude;

export const opportunityInclude = {
  customer: { select: { id: true, name: true, phone: true, psid: true, currentStage: true, tags: true } },
  pipeline: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true, position: true, color: true } },
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OpportunityInclude;

function normalizeStageInput(
  stages: { name: string; color?: string | null; showInReports?: boolean }[] | undefined,
  template: PipelineTemplate
) {
  const normalized = Array.isArray(stages)
    ? stages
        .map((stage) => ({
          name: normalizeText(stage.name),
          color: normalizeText(stage.color),
          showInReports: stage.showInReports ?? true,
        }))
        .filter((stage) => stage.name)
    : [];

  if (normalized.length > 0) return normalized;
  return template.stages.map((stage) => ({
    name: stage.name,
    color: stage.color,
    showInReports: stage.showInReports ?? true,
  }));
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}
