import { prisma } from "@/lib/prisma";
import {
  extractContactSignals,
  maskEmail,
  maskPhone,
} from "@/lib/contact/extract-contact-signals";

export type ContactSignalSource = "messenger" | "facebook_comment" | "manual";

export type UpdateContactSignalsResult = {
  updatedPhone?: string;
  updatedEmail?: string;
};

// Tự cập nhật phone/email cho Customer từ nội dung tin nhắn/comment.
// Quy tắc: CHỈ điền khi field đang trống, KHÔNG ghi đè dữ liệu đã có.
// Không bao giờ throw để tránh phá webhook/inbox.
export async function updateCustomerContactSignals(params: {
  customerId: string;
  workspaceId: string | null | undefined;
  text: string | null | undefined;
  source: ContactSignalSource;
}): Promise<UpdateContactSignalsResult> {
  const { customerId, workspaceId, text, source } = params;
  try {
    if (!text || !text.trim()) return {};
    const { phones, emails } = extractContactSignals(text);
    if (phones.length === 0 && emails.length === 0) return {};

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, ...(workspaceId ? { workspaceId } : {}) },
      select: { id: true, phone: true, email: true },
    });
    if (!customer) return {};

    const data: { phone?: string; email?: string; lastActivityAt?: Date } = {};
    if (!customer.phone && phones[0]) data.phone = phones[0];
    if (!customer.email && emails[0]) data.email = emails[0];
    if (!data.phone && !data.email) return {};

    data.lastActivityAt = new Date();
    await prisma.customer.update({ where: { id: customer.id }, data });

    const parts: string[] = [];
    if (data.phone) parts.push(`phone=${maskPhone(data.phone)}`);
    if (data.email) parts.push(`email=${maskEmail(data.email)}`);
    console.log(`[contact-signals] source=${source} customer=${customer.id} cập nhật ${parts.join(" ")}`);

    return { updatedPhone: data.phone, updatedEmail: data.email };
  } catch (err) {
    console.error(
      "[contact-signals] lỗi cập nhật:",
      err instanceof Error ? err.message : String(err)
    );
    return {};
  }
}
