import crypto from "crypto";
import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailProvider, ProviderName, SendEmailParams, SendEmailResult } from "./provider";

export class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  getProviderName(): ProviderName {
    return "RESEND";
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const from = `${env.emailFromName} <${env.emailFromAddress}>`;
    try {
      // Cast any để tránh lệ thuộc tên field chính xác theo version SDK.
      const payload: any = {
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        headers: params.headers,
      };
      const { data, error } = await this.client.emails.send(payload);
      if (error) {
        console.error("[EMAIL][Resend] Lỗi gửi:", error.message ?? error);
        return { ok: false, error: error.message ?? "resend_error" };
      }
      return { ok: true, providerMessageId: data?.id };
    } catch (err: any) {
      console.error("[EMAIL][Resend] Exception:", err?.message ?? err);
      return { ok: false, error: String(err?.message ?? err) };
    }
  }
}

// Verify webhook Resend (dùng Svix). Trả về true nếu hợp lệ hoặc chưa cấu hình secret.
export function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  if (!secret) return true; // chưa cấu hình -> bỏ qua verify (MVP)
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sig = headers.get("svix-signature");
  if (!id || !ts || !sig) return false;

  const secretKey = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(secretKey, "base64");
  } catch {
    return false;
  }
  const signedContent = `${id}.${ts}.${rawBody}`;
  const expected = crypto.createHmac("sha256", keyBytes).update(signedContent).digest("base64");

  // header: "v1,<sig> v1,<sig2>"
  const provided = sig.split(" ").map((s) => (s.includes(",") ? s.split(",")[1] : s));
  return provided.some((p) => {
    try {
      const a = Buffer.from(p);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}
