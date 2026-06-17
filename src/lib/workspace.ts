import { cookies } from "next/headers";
import type { Industry, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

const WORKSPACE_COOKIE = "dc_workspace_id";
const DEFAULT_ORG_NAME = "D.C Group";
const DEFAULT_WORKSPACE_NAME = "D.C Funnel CRM";
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const DEFAULT_CURRENCY = "VND";
const DEFAULT_LOCALE = "vi-VN";
const CURRENT_WORKSPACE_CACHE_TTL_MS = 60 * 1000;

const INDUSTRIES = ["FASHION", "STUDIO", "SALON", "WEDDING", "SERVICE", "OTHER"] as const;
type WorkspaceMembership = Prisma.WorkspaceMemberGetPayload<{ include: { workspace: true } }>;
const currentWorkspaceCache = new Map<string, { expiresAt: number; workspaceId: string }>();

export type WorkspaceSummary = {
  id: string;
  organizationId: string;
  name: string;
  industry: string;
  role: Role;
  assignedOnly: boolean;
  timezone: string;
  currency: string;
  locale: string;
};

export function workspaceRoleForUserRole(role: Role): Role {
  if (role === "ADMIN") return "OWNER";
  if (role === "AGENCY_ADMIN") return "AGENCY_ADMIN";
  if (role === "OWNER") return "OWNER";
  if (role === "MANAGER") return "MANAGER";
  if (role === "MARKETER") return "MARKETER";
  return "SALE";
}

export function normalizeIndustry(value: unknown): Industry {
  const normalized = String(value ?? "").trim().toUpperCase();
  return INDUSTRIES.includes(normalized as Industry) ? (normalized as Industry) : "OTHER";
}

export async function listUserWorkspaces(user: SessionUser): Promise<{
  items: WorkspaceSummary[];
  currentWorkspaceId: string;
}> {
  await ensureDefaultWorkspaceForUser(user);
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });

  const cookieWorkspaceId = await getWorkspaceCookie();
  const current =
    memberships.find((membership) => membership.workspaceId === cookieWorkspaceId) ??
    memberships[0];

  if (!current) {
    const fallback = await ensureDefaultWorkspaceForUser(user);
    await setWorkspaceCookie(fallback.workspaceId);
    return {
      items: [toSummary(fallback)],
      currentWorkspaceId: fallback.workspaceId,
    };
  }

  await setWorkspaceCookie(current.workspaceId);
  return {
    items: memberships.map(toSummary),
    currentWorkspaceId: current.workspaceId,
  };
}

export async function getCurrentWorkspaceId(user: SessionUser): Promise<string> {
  const cookieWorkspaceId = await getWorkspaceCookie();
  const cacheKey = `${user.id}:${cookieWorkspaceId ?? "default"}`;
  const now = Date.now();
  const cached = currentWorkspaceCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.workspaceId;

  if (cookieWorkspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId: cookieWorkspaceId,
        workspace: { deletedAt: null },
      },
      select: { workspaceId: true },
    });
    if (membership) {
      currentWorkspaceCache.set(cacheKey, {
        workspaceId: membership.workspaceId,
        expiresAt: now + CURRENT_WORKSPACE_CACHE_TTL_MS,
      });
      return membership.workspaceId;
    }
  }

  const membership = await ensureDefaultWorkspaceForUser(user);
  await setWorkspaceCookie(membership.workspaceId);
  currentWorkspaceCache.set(cacheKey, {
    workspaceId: membership.workspaceId,
    expiresAt: now + CURRENT_WORKSPACE_CACHE_TTL_MS,
  });
  return membership.workspaceId;
}

export async function requireCurrentWorkspace(user: SessionUser) {
  const currentWorkspaceId = await getCurrentWorkspaceId(user);
  return { currentWorkspaceId };
}

export async function createWorkspaceForUser(
  user: SessionUser,
  input: {
    name: string;
    industry?: unknown;
    timezone?: unknown;
    currency?: unknown;
    locale?: unknown;
  }
): Promise<{ workspace: WorkspaceSummary; currentWorkspaceId: string }> {
  await ensureDefaultWorkspaceForUser(user);
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  const organizationId =
    existingMembership?.workspace.organizationId ?? (await getOrCreateDefaultOrganization()).id;

  const workspace = await prisma.workspace.create({
    data: {
      organizationId,
      name: input.name,
      industry: normalizeIndustry(input.industry),
      timezone: normalizeText(input.timezone) || DEFAULT_TIMEZONE,
      currency: normalizeText(input.currency) || DEFAULT_CURRENCY,
      locale: normalizeText(input.locale) || DEFAULT_LOCALE,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
          assignedOnly: false,
        },
      },
    },
  });

  const membership = await prisma.workspaceMember.findUniqueOrThrow({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    include: { workspace: true },
  });
  await setWorkspaceCookie(workspace.id);

  return {
    workspace: toSummary(membership),
    currentWorkspaceId: workspace.id,
  };
}

export async function switchCurrentWorkspace(
  user: SessionUser,
  workspaceId: string
): Promise<WorkspaceSummary | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId, workspace: { deletedAt: null } },
    include: { workspace: true },
  });
  if (!membership) return null;
  await setWorkspaceCookie(workspaceId);
  return toSummary(membership);
}

export async function ensureDefaultWorkspaceForUser(user: SessionUser): Promise<WorkspaceMembership> {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  if (existingMembership) {
    return existingMembership;
  }

  const workspace = await getOrCreateDefaultWorkspace();
  const membership = await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: workspaceRoleForUserRole(user.role),
      assignedOnly: false,
    },
    include: { workspace: true },
  });

  await backfillLegacyWorkspace(workspace.id);
  return membership;
}

export async function backfillLegacyWorkspace(workspaceId: string): Promise<void> {
  await prisma.$transaction([
    prisma.facebookPage.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.customer.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.conversation.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.message.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.task.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.offer.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.flow.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.emailTemplate.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
    prisma.emailSequence.updateMany({ where: { workspaceId: null }, data: { workspaceId } }),
  ]);
}

async function getOrCreateDefaultWorkspace() {
  const existingWorkspace = await prisma.workspace.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existingWorkspace) return existingWorkspace;

  const organization = await getOrCreateDefaultOrganization();
  const brandProfile = await prisma.brandProfile.findFirst({ orderBy: { createdAt: "asc" } });

  return prisma.workspace.create({
    data: {
      organizationId: organization.id,
      name: brandProfile?.brandName || DEFAULT_WORKSPACE_NAME,
      industry: brandProfile?.industry ?? "OTHER",
      timezone: DEFAULT_TIMEZONE,
      currency: DEFAULT_CURRENCY,
      locale: DEFAULT_LOCALE,
    },
  });
}

async function getOrCreateDefaultOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.organization.create({ data: { name: DEFAULT_ORG_NAME } });
}

function toSummary(membership: WorkspaceMembership): WorkspaceSummary {
  return {
    id: membership.workspace.id,
    organizationId: membership.workspace.organizationId,
    name: membership.workspace.name,
    industry: membership.workspace.industry.toLowerCase(),
    role: membership.role,
    assignedOnly: membership.assignedOnly,
    timezone: membership.workspace.timezone,
    currency: membership.workspace.currency,
    locale: membership.workspace.locale,
  };
}

async function getWorkspaceCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value ?? null;
}

async function setWorkspaceCookie(workspaceId: string): Promise<void> {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}
