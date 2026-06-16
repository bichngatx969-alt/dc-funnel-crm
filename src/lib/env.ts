import type { Vertical } from "@/lib/types";

const DEFAULT_AUTH_SECRET = "dev-insecure-secret-change-me";
const DEFAULT_UNSUBSCRIBE_SECRET = "dev-unsub-secret";
const DEFAULT_ENV_EXAMPLE_SECRET = "please-change-this-to-a-long-random-string";
const DEFAULT_CRON_SECRET = "please-change-this-cron-secret";
const DEFAULT_META_VERIFY_TOKEN = "please-change-this-meta-verify-token";

// Đọc biến môi trường một chỗ, có giá trị mặc định an toàn.
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Meta Messenger
  facebookAppId: process.env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? process.env.META_APP_SECRET ?? "",
  facebookApiVersion: process.env.FACEBOOK_API_VERSION || process.env.META_GRAPH_VERSION || "v20.0",
  facebookLoginRedirectUri:
    process.env.FACEBOOK_LOGIN_REDIRECT_URI ||
    `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/integrations/facebook/callback`,
  tokenEncryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
  metaVerifyToken: process.env.META_VERIFY_TOKEN ?? "",
  metaPageAccessToken: process.env.META_PAGE_ACCESS_TOKEN ?? "",
  metaAppSecret: process.env.META_APP_SECRET ?? "",
  facebookPageId: process.env.FACEBOOK_PAGE_ID ?? "",
  metaGraphVersion: process.env.META_GRAPH_VERSION || "v21.0",

  // Vertical mặc định cho flow
  defaultVertical: ((process.env.DEFAULT_VERTICAL as Vertical) || "fashion") as Vertical,

  // AI (tùy chọn)
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",

  // Admin login
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminName: process.env.ADMIN_NAME || "Admin D.C",

  // Auth session
  authSecret: process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET,

  // App
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",

  // Email (Resend) — tùy chọn
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  emailFromName: process.env.EMAIL_FROM_NAME || "D.C Funnel Bot",
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || "",
  unsubscribeSecret: process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET || DEFAULT_UNSUBSCRIBE_SECRET,

  // Cron bảo vệ endpoint automation
  cronSecret: process.env.CRON_SECRET ?? "",
};

validateProductionEnv();

// AI chỉ bật khi có OPENAI_API_KEY.
export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
}

// Email chỉ bật khi có RESEND_API_KEY và địa chỉ gửi.
export function isEmailEnabled(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_API_KEY.trim().length > 0 &&
      (process.env.EMAIL_FROM_ADDRESS ?? "").trim().length > 0
  );
}

function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  assertProductionSecret("AUTH_SECRET", env.authSecret, [
    DEFAULT_AUTH_SECRET,
    DEFAULT_ENV_EXAMPLE_SECRET,
  ]);
  assertProductionSecret("UNSUBSCRIBE_SECRET", env.unsubscribeSecret, [
    DEFAULT_UNSUBSCRIBE_SECRET,
    DEFAULT_ENV_EXAMPLE_SECRET,
  ]);
  assertProductionSecret("CRON_SECRET", env.cronSecret, [DEFAULT_CRON_SECRET]);
  assertProductionSecret("META_VERIFY_TOKEN", env.metaVerifyToken, [DEFAULT_META_VERIFY_TOKEN]);

  if (!env.tokenEncryptionSecret || env.tokenEncryptionSecret.trim().length < 32) {
    throw new Error("Production requires TOKEN_ENCRYPTION_SECRET with at least 32 characters.");
  }
}

function assertProductionSecret(name: string, value: string, defaultValues: string[]): void {
  const normalized = value.trim();
  if (!normalized || defaultValues.includes(normalized)) {
    throw new Error(`Production requires a non-default ${name}.`);
  }
}
