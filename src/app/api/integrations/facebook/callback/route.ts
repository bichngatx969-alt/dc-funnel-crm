import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleFacebookCallback } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "fb_oauth_state";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  if (error) {
    return redirectWithError(error);
  }
  if (!code || !state) {
    return redirectWithError("Facebook callback thiếu code hoặc state.");
  }

  try {
    await handleFacebookCallback(code, state, expectedState);
    return NextResponse.redirect(`${env.appBaseUrl}/settings/integrations/facebook/pages`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return redirectWithError(message);
  }
}

function redirectWithError(message: string) {
  const target = new URL(`${env.appBaseUrl}/settings/integrations/facebook`);
  target.searchParams.set("error", message);
  return NextResponse.redirect(target);
}
