import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForAccessToken,
  getFacebookLoginUrl,
  getGrantedScopes,
  getLongLivedUserAccessToken,
  getPageHealth,
  getSubscribedApps,
  getUserPages,
  getUserProfile,
  subscribePageToApp,
  type FacebookUserPage,
} from "@/lib/facebook/facebook-client";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";

export function startFacebookLogin(redirectUri?: string): { state: string; url: string } {
  const state = crypto.randomBytes(24).toString("base64url");
  return { state, url: getFacebookLoginUrl(state, redirectUri) };
}

export async function handleFacebookCallback(
  code: string,
  state: string,
  expectedState: string | undefined,
  redirectUri?: string
) {
  if (!expectedState || state !== expectedState) {
    await audit("facebook_callback", "FAILED", undefined, "Facebook OAuth state không hợp lệ.");
    throw new Error("Facebook OAuth state không hợp lệ. Vui lòng thử kết nối lại.");
  }

  const shortToken = await exchangeCodeForAccessToken(code, redirectUri);
  const longToken = await getLongLivedUserAccessToken(shortToken.access_token).catch(() => shortToken);
  const [profile, scopes] = await Promise.all([
    getUserProfile(longToken.access_token),
    getGrantedScopes(longToken.access_token),
  ]);

  const connection = await prisma.facebookConnection.create({
    data: {
      facebookUserId: profile.id,
      facebookUserName: profile.name ?? null,
      accessTokenEncrypted: encryptToken(longToken.access_token),
      tokenType: longToken.token_type ?? shortToken.token_type ?? null,
      expiresAt: longToken.expires_in ? new Date(Date.now() + longToken.expires_in * 1000) : null,
      grantedScopes: scopes,
      status: "CONNECTED",
    },
  });

  await audit("facebook_callback", "SUCCESS", undefined, "Đã kết nối tài khoản Facebook.", {
    connectionId: connection.id,
    facebookUserId: profile.id,
    grantedScopes: scopes,
  });

  return connection;
}

export async function listAvailablePages(workspaceId: string, connectionId?: string) {
  const connection = connectionId
    ? await prisma.facebookConnection.findUnique({ where: { id: connectionId } })
    : await prisma.facebookConnection.findFirst({ orderBy: { createdAt: "desc" } });

  const connectedPages = await prisma.facebookPage.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: publicPageSelect,
  });

  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    return { availablePages: [], connectedPages, connection: safeConnection(connection) };
  }

  try {
    const token = decryptToken(connection.accessTokenEncrypted);
    const pages = await getUserPages(token);
    return {
      availablePages: pages.map((p) => ({
        pageId: p.id,
        pageName: p.name,
        pageUsername: p.username ?? null,
        pagePictureUrl: p.picture?.data?.url ?? null,
        connected: connectedPages.some((cp) => cp.pageId === p.id),
      })),
      connectedPages,
      connection: safeConnection(connection),
    };
  } catch (err) {
    await prisma.facebookConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR" },
    });
    await audit("list_available_pages", "FAILED", undefined, readableError(err), {
      connectionId: connection.id,
    });
    return {
      availablePages: [],
      connectedPages,
      connection: safeConnection({ ...connection, status: "ERROR" }),
      error: "Không lấy được danh sách Page. Vui lòng kiểm tra quyền pages_show_list và role của app.",
    };
  }
}

export async function connectPage(pageId: string, workspaceId: string) {
  const connection = await prisma.facebookConnection.findFirst({ orderBy: { createdAt: "desc" } });
  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    throw new Error("Chưa có kết nối Facebook hợp lệ. Vui lòng bấm Kết nối Facebook trước.");
  }

  const userToken = decryptToken(connection.accessTokenEncrypted);
  const pages = await getUserPages(userToken);
  const page = pages.find((p) => p.id === pageId);
  if (!page?.access_token) {
    await audit("connect_page", "FAILED", pageId, "Không tìm thấy Page hoặc thiếu Page Access Token.");
    throw new Error("Không tìm thấy Page hoặc thiếu Page Access Token. Kiểm tra quyền pages_show_list/pages_messaging.");
  }
  const existingPage = await prisma.facebookPage.findUnique({
    where: { pageId: page.id },
    select: { workspaceId: true },
  });
  if (existingPage?.workspaceId && existingPage.workspaceId !== workspaceId) {
    throw new Error("Fanpage này đã thuộc workspace khác.");
  }

  let webhookSubscribed = false;
  let status: "CONNECTED" | "WEBHOOK_NOT_SUBSCRIBED" = "CONNECTED";
  let lastError: string | null = null;

  try {
    const subscribed = await subscribePageToApp(page.id, page.access_token);
    webhookSubscribed = subscribed.success;
    if (!webhookSubscribed) status = "WEBHOOK_NOT_SUBSCRIBED";
  } catch (err) {
    webhookSubscribed = false;
    status = "WEBHOOK_NOT_SUBSCRIBED";
    lastError = readableError(err);
  }

  const saved = await prisma.facebookPage.upsert({
    where: { pageId: page.id },
    update: pageData(page, connection.id, workspaceId, webhookSubscribed, status, lastError),
    create: pageData(page, connection.id, workspaceId, webhookSubscribed, status, lastError),
    select: publicPageSelect,
  });

  await audit("connect_page", webhookSubscribed ? "SUCCESS" : "FAILED", page.id, lastError ?? "Đã lưu Fanpage.", {
    webhookSubscribed,
  });

  return saved;
}

export async function disconnectPage(pageId: string, workspaceId: string) {
  const existing = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId } });
  if (!existing) throw new Error("Không tìm thấy Fanpage");
  const page = await prisma.facebookPage.update({
    where: { pageId },
    data: {
      botEnabled: false,
      status: "DISCONNECTED",
      pageAccessTokenEncrypted: null,
      lastError: null,
    },
    select: publicPageSelect,
  });
  await audit("disconnect_page", "SUCCESS", pageId, "Đã ngắt kết nối Fanpage.");
  return page;
}

export async function toggleBot(pageId: string, workspaceId: string, botEnabled: boolean) {
  const existing = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId } });
  if (!existing) throw new Error("Không tìm thấy Fanpage");
  const page = await prisma.facebookPage.update({
    where: { pageId },
    data: { botEnabled },
    select: publicPageSelect,
  });
  await audit("toggle_bot", "SUCCESS", pageId, botEnabled ? "Đã bật bot." : "Đã tắt bot.");
  return page;
}

export async function runPageHealthCheck(pageId: string, workspaceId: string) {
  const page = await prisma.facebookPage.findFirst({ where: { pageId, workspaceId } });
  if (!page) throw new Error("Không tìm thấy Fanpage");
  if (!page.pageAccessTokenEncrypted) {
    const updated = await prisma.facebookPage.update({
      where: { pageId },
      data: {
        status: "TOKEN_EXPIRED",
        lastHealthCheckAt: new Date(),
        lastError: "Thiếu Page Access Token. Hãy reconnect Fanpage.",
      },
      select: publicPageSelect,
    });
    await audit("health_check", "FAILED", pageId, "Thiếu Page Access Token.");
    return updated;
  }

  try {
    const token = decryptToken(page.pageAccessTokenEncrypted);
    const [health, subscribedApps] = await Promise.all([
      getPageHealth(pageId, token),
      getSubscribedApps(pageId, token).catch(() => []),
    ]);
    const webhookSubscribed = subscribedApps.length > 0;
    const status = webhookSubscribed ? "CONNECTED" : "WEBHOOK_NOT_SUBSCRIBED";
    const updated = await prisma.facebookPage.update({
      where: { pageId },
      data: {
        pageName: health.name ?? page.pageName,
        pageUsername: health.username ?? page.pageUsername,
        pagePictureUrl: health.picture?.data?.url ?? page.pagePictureUrl,
        webhookSubscribed,
        status,
        lastHealthCheckAt: new Date(),
        lastError: webhookSubscribed ? null : "Webhook chưa subscribed vào app.",
        permissionsJson: { tasks: health.tasks ?? [] },
      },
      select: publicPageSelect,
    });
    await audit("health_check", webhookSubscribed ? "SUCCESS" : "FAILED", pageId, updated.lastError);
    return updated;
  } catch (err) {
    const message = readableError(err);
    const updated = await prisma.facebookPage.update({
      where: { pageId },
      data: {
        status: message.toLowerCase().includes("permission") ? "MISSING_PERMISSION" : "ERROR",
        lastHealthCheckAt: new Date(),
        lastError: message,
      },
      select: publicPageSelect,
    });
    await audit("health_check", "FAILED", pageId, message);
    return updated;
  }
}

export const publicPageSelect = {
  id: true,
  workspaceId: true,
  pageId: true,
  pageName: true,
  pageUsername: true,
  pagePictureUrl: true,
  botEnabled: true,
  webhookSubscribed: true,
  status: true,
  lastHealthCheckAt: true,
  lastError: true,
  updatedAt: true,
} as const;

function pageData(
  page: FacebookUserPage,
  connectionId: string,
  workspaceId: string,
  webhookSubscribed: boolean,
  status: "CONNECTED" | "WEBHOOK_NOT_SUBSCRIBED",
  lastError: string | null
) {
  return {
    workspaceId,
    pageId: page.id,
    pageName: page.name,
    pageUsername: page.username ?? null,
    pagePictureUrl: page.picture?.data?.url ?? null,
    pageAccessTokenEncrypted: encryptToken(page.access_token ?? ""),
    tokenExpiresAt: null,
    connectionId,
    botEnabled: false,
    webhookSubscribed,
    permissionsJson: { tasks: page.tasks ?? [] },
    status,
    lastHealthCheckAt: new Date(),
    lastError,
  };
}

function safeConnection(connection: any) {
  if (!connection) return null;
  return {
    id: connection.id,
    facebookUserId: connection.facebookUserId,
    facebookUserName: connection.facebookUserName,
    tokenType: connection.tokenType,
    expiresAt: connection.expiresAt,
    grantedScopes: connection.grantedScopes,
    status: connection.status,
    createdAt: connection.createdAt,
  };
}

async function audit(
  action: string,
  status: "SUCCESS" | "FAILED",
  targetPageId?: string,
  message?: string | null,
  metadataJson?: Record<string, unknown>
) {
  await prisma.integrationAuditLog.create({
    data: {
      provider: "facebook",
      action,
      targetPageId,
      status,
      message: message ?? null,
      metadataJson: (metadataJson ?? undefined) as any,
    },
  });
}

function readableError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
