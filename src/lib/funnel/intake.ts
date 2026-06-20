import type { Conversation, Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchUserProfile } from "@/lib/facebook/send";
import { runFunnelEngine, type InboundEvent } from "@/lib/funnel/engine";
import { updateCustomerContactSignals } from "@/lib/contact/update-contact-signals";

// Một messaging event thô từ Meta (không type chặt để linh hoạt).
type RawMessaging = any;
type Referral = {
  source?: string;
  type?: string;
  ad_id?: string;
  ref?: string;
  ref_post_id?: string;
} | null;

// ----------------------------------------------------------------
// Xử lý 1 messaging event: lưu khách/hội thoại/tin nhắn, chống trùng,
// rồi chạy funnel engine (trừ khi sale đang tiếp quản).
// ----------------------------------------------------------------
export async function handleMessagingEvent(event: RawMessaging): Promise<void> {
  const psid: string | undefined = event?.sender?.id;
  if (!psid) return;
  const pageId: string | undefined = event?.recipient?.id;

  // Bỏ qua echo (tin do chính Page gửi ra).
  if (event.message?.is_echo) return;

  // Xác định loại inbound, dedupe id, text hiển thị.
  let inbound: InboundEvent | null = null;
  let dedupeId: string | null = null;
  let inboundText: string | null = null;

  if (event.message) {
    dedupeId = event.message.mid ?? null;
    if (event.message.quick_reply?.payload) {
      inbound = {
        kind: "quick_reply",
        payload: event.message.quick_reply.payload,
        text: event.message.text,
      };
      inboundText = event.message.text ?? event.message.quick_reply.payload;
    } else if (typeof event.message.text === "string") {
      inbound = { kind: "text", text: event.message.text };
      inboundText = event.message.text;
    } else {
      // Chỉ có attachment (ảnh/sticker...) -> coi như text rỗng để bot hỏi lại.
      inbound = { kind: "text", text: "" };
      inboundText = "[đính kèm]";
    }
  } else if (event.postback) {
    const ts = event.timestamp ?? Date.now();
    dedupeId = `pb_${psid}_${ts}_${event.postback.payload ?? ""}`.slice(0, 180);
    inbound = {
      kind: "postback",
      payload: event.postback.payload ?? "",
      text: event.postback.title,
    };
    inboundText = event.postback.title ?? event.postback.payload ?? null;
  } else {
    // delivery / read / optin... -> bỏ qua.
    return;
  }

  // Chống xử lý trùng (Meta có thể gửi lặp event).
  if (dedupeId) {
    const existing = await prisma.message.findUnique({ where: { metaMessageId: dedupeId } });
    if (existing) {
      console.log("[WEBHOOK] Bỏ qua message trùng:", dedupeId);
      return;
    }
  }

  const referral: Referral =
    event.referral ?? event.message?.referral ?? event.postback?.referral ?? null;

  const page = pageId ? await findOrCreateFacebookPage(pageId) : null;
  const workspaceId = page?.workspaceId ?? null;

  const customer = await findOrCreateCustomer(
    psid,
    pageId ?? null,
    workspaceId,
    referral,
    page?.pageAccessTokenEncrypted ?? null
  );
  const conversation = await findOrCreateOpenConversation(customer.id, pageId ?? null, customer.workspaceId);

  // Lưu inbound message + raw payload.
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      workspaceId: customer.workspaceId,
      pageId: pageId ?? null,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      text: inboundText,
      payloadJson: event as object,
      metaMessageId: dedupeId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastInteractionAt: new Date(), lastActivityAt: new Date() },
  });

  // Tự nhận diện & điền SĐT/email từ nội dung khách nhắn (chỉ điền field trống).
  await updateCustomerContactSignals({
    customerId: customer.id,
    workspaceId: customer.workspaceId,
    text: inboundText,
    source: "messenger",
  });

  const inboundCount = await prisma.message.count({
    where: { conversationId: conversation.id, direction: "INBOUND" },
  });
  const isFirstInbound = inboundCount === 1;

  // Sale đang tiếp quản -> bot im lặng, chỉ ghi nhận sự kiện.
  if (conversation.status === "HUMAN_TAKEOVER") {
    await prisma.funnelEvent.create({
      data: { customerId: customer.id, pageId: pageId ?? null, eventName: "inbound_during_takeover", scoreDelta: 0 },
    });
    return;
  }

  if (page && !page.botEnabled) {
    await prisma.funnelEvent.create({
      data: { customerId: customer.id, pageId: pageId ?? null, eventName: "inbound_bot_disabled", scoreDelta: 0 },
    });
    return;
  }

  await runFunnelEngine({ customer, conversation, inbound, isFirstInbound });
}

async function findOrCreateCustomer(
  psid: string,
  pageId: string | null,
  workspaceId: string | null,
  referral: Referral,
  pageAccessToken: string | null
): Promise<Customer> {
  const existing = await prisma.customer.findFirst({ where: { psid, pageId } });
  if (existing?.workspaceId === null && workspaceId) {
    return prisma.customer.update({ where: { id: existing.id }, data: { workspaceId } });
  }
  if (existing) return existing;

  const profile = await fetchUserProfile(psid, pageAccessToken).catch(() => null);
  try {
    return await prisma.customer.create({
      data: {
        workspaceId,
        pageId,
        psid,
        name: profile?.name ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        source: referral?.source ?? (referral ? "ad" : null),
        firstCampaign: referral?.ad_id ?? referral?.ref ?? null,
        firstPostId: referral?.ref_post_id ?? null,
      },
    });
  } catch {
    // Có thể bị tạo trùng do race condition -> lấy lại.
    const again = await prisma.customer.findFirst({ where: { psid, pageId } });
    if (again) return again;
    throw new Error("Không tạo được customer cho psid " + psid);
  }
}

async function findOrCreateOpenConversation(
  customerId: string,
  pageId: string | null,
  workspaceId: string | null
): Promise<Conversation> {
  const open = await prisma.conversation.findFirst({
    where: { customerId, pageId, status: { in: ["BOT_ACTIVE", "HUMAN_TAKEOVER"] } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (open?.workspaceId === null && workspaceId) {
    return prisma.conversation.update({ where: { id: open.id }, data: { workspaceId } });
  }
  if (open) return open;
  return prisma.conversation.create({ data: { workspaceId, customerId, pageId, status: "BOT_ACTIVE" } });
}

async function findOrCreateFacebookPage(pageId: string) {
  return prisma.facebookPage.upsert({
    where: { pageId },
    update: {},
    create: {
      pageId,
      pageName: `Fanpage ${pageId}`,
      pageAccessTokenEncrypted: null,
      botEnabled: false,
      status: "CONNECTED",
    },
  });
}
