import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

function sign(value: string): string {
  return crypto.createHmac("sha256", env.unsubscribeSecret).update(value).digest("base64url");
}

// Token unsubscribe không trạng thái (stateless): "<customerId>.<hmac>".
export function buildUnsubscribeToken(customerId: string): string {
  return `${customerId}.${sign(customerId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const customerId = token.slice(0, i);
  const providedSig = token.slice(i + 1);
  const expected = sign(customerId);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return customerId;
}

export function buildUnsubscribeUrl(customerId: string): string {
  const base = env.appBaseUrl.replace(/\/$/, "");
  return `${base}/api/unsubscribe?token=${encodeURIComponent(buildUnsubscribeToken(customerId))}`;
}

// Ghi lại token (audit) — idempotent theo hash.
export async function recordUnsubscribeToken(customerId: string): Promise<void> {
  const token = buildUnsubscribeToken(customerId);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  try {
    await prisma.unsubscribeToken.upsert({
      where: { tokenHash: hash },
      update: {},
      create: { customerId, tokenHash: hash },
    });
  } catch {
    // không critical
  }
}
