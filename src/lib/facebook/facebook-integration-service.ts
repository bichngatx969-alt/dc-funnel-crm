import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForAccessToken,
  getFacebookLoginUrl,
  getBusinessCatalogs,
  getGrantedScopes,
  getLongLivedUserAccessToken,
  getPageHealth,
  getSubscribedApps,
  getUserBusinesses,
  getUserPages,
  getUserProfile,
  subscribePageToApp,
  type FacebookBusiness,
  type FacebookCatalog,
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

export async function listAvailableBusinesses(workspaceId: string) {
  const connection = await getLatestFacebookConnection();
  const connectedBusinesses = await prisma.metaBusinessConnection.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: publicBusinessSelect,
  });

  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    return {
      items: [],
      connectedBusinesses,
      connection: safeConnection(connection),
      error: "Chưa có kết nối Facebook hợp lệ. Vui lòng bấm Kết nối Facebook trước.",
    };
  }

  try {
    const token = decryptToken(connection.accessTokenEncrypted);
    const businesses = await getUserBusinesses(token);
    return {
      items: businesses.map((business) => ({
        id: business.id,
        name: business.name ?? business.id,
        verificationStatus: business.verification_status ?? null,
        createdTime: business.created_time ?? null,
        connected: connectedBusinesses.some((item) => item.businessId === business.id),
      })),
      connectedBusinesses,
      connection: safeConnection(connection),
    };
  } catch (err) {
    return {
      items: [],
      connectedBusinesses,
      connection: safeConnection(connection),
      error: readableBusinessError(err),
    };
  }
}

export async function listAvailableCatalogs(workspaceId: string, businessId: string) {
  const connection = await getLatestFacebookConnection();
  const business = await prisma.metaBusinessConnection.findFirst({
    where: { workspaceId, businessId, deletedAt: null },
    select: publicBusinessSelect,
  });
  const connectedCatalogs = await prisma.metaCatalogConnection.findMany({
    where: { workspaceId, businessId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: publicCatalogSelect,
  });

  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    return {
      items: [],
      connectedCatalogs,
      business,
      connection: safeConnection(connection),
      error: "Chưa có kết nối Facebook hợp lệ. Vui lòng bấm Kết nối Facebook trước.",
    };
  }

  try {
    const token = decryptToken(connection.accessTokenEncrypted);
    const catalogs = await getBusinessCatalogs(businessId, token);
    return {
      items: catalogs.map((catalog) => ({
        id: catalog.id,
        name: catalog.name ?? catalog.id,
        vertical: catalog.vertical ?? null,
        productCount: catalog.product_count ?? null,
        businessId,
        connected: connectedCatalogs.some((item) => item.catalogId === catalog.id),
      })),
      connectedCatalogs,
      business,
      connection: safeConnection(connection),
    };
  } catch (err) {
    return {
      items: [],
      connectedCatalogs,
      business,
      connection: safeConnection(connection),
      error: readableCatalogError(err),
    };
  }
}

export async function connectBusiness(
  workspaceId: string,
  userId: string,
  input: { businessId: string; businessName?: string | null }
) {
  const connection = await getLatestFacebookConnection();
  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    throw new Error("Chưa có kết nối Facebook hợp lệ. Vui lòng bấm Kết nối Facebook trước.");
  }

  const token = decryptToken(connection.accessTokenEncrypted);
  const businesses = await getUserBusinesses(token);
  const business = businesses.find((item) => item.id === input.businessId);
  if (!business) {
    throw new Error("Không tìm thấy Business trong tài khoản Facebook hiện tại hoặc thiếu quyền business_management.");
  }

  const saved = await prisma.metaBusinessConnection.upsert({
    where: { workspaceId_businessId: { workspaceId, businessId: business.id } },
    update: businessData(business, workspaceId, userId, input.businessName),
    create: businessData(business, workspaceId, userId, input.businessName),
    select: publicBusinessSelect,
  });

  await audit("connect_business", "SUCCESS", business.id, "Đã kết nối Meta Business.", {
    businessId: business.id,
  });
  return saved;
}

export async function connectCatalog(
  workspaceId: string,
  input: { businessId: string; catalogId: string; catalogName?: string | null }
) {
  const connection = await getLatestFacebookConnection();
  if (!connection?.accessTokenEncrypted || connection.status !== "CONNECTED") {
    throw new Error("Chưa có kết nối Facebook hợp lệ. Vui lòng bấm Kết nối Facebook trước.");
  }

  const token = decryptToken(connection.accessTokenEncrypted);
  const catalogs = await getBusinessCatalogs(input.businessId, token);
  const catalog = catalogs.find((item) => item.id === input.catalogId);
  if (!catalog) {
    throw new Error("Không tìm thấy Catalog trong Business này hoặc thiếu quyền catalog_management.");
  }

  const business = await prisma.metaBusinessConnection.findUnique({
    where: { workspaceId_businessId: { workspaceId, businessId: input.businessId } },
    select: { id: true },
  });

  const saved = await prisma.metaCatalogConnection.upsert({
    where: { workspaceId_catalogId: { workspaceId, catalogId: catalog.id } },
    update: catalogData(catalog, workspaceId, input.businessId, business?.id ?? null, input.catalogName),
    create: catalogData(catalog, workspaceId, input.businessId, business?.id ?? null, input.catalogName),
    select: publicCatalogSelect,
  });

  await audit("connect_catalog", "SUCCESS", catalog.id, "Đã kết nối Meta Catalog.", {
    businessId: input.businessId,
    catalogId: catalog.id,
  });
  return saved;
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

export const publicBusinessSelect = {
  id: true,
  workspaceId: true,
  businessId: true,
  businessName: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const publicCatalogSelect = {
  id: true,
  workspaceId: true,
  businessConnectionId: true,
  businessId: true,
  catalogId: true,
  catalogName: true,
  vertical: true,
  productCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function getLatestFacebookConnection() {
  return prisma.facebookConnection.findFirst({ orderBy: { createdAt: "desc" } });
}

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

function businessData(
  business: FacebookBusiness,
  workspaceId: string,
  userId: string,
  businessName?: string | null
) {
  return {
    workspaceId,
    userId,
    businessId: business.id,
    businessName: businessName || business.name || business.id,
    verificationStatus: business.verification_status ?? null,
    rawJson: business as any,
    deletedAt: null,
  };
}

function catalogData(
  catalog: FacebookCatalog,
  workspaceId: string,
  businessId: string,
  businessConnectionId: string | null,
  catalogName?: string | null
) {
  return {
    workspaceId,
    businessConnectionId,
    businessId,
    catalogId: catalog.id,
    catalogName: catalogName || catalog.name || catalog.id,
    vertical: catalog.vertical ?? null,
    productCount: catalog.product_count ?? null,
    rawJson: catalog as any,
    deletedAt: null,
  };
}

function readableBusinessError(err: unknown): string {
  const message = readableError(err);
  if (isPermissionError(message)) {
    return "Missing permission: business_management. Chưa cấp quyền Business/Catalog. Vui lòng cấp thêm quyền hoặc thêm app vào BM.";
  }
  return message || "User has no Business assets.";
}

function readableCatalogError(err: unknown): string {
  const message = readableError(err);
  if (isPermissionError(message)) {
    return "Missing permission: catalog_management. Chưa cấp quyền Business/Catalog. Vui lòng cấp thêm quyền hoặc thêm app vào BM.";
  }
  return message || "No catalogs found.";
}

function isPermissionError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("permission") || lower.includes("access") || lower.includes("oauth");
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
