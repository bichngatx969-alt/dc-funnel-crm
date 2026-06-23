import { env } from "@/lib/env";
import {
  PAGE_SUBSCRIBED_FIELDS,
  debugUserToken,
  getAdAccountInsights,
  getGrantedScopes,
  getUserAdAccounts,
  type FacebookAdAccount,
  type FacebookAdsInsight,
} from "@/lib/facebook/facebook-client";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/token-encryption";

export type MetaPermissionKey =
  | "pages_show_list"
  | "pages_read_engagement"
  | "pages_manage_metadata"
  | "pages_messaging"
  | "pages_manage_engagement"
  | "ads_read"
  | "business_management";

export type MetaStatus = "CONNECTED" | "PARTIAL" | "NOT_CONNECTED" | "ERROR";
export type PermissionStatus = "OK" | "MISSING" | "UNKNOWN";

const REQUIRED_PERMISSION_KEYS: MetaPermissionKey[] = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_manage_engagement",
  "ads_read",
  "business_management",
];

export type MetaConnectionStatus = {
  overallStatus: MetaStatus;
  facebookApp: {
    configured: boolean;
    appId: boolean;
    appSecret: boolean;
    redirectUri: boolean;
  };
  userToken: {
    exists: boolean;
    valid: boolean;
    expiresAt: Date | null;
    scopes: string[];
    status: string | null;
  };
  pages: {
    connectedCount: number;
    items: {
      id: string;
      name: string;
      status: string;
      hasPageToken: boolean;
      messengerReady: boolean;
      commentReady: boolean;
      subscribedFields: string[];
      lastError: string | null;
    }[];
  };
  webhooks: {
    messenger: "OK" | "MISSING" | "UNKNOWN";
    comments: "OK" | "MISSING" | "UNKNOWN";
    callbackReachable: boolean;
  };
  business: {
    connected: boolean;
    items: {
      id: string;
      name: string;
      verificationStatus: string | null;
    }[];
  };
  adAccounts: {
    connected: boolean;
    items: SafeAdAccount[];
    error?: string;
  };
  permissions: Record<MetaPermissionKey, PermissionStatus>;
  blockers: MetaBlocker[];
  nextActions: string[];
};

export type MetaBlocker = {
  code: string;
  title: string;
  description: string;
  action: string;
};

export type SafeAdAccount = {
  id: string;
  accountId: string | null;
  name: string;
  status: number | null;
  currency: string | null;
  timezone: string | null;
};

export type SafeAdInsight = {
  id: string;
  name: string;
  level: "campaign" | "adset" | "ad";
  impressions: number;
  clicks: number;
  spendVnd: number;
  cpm: number;
  ctr: number;
  messages: number;
  rawDateStart: string | null;
  rawDateStop: string | null;
};

export async function buildMetaConnectionStatus(workspaceId: string): Promise<MetaConnectionStatus> {
  const facebookApp = {
    configured: Boolean(env.facebookAppId && env.facebookAppSecret && env.facebookLoginRedirectUri),
    appId: Boolean(env.facebookAppId),
    appSecret: Boolean(env.facebookAppSecret),
    redirectUri: Boolean(env.facebookLoginRedirectUri),
  };

  const [connection, pages, businesses] = await Promise.all([
    prisma.facebookConnection.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.facebookPage.findMany({
      where: { workspaceId, status: { not: "DISCONNECTED" } },
      orderBy: { updatedAt: "desc" },
      select: {
        pageId: true,
        pageName: true,
        status: true,
        webhookSubscribed: true,
        pageAccessTokenEncrypted: true,
        permissionsJson: true,
        lastError: true,
      },
    }),
    prisma.metaBusinessConnection.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { businessId: true, businessName: true, verificationStatus: true },
    }),
  ]);

  const blockers: MetaBlocker[] = [];
  const nextActions: string[] = [];
  let scopes = uniqueStrings(connection?.grantedScopes ?? []);
  let tokenValid = false;
  let adAccounts: SafeAdAccount[] = [];
  let adAccountError: string | undefined;

  if (!facebookApp.configured) {
    blockers.push({
      code: "META_APP_NOT_CONFIGURED",
      title: "Thiếu cấu hình Meta App",
      description: "Cần FACEBOOK_APP_ID, FACEBOOK_APP_SECRET và callback URL để bắt đầu OAuth.",
      action: "Bổ sung biến môi trường trong Dokploy rồi redeploy.",
    });
    nextActions.push("Cấu hình Meta App env trong Dokploy");
  }

  const tokenExists = Boolean(connection?.accessTokenEncrypted);
  if (!tokenExists) {
    blockers.push({
      code: "FACEBOOK_NOT_CONNECTED",
      title: "Chưa kết nối Facebook user token",
      description: "Chưa có user token để đọc Page, Business hoặc Ads account.",
      action: "Bấm Reconnect Facebook trong Meta Connection Center.",
    });
    nextActions.push("Reconnect Facebook");
  }

  let decryptedToken: string | null = null;
  if (connection?.accessTokenEncrypted) {
    try {
      decryptedToken = decryptToken(connection.accessTokenEncrypted);
      const [freshScopes, debug] = await Promise.all([
        getGrantedScopes(decryptedToken).catch(() => scopes),
        debugUserToken(decryptedToken).catch(() => null),
      ]);
      scopes = uniqueStrings([...scopes, ...freshScopes, ...(debug?.data?.scopes ?? [])]);
      tokenValid = Boolean(debug?.data?.is_valid ?? true);
    } catch {
      tokenValid = false;
      blockers.push({
        code: "TOKEN_INVALID",
        title: "Token Facebook không đọc được hoặc đã hết hạn",
        description: "Không thể kiểm tra token hiện tại. Dữ liệu Page/Ads có thể không đồng bộ.",
        action: "Reconnect Facebook để cấp token mới.",
      });
      nextActions.push("Reconnect Facebook để làm mới token");
    }
  }

  const permissions = buildPermissionMap(scopes, tokenExists);

  const pageItems = pages.map((page) => {
    const subscribedFields = extractSubscribedFields(page.permissionsJson);
    const hasMessages = subscribedFields.includes("messages") || (subscribedFields.length === 0 && page.webhookSubscribed);
    const hasFeed = subscribedFields.includes("feed") || (subscribedFields.length === 0 && page.webhookSubscribed);
    return {
      id: page.pageId,
      name: page.pageName,
      status: page.status,
      hasPageToken: Boolean(page.pageAccessTokenEncrypted),
      messengerReady: Boolean(page.pageAccessTokenEncrypted && page.webhookSubscribed && hasMessages),
      commentReady: Boolean(page.pageAccessTokenEncrypted && page.webhookSubscribed && hasFeed),
      subscribedFields,
      lastError: page.lastError,
    };
  });

  const messengerReady = pageItems.some((page) => page.messengerReady);
  const commentReady = pageItems.some((page) => page.commentReady);

  if (pageItems.length === 0) {
    blockers.push({
      code: "NO_FACEBOOK_PAGE",
      title: "Chưa chọn Fanpage",
      description: "Cần chọn Fanpage để nhận inbox/comment vào CRM.",
      action: "Bấm Sync Pages rồi chọn Fanpage cần kết nối.",
    });
    nextActions.push("Sync Pages và chọn Fanpage");
  }
  if (pageItems.length > 0 && !messengerReady) {
    blockers.push({
      code: "MESSENGER_NOT_READY",
      title: "Messenger webhook chưa sẵn sàng",
      description: "Page cần page token, webhook subscribed và trường messages.",
      action: "Chạy Health check hoặc reconnect Fanpage.",
    });
    nextActions.push("Health check Fanpage");
  }
  if (pageItems.length > 0 && !commentReady) {
    blockers.push({
      code: "COMMENTS_NOT_READY",
      title: "Comment webhook chưa sẵn sàng",
      description: "Page cần webhook field feed để comment đổ vào CRM.",
      action: "Chạy Health check hoặc reconnect Fanpage.",
    });
    nextActions.push("Kiểm tra subscribed field feed");
  }

  if (permissions.pages_manage_engagement !== "OK") {
    blockers.push({
      code: "MISSING_PAGES_MANAGE_ENGAGEMENT",
      title: "Thiếu quyền pages_manage_engagement",
      description: "Cần quyền này để reply/hide comment bằng Graph API.",
      action: "Reconnect Facebook; nếu app chưa được duyệt thì cần App Review.",
    });
    nextActions.push("Xin/cấp pages_manage_engagement nếu cần trả lời hoặc ẩn comment");
  }

  if (permissions.business_management !== "OK") {
    blockers.push({
      code: "MISSING_BUSINESS_MANAGEMENT",
      title: "Thiếu quyền business_management",
      description: "Cần quyền này để đọc Business Manager và Catalog.",
      action: "Reconnect Facebook với business_management hoặc cấp app vào Business.",
    });
    nextActions.push("Kết nối Business Manager");
  }

  if (permissions.ads_read !== "OK") {
    blockers.push({
      code: "MISSING_ADS_READ",
      title: "Thiếu quyền ads_read",
      description: "Cần ads_read để đọc Ads Insights.",
      action: "Reconnect Facebook; nếu app chưa được duyệt thì cần App Review.",
    });
    nextActions.push("Reconnect Facebook với quyền ads_read");
  } else if (decryptedToken) {
    try {
      adAccounts = (await getUserAdAccounts(decryptedToken)).map(safeAdAccount);
      if (adAccounts.length === 0) {
        blockers.push({
          code: "NO_AD_ACCOUNT",
          title: "Chưa thấy Ad Account",
          description: "Token có ads_read nhưng chưa trả về tài khoản quảng cáo nào.",
          action: "Kiểm tra quyền của user trong Business Manager hoặc chọn đúng Business.",
        });
        nextActions.push("Kiểm tra quyền Ad Account trong Business Manager");
      }
    } catch (err) {
      adAccountError = safeGraphMessage(err);
      blockers.push({
        code: "AD_ACCOUNT_GRAPH_ERROR",
        title: "Không đọc được Ad Account",
        description: adAccountError,
        action: "Kiểm tra quyền ads_read, Business role và token Facebook.",
      });
      nextActions.push("Reconnect Facebook hoặc kiểm tra quyền Ads");
    }
  }

  const hasCoreConnection = facebookApp.configured && tokenExists && tokenValid && pageItems.length > 0;
  const hasAdsConnection = permissions.ads_read === "OK" && adAccounts.length > 0;
  const overallStatus: MetaStatus = !facebookApp.configured || !tokenExists
    ? "NOT_CONNECTED"
    : !tokenValid
      ? "ERROR"
      : hasCoreConnection && messengerReady && commentReady && hasAdsConnection
        ? "CONNECTED"
        : "PARTIAL";

  return {
    overallStatus,
    facebookApp,
    userToken: {
      exists: tokenExists,
      valid: tokenValid,
      expiresAt: connection?.expiresAt ?? null,
      scopes,
      status: connection?.status ?? null,
    },
    pages: {
      connectedCount: pageItems.length,
      items: pageItems,
    },
    webhooks: {
      messenger: messengerReady ? "OK" : pageItems.length > 0 ? "MISSING" : "UNKNOWN",
      comments: commentReady ? "OK" : pageItems.length > 0 ? "MISSING" : "UNKNOWN",
      callbackReachable: Boolean(env.appBaseUrl && env.facebookLoginRedirectUri),
    },
    business: {
      connected: businesses.length > 0,
      items: businesses.map((business) => ({
        id: business.businessId,
        name: business.businessName,
        verificationStatus: business.verificationStatus,
      })),
    },
    adAccounts: {
      connected: adAccounts.length > 0,
      items: adAccounts,
      ...(adAccountError ? { error: adAccountError } : {}),
    },
    permissions,
    blockers: dedupeBlockers(blockers),
    nextActions: uniqueStrings(nextActions),
  };
}

export async function getWorkspaceAdAccounts(workspaceId: string) {
  const status = await buildMetaConnectionStatus(workspaceId);
  if (status.permissions.ads_read !== "OK") {
    return {
      ok: false as const,
      status,
      code: "MISSING_ADS_READ",
      message: "Thiếu quyền ads_read để đọc Ad Account.",
    };
  }
  return {
    ok: true as const,
    status,
    items: status.adAccounts.items,
  };
}

export async function getWorkspaceAdInsights(
  workspaceId: string,
  input: { date?: string | null; level?: string | null; adAccountId?: string | null }
) {
  const status = await buildMetaConnectionStatus(workspaceId);
  if (status.permissions.ads_read !== "OK") {
    return {
      ok: false as const,
      statusCode: 403,
      code: "MISSING_ADS_READ",
      message: "Thiếu quyền ads_read để đọc Ads Insights.",
      connectionStatus: status,
    };
  }

  const account = pickAdAccount(status.adAccounts.items, input.adAccountId);
  if (!account) {
    return {
      ok: false as const,
      statusCode: 409,
      code: "AD_ACCOUNT_NOT_SELECTED",
      message: "Chưa có hoặc chưa chọn Ad Account.",
      connectionStatus: status,
    };
  }

  const connection = await prisma.facebookConnection.findFirst({ orderBy: { createdAt: "desc" } });
  if (!connection?.accessTokenEncrypted) {
    return {
      ok: false as const,
      statusCode: 401,
      code: "FACEBOOK_NOT_CONNECTED",
      message: "Chưa có token Facebook hợp lệ.",
      connectionStatus: status,
    };
  }

  try {
    const token = decryptToken(connection.accessTokenEncrypted);
    const level = normalizeLevel(input.level);
    const date = input.date || todayVietnamDate();
    const rawItems = await getAdAccountInsights(account.accountId ?? account.id, token, { date, level });
    return {
      ok: true as const,
      connectionStatus: status,
      adAccount: account,
      date,
      level,
      items: rawItems.map((item, index) => safeInsight(item, level, index)),
    };
  } catch (err) {
    return {
      ok: false as const,
      statusCode: 502,
      code: "META_GRAPH_ERROR",
      message: safeGraphMessage(err),
      connectionStatus: status,
    };
  }
}

function buildPermissionMap(scopes: string[], tokenExists: boolean): Record<MetaPermissionKey, PermissionStatus> {
  const scopeSet = new Set(scopes);
  const output = {} as Record<MetaPermissionKey, PermissionStatus>;
  for (const permission of REQUIRED_PERMISSION_KEYS) {
    output[permission] = !tokenExists ? "UNKNOWN" : scopeSet.has(permission) ? "OK" : "MISSING";
  }
  return output;
}

function extractSubscribedFields(raw: unknown): string[] {
  const json = raw as { subscribedFields?: unknown; requiredSubscribedFields?: unknown } | null;
  const source = json?.subscribedFields ?? json?.requiredSubscribedFields;
  if (!source) return [];
  if (Array.isArray(source)) return uniqueStrings(source.map(String));
  if (typeof source === "string") return uniqueStrings(source.split(",").map((item) => item.trim()).filter(Boolean));
  return [];
}

function safeAdAccount(account: FacebookAdAccount): SafeAdAccount {
  return {
    id: account.id,
    accountId: account.account_id ?? account.id.replace(/^act_/, ""),
    name: account.name ?? account.account_id ?? account.id,
    status: typeof account.account_status === "number" ? account.account_status : null,
    currency: account.currency ?? null,
    timezone: account.timezone_name ?? null,
  };
}

function pickAdAccount(items: SafeAdAccount[], adAccountId?: string | null): SafeAdAccount | null {
  if (adAccountId) {
    const normalized = adAccountId.replace(/^act_/, "");
    return items.find((item) => item.id === adAccountId || item.accountId === normalized || item.id === `act_${normalized}`) ?? null;
  }
  return items.length === 1 ? items[0] : null;
}

function safeInsight(item: FacebookAdsInsight, level: "campaign" | "adset" | "ad", index: number): SafeAdInsight {
  const id = item.ad_id ?? item.adset_id ?? item.campaign_id ?? `row-${index}`;
  const name = item.ad_name ?? item.adset_name ?? item.campaign_name ?? id;
  return {
    id,
    name,
    level,
    impressions: parseNumber(item.impressions),
    clicks: parseNumber(item.clicks),
    spendVnd: Math.round(parseNumber(item.spend)),
    cpm: parseNumber(item.cpm),
    ctr: parseNumber(item.ctr),
    messages: extractMessageActions(item.actions),
    rawDateStart: item.date_start ?? null,
    rawDateStop: item.date_stop ?? null,
  };
}

function extractMessageActions(actions: FacebookAdsInsight["actions"]): number {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((sum, action) => {
    const type = String(action.action_type ?? "");
    if (!type.includes("messaging") && !type.includes("onsite_conversion.messaging")) return sum;
    return sum + parseNumber(action.value);
  }, 0);
}

function normalizeLevel(value: string | null | undefined): "campaign" | "adset" | "ad" {
  return value === "adset" || value === "ad" ? value : "campaign";
}

function parseNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayVietnamDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function safeGraphMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/access_token=[^&\s]+/gi, "access_token=***");
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean))).sort();
}

function dedupeBlockers(blockers: MetaBlocker[]): MetaBlocker[] {
  const seen = new Set<string>();
  return blockers.filter((blocker) => {
    if (seen.has(blocker.code)) return false;
    seen.add(blocker.code);
    return true;
  });
}
