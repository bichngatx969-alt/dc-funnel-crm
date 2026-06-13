import { env, isEmailEnabled } from "@/lib/env";
import type { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend";

let cached: EmailProvider | null = null;

// Trả về provider email đang cấu hình, hoặc null nếu email bị tắt.
// Sau này muốn đổi provider (SendGrid/Brevo/Mailgun/SES/SMTP) chỉ cần sửa ở đây.
export function getEmailProvider(): EmailProvider | null {
  if (!isEmailEnabled()) return null;
  if (!cached) cached = new ResendEmailProvider(env.resendApiKey);
  return cached;
}

export { isEmailEnabled };
