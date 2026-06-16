import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { env } from "@/lib/env";
import { startFacebookLogin } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "fb_oauth_state";
const REDIRECT_URI_COOKIE = "fb_oauth_redirect_uri";

export async function GET(req: Request) {
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/integrations/facebook/callback`;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${origin}/login`);

  const missingConfig = getMissingFacebookOAuthConfig(redirectUri);
  if (missingConfig.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Facebook OAuth environment variables.",
        missing: missingConfig,
      },
      { status: 400 }
    );
  }

  let state: string;
  let url: string;
  try {
    ({ state, url } = startFacebookLogin(redirectUri));
  } catch (err) {
    console.warn("[FACEBOOK] OAuth login init failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: "Facebook OAuth login failed. Check Meta app configuration." },
      { status: 500 }
    );
  }

  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  store.set(REDIRECT_URI_COOKIE, redirectUri, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(url);
}

function getMissingFacebookOAuthConfig(redirectUri: string): string[] {
  const missing: string[] = [];
  if (!env.facebookAppId) missing.push("FACEBOOK_APP_ID or META_APP_ID");
  else if (!/^\d+$/.test(env.facebookAppId)) missing.push("FACEBOOK_APP_ID/META_APP_ID must be numeric");
  if (!env.facebookAppSecret) missing.push("FACEBOOK_APP_SECRET or META_APP_SECRET");
  if (!redirectUri) missing.push("FACEBOOK_LOGIN_REDIRECT_URI");
  return missing;
}

function getRequestOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
