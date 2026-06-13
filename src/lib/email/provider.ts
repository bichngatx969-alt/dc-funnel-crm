// Interface provider email — thiết kế để dễ đổi sang SendGrid/Brevo/Mailgun/SES/SMTP.

export type ProviderName = "RESEND" | "SMTP" | "GMAIL" | "OTHER";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type SendEmailResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface EmailProvider {
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
  getProviderName(): ProviderName;
}
