import { env } from "@/lib/env";

const REQUIRED_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_messaging",
  "business_management",
  "catalog_management",
];
export const PAGE_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_reads",
  "message_deliveries",
  "feed",
];

type GraphTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type FacebookUserProfile = {
  id: string;
  name?: string;
};

export type FacebookUserPage = {
  id: string;
  name: string;
  username?: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
};

export type FacebookBusiness = {
  id: string;
  name?: string;
  verification_status?: string;
  created_time?: string;
};

export type FacebookCatalog = {
  id: string;
  name?: string;
  vertical?: string;
  product_count?: number;
};

function graphBase(): string {
  return `https://graph.facebook.com/${env.facebookApiVersion}`;
}

export function getFacebookLoginUrl(state: string, redirectUri = env.facebookLoginRedirectUri): string {
  assertFacebookOAuthEnv(redirectUri);
  const params = new URLSearchParams({
    client_id: env.facebookAppId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: REQUIRED_SCOPES.join(","),
  });
  return `https://www.facebook.com/${env.facebookApiVersion}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(
  code: string,
  redirectUri = env.facebookLoginRedirectUri
): Promise<GraphTokenResponse> {
  assertFacebookOAuthEnv(redirectUri);
  return graphGet<GraphTokenResponse>("/oauth/access_token", {
    client_id: env.facebookAppId,
    client_secret: env.facebookAppSecret,
    redirect_uri: redirectUri,
    code,
  });
}

export async function getLongLivedUserAccessToken(shortLivedToken: string): Promise<GraphTokenResponse> {
  assertFacebookOAuthEnv();
  return graphGet<GraphTokenResponse>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.facebookAppId,
    client_secret: env.facebookAppSecret,
    fb_exchange_token: shortLivedToken,
  });
}

export async function getUserProfile(userAccessToken: string): Promise<FacebookUserProfile> {
  return graphGet<FacebookUserProfile>("/me", {
    fields: "id,name",
    access_token: userAccessToken,
  });
}

export async function getGrantedScopes(userAccessToken: string): Promise<string[]> {
  const data = await graphGet<{ data?: { permission: string; status: string }[] }>("/me/permissions", {
    access_token: userAccessToken,
  });
  return (data.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission);
}

export async function getUserPages(userAccessToken: string): Promise<FacebookUserPage[]> {
  const data = await graphGet<{ data?: FacebookUserPage[] }>("/me/accounts", {
    fields: "id,name,username,picture{url},access_token",
    access_token: userAccessToken,
  });
  return data.data ?? [];
}

export async function getUserBusinesses(userAccessToken: string): Promise<FacebookBusiness[]> {
  const data = await graphGet<{ data?: FacebookBusiness[] }>("/me/businesses", {
    fields: "id,name,verification_status,created_time",
    access_token: userAccessToken,
  });
  return data.data ?? [];
}

export async function getBusinessCatalogs(
  businessId: string,
  userAccessToken: string
): Promise<FacebookCatalog[]> {
  const [owned, client] = await Promise.all([
    graphGet<{ data?: FacebookCatalog[] }>(`/${businessId}/owned_product_catalogs`, {
      fields: "id,name,vertical,product_count",
      access_token: userAccessToken,
    }).catch((err) => {
      throw new Error(readableGraphError(err, "owned_product_catalogs"));
    }),
    graphGet<{ data?: FacebookCatalog[] }>(`/${businessId}/client_product_catalogs`, {
      fields: "id,name,vertical,product_count",
      access_token: userAccessToken,
    }).catch((err) => {
      throw new Error(readableGraphError(err, "client_product_catalogs"));
    }),
  ]);

  const byId = new Map<string, FacebookCatalog>();
  for (const catalog of [...(owned.data ?? []), ...(client.data ?? [])]) {
    byId.set(catalog.id, catalog);
  }
  return Array.from(byId.values());
}

export async function subscribePageToApp(pageId: string, pageAccessToken: string): Promise<{ success: boolean }> {
  return graphPost<{ success?: boolean }>(`/${pageId}/subscribed_apps`, {
    subscribed_fields: PAGE_SUBSCRIBED_FIELDS.join(","),
    access_token: pageAccessToken,
  }).then((res) => ({ success: Boolean(res.success) }));
}

export async function getSubscribedApps(pageId: string, pageAccessToken: string): Promise<any[]> {
  const data = await graphGet<{ data?: any[] }>(`/${pageId}/subscribed_apps`, {
    fields: "id,name,subscribed_fields",
    access_token: pageAccessToken,
  });
  return data.data ?? [];
}

export async function getPageHealth(pageId: string, pageAccessToken: string): Promise<FacebookUserPage> {
  return graphGet<FacebookUserPage>(`/${pageId}`, {
    fields: "id,name,username,picture{url}",
    access_token: pageAccessToken,
  });
}

function assertFacebookOAuthEnv(redirectUri = env.facebookLoginRedirectUri): void {
  if (!env.facebookAppId || !env.facebookAppSecret || !redirectUri) {
    throw new Error("Thiếu FACEBOOK_APP_ID, FACEBOOK_APP_SECRET hoặc FACEBOOK_LOGIN_REDIRECT_URI.");
  }
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${graphBase()}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  return parseGraphResponse<T>(res);
}

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${graphBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  return parseGraphResponse<T>(res);
}

async function parseGraphResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const message = data?.error?.message || `Facebook Graph API lỗi HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

function readableGraphError(err: unknown, edge: string): string {
  const message = err instanceof Error ? err.message : String(err);
  return `${edge}: ${message}`;
}
