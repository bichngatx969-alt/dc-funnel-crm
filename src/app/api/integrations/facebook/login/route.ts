import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { env } from "@/lib/env";
import { startFacebookLogin } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "fb_oauth_state";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${env.appBaseUrl}/login`);

  const { state, url } = startFacebookLogin();
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(url);
}
