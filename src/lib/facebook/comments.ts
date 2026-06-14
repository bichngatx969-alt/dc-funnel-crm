import type { FacebookCommentStatus, Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/token-encryption";

type RawFeedChange = {
  field?: string;
  value?: Record<string, any>;
};

type CommentGraphResult = {
  ok: boolean;
  externalId?: string;
  error?: string;
};

export const commentInclude = {
  facebookPage: { select: { pageId: true, pageName: true, pagePictureUrl: true } },
  post: { select: { id: true, externalPostId: true, permalink: true, message: true } },
  customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true, tags: true } },
  conversation: { select: { id: true, status: true, lastMessageAt: true } },
} satisfies Prisma.FacebookCommentInclude;

export function parseCommentStatus(value: unknown): FacebookCommentStatus | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (["OPEN", "REPLIED", "HIDDEN", "ARCHIVED"].includes(normalized)) {
    return normalized as FacebookCommentStatus;
  }
  return null;
}

export function parseBooleanFilter(value: string | null): boolean | undefined {
  if (value === null || value === "") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = clampInt(searchParams.get("page"), 1, 500, 1);
  const pageSize = clampInt(searchParams.get("pageSize") ?? searchParams.get("limit"), 1, 100, 25);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function hasVietnamesePhone(text: string | null | undefined): boolean {
  if (!text) return false;
  return /(?:\+?84|0)(?:[\s.\-]?\d){8,10}\b/.test(text);
}

export function extractVietnamesePhone(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/(?:\+?84|0)(?:[\s.\-]?\d){8,10}\b/);
  return match ? match[0].replace(/[^\d+]/g, "") : null;
}

export async function handleFacebookFeedChange(pageId: string | null, change: RawFeedChange): Promise<void> {
  if (!pageId) return;
  if (change.field !== "feed" && change.field !== "comments") return;

  const value = change.value ?? {};
  const item = String(value.item ?? value.object ?? "").toLowerCase();
  if (item && item !== "comment") return;

  const externalCommentId = normalizeId(value.comment_id ?? value.commentId ?? value.id);
  const externalPostId = normalizeId(value.post_id ?? value.postId ?? value.parent_id);
  if (!externalCommentId || !externalPostId) return;

  const page = await prisma.facebookPage.findUnique({ where: { pageId } });
  if (!page?.workspaceId) return;
  if (page.status === "DISCONNECTED" || page.status === "TOKEN_EXPIRED") return;

  const workspaceId = page.workspaceId;
  const verb = String(value.verb ?? "add").toLowerCase();
  const message = normalizeNullableText(value.message);
  const phone = extractVietnamesePhone(message);
  const shouldFlag = Boolean(phone);
  const externalCreatedAt = parseMetaTime(value.created_time);
  const fromId = normalizeId(value.from?.id ?? value.sender_id ?? value.from_id);
  const fromName = normalizeNullableText(value.from?.name ?? value.sender_name ?? value.from_name);
  const permalink = normalizeNullableText(value.permalink_url ?? value.permalink);
  const parentCommentId = normalizeId(value.parent_id ?? value.parentCommentId);

  const existing = await prisma.facebookComment.findUnique({
    where: { workspaceId_pageId_externalCommentId: { workspaceId, pageId, externalCommentId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.facebookComment.update({
      where: { id: existing.id },
      data: {
        message,
        fromId,
        fromName,
        permalink,
        parentCommentId,
        hasPhone: shouldFlag,
        needsFollowUp: shouldFlag ? true : undefined,
        isHidden: verb === "hide" ? true : undefined,
        status: verb === "hide" ? "HIDDEN" : undefined,
        hiddenAt: verb === "hide" ? new Date() : undefined,
        deletedAt: verb === "remove" ? new Date() : undefined,
        rawPayloadJson: value,
      },
    });
    return;
  }

  const post = await findOrCreatePost({
    workspaceId,
    pageId,
    externalPostId,
    permalink,
    message: normalizeNullableText(value.post?.message),
    externalCreatedAt,
  });
  const customer = await findOrCreateCommentCustomer({
    workspaceId,
    pageId,
    fromId: fromId ?? `comment:${externalCommentId}`,
    fromName,
    phone,
    externalPostId,
  });
  const conversation = await findOrCreateCommentConversation({
    workspaceId,
    pageId,
    customerId: customer.id,
  });

  const comment = await prisma.facebookComment.create({
    data: {
      workspaceId,
      pageId,
      postId: post.id,
      customerId: customer.id,
      conversationId: conversation.id,
      externalPostId,
      externalCommentId,
      parentCommentId,
      message,
      fromName,
      fromId,
      permalink,
      hasPhone: shouldFlag,
      needsFollowUp: shouldFlag,
      isHidden: verb === "hide",
      status: verb === "hide" ? "HIDDEN" : "OPEN",
      hiddenAt: verb === "hide" ? new Date() : null,
      externalCreatedAt,
      rawPayloadJson: value,
      deletedAt: verb === "remove" ? new Date() : null,
    },
  });

  await createCommentInboxMessage({
    workspaceId,
    pageId,
    conversationId: conversation.id,
    externalCommentId,
    text: message || "[comment]",
    payload: { ...value, facebookCommentId: comment.id },
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } }),
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        lastInteractionAt: now,
        lastActivityAt: now,
        ...(phone && !customer.phone ? { phone } : {}),
      },
    }),
  ]);
}

export async function replyToFacebookComment(params: {
  workspaceId: string;
  commentId: string;
  message: string;
}): Promise<CommentGraphResult> {
  const comment = await prisma.facebookComment.findFirst({
    where: { id: params.commentId, workspaceId: params.workspaceId, deletedAt: null },
    include: { facebookPage: true },
  });
  if (!comment) return { ok: false, error: "comment_not_found" };
  const token = getPageToken(comment.facebookPage.pageAccessTokenEncrypted);
  if (!token) return { ok: false, error: "missing_page_access_token" };

  const result = await graphPost<{ id?: string }>(`/${comment.externalCommentId}/comments`, token, {
    message: params.message,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const now = new Date();
  await prisma.facebookComment.update({
    where: { id: comment.id },
    data: { status: "REPLIED", repliedAt: now, needsFollowUp: false },
  });
  if (comment.conversationId) {
    await prisma.message.create({
      data: {
        workspaceId: comment.workspaceId,
        pageId: comment.pageId,
        conversationId: comment.conversationId,
        direction: "OUTBOUND",
        senderType: "HUMAN",
        text: params.message,
        payloadJson: { facebookCommentReplyId: result.data?.id ?? null },
        metaMessageId: result.data?.id ? `fb_comment_reply:${result.data.id}` : null,
      },
    });
    await prisma.conversation.update({ where: { id: comment.conversationId }, data: { lastMessageAt: now } });
  }
  return { ok: true, externalId: result.data?.id };
}

export async function hideFacebookComment(params: {
  workspaceId: string;
  commentId: string;
  hide: boolean;
}): Promise<CommentGraphResult> {
  const comment = await prisma.facebookComment.findFirst({
    where: { id: params.commentId, workspaceId: params.workspaceId, deletedAt: null },
    include: { facebookPage: true },
  });
  if (!comment) return { ok: false, error: "comment_not_found" };
  const token = getPageToken(comment.facebookPage.pageAccessTokenEncrypted);
  if (!token) return { ok: false, error: "missing_page_access_token" };

  const result = await graphPost<{ success?: boolean }>(`/${comment.externalCommentId}`, token, {
    is_hidden: String(params.hide),
  });
  if (!result.ok) return { ok: false, error: result.error };

  await prisma.facebookComment.update({
    where: { id: comment.id },
    data: {
      isHidden: params.hide,
      status: params.hide ? "HIDDEN" : "OPEN",
      hiddenAt: params.hide ? new Date() : null,
    },
  });
  return { ok: true };
}

async function findOrCreatePost(params: {
  workspaceId: string;
  pageId: string;
  externalPostId: string;
  permalink: string | null;
  message: string | null;
  externalCreatedAt: Date | null;
}) {
  return prisma.facebookPost.upsert({
    where: {
      workspaceId_pageId_externalPostId: {
        workspaceId: params.workspaceId,
        pageId: params.pageId,
        externalPostId: params.externalPostId,
      },
    },
    update: {
      permalink: params.permalink ?? undefined,
      message: params.message ?? undefined,
      externalCreatedAt: params.externalCreatedAt ?? undefined,
    },
    create: params,
  });
}

async function findOrCreateCommentCustomer(params: {
  workspaceId: string;
  pageId: string;
  fromId: string;
  fromName: string | null;
  phone: string | null;
  externalPostId: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: { pageId: params.pageId, psid: params.fromId },
  });
  if (existing) {
    if (existing.workspaceId === null || (params.phone && !existing.phone)) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          workspaceId: existing.workspaceId ?? params.workspaceId,
          phone: params.phone && !existing.phone ? params.phone : undefined,
          lastActivityAt: new Date(),
        },
      });
    }
    return existing;
  }

  return prisma.customer.create({
    data: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      psid: params.fromId,
      name: params.fromName,
      phone: params.phone,
      source: "facebook_comment",
      firstPostId: params.externalPostId,
      lastActivityAt: new Date(),
    },
  });
}

async function findOrCreateCommentConversation(params: {
  workspaceId: string;
  pageId: string;
  customerId: string;
}) {
  const existing = await prisma.conversation.findFirst({
    where: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      customerId: params.customerId,
      status: { in: ["BOT_ACTIVE", "HUMAN_TAKEOVER"] },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      customerId: params.customerId,
      status: "HUMAN_TAKEOVER",
    },
  });
}

async function createCommentInboxMessage(params: {
  workspaceId: string;
  pageId: string;
  conversationId: string;
  externalCommentId: string;
  text: string;
  payload: Record<string, unknown>;
}) {
  const metaMessageId = `fb_comment:${params.externalCommentId}`;
  const existing = await prisma.message.findUnique({ where: { metaMessageId } });
  if (existing) return existing;
  return prisma.message.create({
    data: {
      workspaceId: params.workspaceId,
      pageId: params.pageId,
      conversationId: params.conversationId,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      text: params.text,
      payloadJson: params.payload as Prisma.InputJsonValue,
      metaMessageId,
    },
  });
}

function normalizeId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseMetaTime(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000);
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getPageToken(encryptedOrPlainToken: string | null | undefined): string | null {
  const token = encryptedOrPlainToken || env.metaPageAccessToken;
  if (!token) return null;
  return token.startsWith("v1.") ? decryptToken(token) : token;
}

async function graphPost<T>(
  path: string,
  pageAccessToken: string,
  body: Record<string, string>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${graphBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...body, access_token: pageAccessToken }).toString(),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok || data?.error) {
      return { ok: false, error: data?.error?.message ?? `facebook_graph_${res.status}` };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function graphBase(): string {
  return `https://graph.facebook.com/${env.metaGraphVersion}`;
}
