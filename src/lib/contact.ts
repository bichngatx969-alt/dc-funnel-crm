import crypto from "crypto";
import type { EmailStatus, Prisma, Stage } from "@prisma/client";
import { Prisma as PrismaRuntime } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CONTACT_STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"] as const;
export const EMAIL_STATUSES = ["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"] as const;

export type ContactTimelineItem = {
  id: string;
  type: "note.created" | "conversation.activity" | "task.activity" | "opportunity.activity";
  occurredAt: Date;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
};

export const contactListSelect = {
  id: true,
  workspaceId: true,
  ownerId: true,
  pageId: true,
  psid: true,
  name: true,
  phone: true,
  email: true,
  gender: true,
  birthday: true,
  address: true,
  avatarUrl: true,
  source: true,
  currentStage: true,
  leadScore: true,
  tags: true,
  emailConsent: true,
  emailStatus: true,
  lastInteractionAt: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  facebookPage: { select: { pageId: true, pageName: true, pagePictureUrl: true } },
} satisfies Prisma.CustomerSelect;

export function contactDetailInclude(workspaceId: string): Prisma.CustomerInclude {
  return {
    owner: { select: { id: true, name: true, email: true } },
    facebookPage: { select: { pageId: true, pageName: true, pagePictureUrl: true } },
    conversations: {
      where: { workspaceId },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            direction: true,
            senderType: true,
            text: true,
            createdAt: true,
          },
        },
      },
    },
    tasks: {
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    },
    opportunities: {
      where: { workspaceId, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      take: 50,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true, color: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    },
    notes: {
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    },
    _count: {
      select: {
        conversations: true,
        tasks: true,
        opportunities: true,
        notes: true,
      },
    },
  } satisfies Prisma.CustomerInclude;
}

export function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

export function normalizeEmail(value: unknown): string | null {
  const email = normalizeText(value).toLowerCase();
  return email || null;
}

export function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.map((tag) => normalizeText(tag)).filter(Boolean)));
}

export function normalizeStage(value: unknown): Stage | null {
  const stage = normalizeText(value).toUpperCase();
  return CONTACT_STAGES.includes(stage as Stage) ? (stage as Stage) : null;
}

export function normalizeEmailStatus(value: unknown): EmailStatus | null {
  const status = normalizeText(value).toUpperCase();
  return EMAIL_STATUSES.includes(status as EmailStatus) ? (status as EmailStatus) : null;
}

export function parseOptionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(number);
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInteger(searchParams.get("page"), 1));
  const pageSize = Math.min(100, Math.max(1, parseInteger(searchParams.get("pageSize") ?? searchParams.get("limit"), 25)));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function normalizeJsonInput(value: unknown): Prisma.InputJsonValue | typeof PrismaRuntime.DbNull {
  if (value === null || value === undefined) return PrismaRuntime.DbNull;
  return value as Prisma.InputJsonValue;
}

export function createManualPsid(): string {
  return `manual:${crypto.randomUUID()}`;
}

export async function validateOwnerInWorkspace(ownerId: string | null, workspaceId: string): Promise<boolean> {
  if (!ownerId) return true;
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: ownerId, workspaceId, workspace: { deletedAt: null } },
    select: { id: true },
  });
  return Boolean(member);
}

export async function validateFacebookPageInWorkspace(pageId: string | null, workspaceId: string): Promise<boolean> {
  if (!pageId) return true;
  const page = await prisma.facebookPage.findFirst({
    where: { pageId, workspaceId },
    select: { id: true },
  });
  return Boolean(page);
}

export async function getContactInWorkspace(customerId: string, workspaceId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, workspaceId, deletedAt: null },
    select: { id: true, name: true },
  });
}

export async function buildContactTimeline(
  customerId: string,
  workspaceId: string,
  limit: number
): Promise<ContactTimelineItem[]> {
  const take = Math.min(100, Math.max(1, limit));
  const [notes, conversations, tasks, opportunities] = await prisma.$transaction([
    prisma.note.findMany({
      where: { customerId, workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.conversation.findMany({
      where: { customerId, workspaceId },
      orderBy: { lastMessageAt: "desc" },
      take,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, direction: true, senderType: true, text: true, createdAt: true },
        },
      },
    }),
    prisma.task.findMany({
      where: { customerId, workspaceId },
      orderBy: { updatedAt: "desc" },
      take,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    }),
    prisma.opportunity.findMany({
      where: { customerId, workspaceId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items: ContactTimelineItem[] = [
    ...notes.map((note) => ({
      id: note.id,
      type: "note.created" as const,
      occurredAt: note.createdAt,
      title: "Ghi chú mới",
      body: note.body,
      metadata: { author: note.author },
    })),
    ...conversations.map((conversation) => {
      const message = conversation.messages[0] ?? null;
      return {
        id: conversation.id,
        type: "conversation.activity" as const,
        occurredAt: message?.createdAt ?? conversation.lastMessageAt,
        title: "Hoạt động hội thoại",
        body: message?.text ?? null,
        metadata: {
          status: conversation.status,
          lastMessage: message,
        },
      };
    }),
    ...tasks.map((task) => ({
      id: task.id,
      type: "task.activity" as const,
      occurredAt: task.updatedAt,
      title: task.title,
      body: null,
      metadata: {
        status: task.status,
        type: task.type,
        dueAt: task.dueAt,
        assignedTo: task.assignedTo,
      },
    })),
    ...opportunities.map((opportunity) => ({
      id: opportunity.id,
      type: "opportunity.activity" as const,
      occurredAt: opportunity.lastActivityAt ?? opportunity.updatedAt,
      title: opportunity.title,
      body: null,
      metadata: {
        status: opportunity.status,
        valueVnd: opportunity.valueVnd,
        pipeline: opportunity.pipeline,
        stage: opportunity.stage,
      },
    })),
  ];

  return items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, take);
}
