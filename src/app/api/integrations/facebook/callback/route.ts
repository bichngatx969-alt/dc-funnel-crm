import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { handleFacebookCallback } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "fb_oauth_state";
const REDIRECT_URI_COOKIE = "fb_oauth_redirect_uri";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = getRequestOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  const redirectUri = store.get(REDIRECT_URI_COOKIE)?.value || `${origin}/api/integrations/facebook/callback`;
  store.delete(STATE_COOKIE);
  store.delete(REDIRECT_URI_COOKIE);

  if (error) {
    return redirectWithError(error, origin);
  }
  if (!code || !state) {
    return redirectWithError("Facebook callback thiếu code hoặc state.", origin);
  }

  try {
    await handleFacebookCallback(code, state, expectedState, redirectUri);
    return NextResponse.redirect(`${origin}/settings/integrations/facebook/pages`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return redirectWithError(message, origin);
  }
}

function redirectWithError(message: string, origin: string) {
  const target = new URL(`${origin}/settings/integrations/facebook`);
  target.searchParams.set("error", message);
  return NextResponse.redirect(target);
}

function getRequestOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
