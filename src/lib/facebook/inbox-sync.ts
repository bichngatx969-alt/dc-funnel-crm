import type { FacebookPage } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/token-encryption";

const SYNC_TTL_MS = 4500;
const GRAPH_SYNC_TIMEOUT_MS = 10000;
const DEFAULT_CONVERSATION_LIMIT = 3;
const DEFAULT_MESSAGE_LIMIT = 5;
const syncCache = new Map<string, number>();

type GraphConversation = {
  id: string;
  participants?: {
    data?: Array<{ id?: string; name?: string }>;
  };
  messages?: {
    data?: GraphMessage[];
  };
};

type GraphMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
  to?: { data?: Array<{ id?: string; name?: string }> };
  attachments?: unknown;
};

type GraphConversationResponse = {
  data?: GraphConversation[];
  error?: { message?: string; code?: number; type?: string };
};

export async function syncRecentFacebookInbox(params: {
  workspaceId: string;
  pageId?: string | null;
  limitPages?: number;
  limitConversations?: number;
  limitMessages?: number;
}): Promise<void> {
  const pages = await prisma.facebookPage.findMany({
    where: {
      workspaceId: params.workspaceId,
      status: { not: "DISCONNECTED" },
      pageAccessTokenEncrypted: { not: null },
      ...(params.pageId && params.pageId !== "all" ? { pageId: params.pageId } : {}),
    },
    orderBy: [{ botEnabled: "desc" }, { updatedAt: "desc" }],
    take: params.limitPages ?? 5,
  });

  await Promise.all(
    pages.map((page) =>
      syncPageInbox(page, {
        limitConversations: params.limitConversations ?? DEFAULT_CONVERSATION_LIMIT,
        limitMessages: params.limitMessages ?? DEFAULT_MESSAGE_LIMIT,
      }).catch(reportSyncError)
    )
  );
}

async function syncPageInbox(
  page: FacebookPage,
  limits: { limitConversations: number; limitMessages: number }
): Promise<void> {
  if (!page.workspaceId || !page.pageAccessTokenEncrypted) return;

  const cacheKey = `${page.workspaceId}:${page.pageId}`;
  const now = Date.now();
  const lastSyncAt = syncCache.get(cacheKey) ?? 0;
  if (now - lastSyncAt < SYNC_TTL_MS) return;
  syncCache.set(cacheKey, now);

  const token = getPageToken(page.pageAccessTokenEncrypted);
  if (!token) return;

  const fields = [
    "participants",
    `messages.limit(${limits.limitMessages}){id,message,created_time,from,to,attachments}`,
  ].join(",");
  const url = `${graphBase()}/${encodeURIComponent(
    page.pageId
  )}/conversations?limit=${limits.limitConversations}&fields=${encodeURIComponent(
    fields
  )}&access_token=${encodeURIComponent(token)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GRAPH_SYNC_TIMEOUT_MS);
  const res = await fetch(url, { cache: "no-store", signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
  const data = (await res.json().catch(() => ({}))) as GraphConversationResponse;
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `facebook_sync_failed_${res.status}`);
  }

  for (const conversation of data.data ?? []) {
    await importGraphConversation(page, conversation);
  }
}

async function importGraphConversation(page: FacebookPage, graphConversation: GraphConversation) {
  if (!page.workspaceId) return;

  const messages = [...(graphConversation.messages?.data ?? [])]
    .filter((message) => message.id)
    .sort((a, b) => parseGraphDate(a.created_time).getTime() - parseGraphDate(b.created_time).getTime());
  if (messages.length === 0) return;

  const participant =
    graphConversation.participants?.data?.find((item) => item.id && item.id !== page.pageId) ??
    findCustomerParticipantFromMessages(page.pageId, messages);
  const psid = participant?.id;
  if (!psid) return;

  const customer = await findOrCreateSyncedCustomer({
    workspaceId: page.workspaceId,
    pageId: page.pageId,
    psid,
    name: participant?.name ?? null,
  });

  const conversation = await findOrCreateSyncedConversation({
    workspaceId: page.workspaceId,
    pageId: page.pageId,
    customerId: customer.id,
  });

  let latestMessageAt: Date | null = null;
  for (const message of messages) {
    const createdAt = parseGraphDate(message.created_time);
    const fromId = message.from?.id ?? null;
    const direction = fromId === page.pageId ? "OUTBOUND" : "INBOUND";
    const text = message.message ?? (message.attachments ? "[đính kèm]" : null);
    const existing = await prisma.message.findUnique({
      where: { metaMessageId: message.id },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.message.create({
      data: {
        workspaceId: page.workspaceId,
        pageId: page.pageId,
        conversationId: conversation.id,
        direction,
        senderType: direction === "INBOUND" ? "CUSTOMER" : "HUMAN",
        text,
        payloadJson: { graphSync: true, graphConversationId: graphConversation.id },
        metaMessageId: message.id,
        createdAt,
      },
    });
    latestMessageAt =
      !latestMessageAt || createdAt.getTime() > latestMessageAt.getTime()
        ? createdAt
        : latestMessageAt;
  }

  if (!latestMessageAt) return;
  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: latestMessageAt },
    }),
    prisma.customer.update({
      where: { id: customer.id },
      data: { lastInteractionAt: latestMessageAt, lastActivityAt: latestMessageAt },
    }),
  ]);
}

async function findOrCreateSyncedCustomer(params: {
  workspaceId: string;
  pageId: string;
  psid: string;
  name: string | null;
}) {
  const existing = await prisma.customer.findFirst({
    where: { pageId: params.pageId, psid: params.psid },
  });
  if (existing) {
    if (!existing.workspaceId || (!existing.name && params.name)) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          workspaceId: existing.workspaceId ?? params.workspaceId,
          name: existing.name ?? params.name,
        },
      });
    }
    return existing;
  }

  return prisma.customer.create({
    data: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      psid: params.psid,
      name: params.name,
      source: "facebook_sync",
    },
  });
}

async function findOrCreateSyncedConversation(params: {
  workspaceId: string;
  pageId: string;
  customerId: string;
}) {
  const existing = await prisma.conversation.findFirst({
    where: {
      customerId: params.customerId,
      pageId: params.pageId,
      status: { in: ["BOT_ACTIVE", "HUMAN_TAKEOVER"] },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) {
    if (!existing.workspaceId) {
      return prisma.conversation.update({
        where: { id: existing.id },
        data: { workspaceId: params.workspaceId },
      });
    }
    return existing;
  }

  return prisma.conversation.create({
    data: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      customerId: params.customerId,
      status: "BOT_ACTIVE",
    },
  });
}

function findCustomerParticipantFromMessages(pageId: string, messages: GraphMessage[]) {
  for (const message of messages) {
    if (message.from?.id && message.from.id !== pageId) return message.from;
    const target = message.to?.data?.find((item) => item.id && item.id !== pageId);
    if (target) return target;
  }
  return null;
}

function parseGraphDate(value: string | undefined): Date {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getPageToken(value: string): string | null {
  try {
    return value.startsWith("v1.") ? decryptToken(value) : value;
  } catch {
    return null;
  }
}

function graphBase(): string {
  return `https://graph.facebook.com/${env.metaGraphVersion}`;
}

function reportSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("[FB SYNC] Không đồng bộ được inbox:", message.slice(0, 180));
}
