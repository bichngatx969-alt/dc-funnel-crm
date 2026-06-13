import type { Conversation, Customer, Stage, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { Vertical } from "@/lib/types";
import {
  sendTextMessage,
  sendQuickReplies,
  sendOfferMessage,
  sendTypingOn,
  type OfferLite,
} from "@/lib/facebook/send";
import { extractVietnamPhone } from "@/lib/funnel/phone";
import { normalizeText, containsAny } from "@/lib/funnel/text";
import { getFlowDef, type QR, type StepDef } from "@/lib/flows/defaults";
import { extractEmail } from "@/lib/funnel/email";
import { fireAutomationTriggers } from "@/lib/email/automation";

// ----------------------------------------------------------------
// Loại sự kiện inbound đưa vào engine
// ----------------------------------------------------------------
export type InboundEvent =
  | { kind: "text"; text: string }
  | { kind: "postback"; payload: string; text?: string }
  | { kind: "quick_reply"; payload: string; text?: string };

type OutboundMsg =
  | { kind: "text"; text: string }
  | { kind: "quickReplies"; text: string; replies: QR[] }
  | { kind: "offer"; offer: OfferLite };

type Plan = {
  scoreDelta: number;
  tags: string[];
  stage?: Stage;
  phone?: string;
  takeover: boolean;
  createTask?: { type: TaskType; title: string };
  outbound: OutboundMsg[];
  events: { name: string; value?: string; scoreDelta: number }[];
  email?: string;
  setEmailConsent?: boolean;
};

const LEAD_HOT_THRESHOLD = 8;
const LEAD_WARM_THRESHOLD = 4;
const MAX_OUTBOUND_PER_INBOUND = 2; // chống spam

// ----------------------------------------------------------------
// Entry point: chạy engine cho 1 inbound (chỉ gọi khi conversation = BOT_ACTIVE)
// ----------------------------------------------------------------
export async function runFunnelEngine(params: {
  customer: Customer;
  conversation: Conversation;
  inbound: InboundEvent;
  isFirstInbound: boolean;
}): Promise<void> {
  const vertical = env.defaultVertical;
  const stepMap = await loadActiveFlowSteps(vertical, params.conversation.pageId);
  const plan = await buildPlan({
    customer: params.customer,
    inbound: params.inbound,
    isFirstInbound: params.isFirstInbound,
    vertical,
    stepMap,
  });
  await applyPlan(params.customer, params.conversation, plan);
}

// ----------------------------------------------------------------
// Nạp các FlowStep: default (code) + override từ DB nếu có
// ----------------------------------------------------------------
async function loadActiveFlowSteps(vertical: Vertical, pageId?: string | null): Promise<Map<string, StepDef>> {
  const map = new Map<string, StepDef>();
  for (const s of getFlowDef(vertical).steps) map.set(s.key, s);

  try {
  const flowWhere =
    pageId
      ? {
          triggerValue: vertical,
          isActive: true,
          OR: [{ pageId }, { pageId: null }],
        }
      : { triggerValue: vertical, isActive: true, pageId: null };

  const flow = await prisma.flow.findFirst({
      where: flowWhere,
      orderBy: [{ pageId: "desc" }, { createdAt: "asc" }],
      include: { steps: true },
    });
    if (flow) {
      for (const s of flow.steps) {
        map.set(s.key, {
          key: s.key,
          messageText: s.messageText,
          quickReplies: (s.quickRepliesJson as QR[] | null) ?? undefined,
          scoreDelta: s.scoreDelta,
          tagsToAdd: s.tagsToAdd,
          stageToSet: s.stageToSet,
        });
      }
    }
  } catch (err) {
    console.error("[FUNNEL] Không nạp được flow từ DB, dùng default:", err);
  }
  return map;
}

// ----------------------------------------------------------------
// Xây dựng kế hoạch hành động (chưa ghi DB / chưa gửi tin)
// ----------------------------------------------------------------
async function buildPlan(args: {
  customer: Customer;
  inbound: InboundEvent;
  isFirstInbound: boolean;
  vertical: Vertical;
  stepMap: Map<string, StepDef>;
}): Promise<Plan> {
  const { customer, inbound, isFirstInbound, vertical, stepMap } = args;
  const plan: Plan = {
    scoreDelta: 0,
    tags: [],
    takeover: false,
    outbound: [],
    events: [],
  };

  const rawText = inbound.kind === "text" ? inbound.text : inbound.text ?? "";

  // 1) Số điện thoại VN -> ưu tiên cao nhất
  const phone = extractVietnamPhone(rawText);
  if (phone) {
    plan.phone = phone;
    plan.tags.push("co_sdt");
    plan.scoreDelta += 5;
    plan.stage = "HOT";
    plan.takeover = true;
    plan.createTask = {
      type: "FOLLOW_UP",
      title: `Liên hệ lại khách - SĐT ${phone}`,
    };
    plan.events.push({ name: "phone_captured", value: phone, scoreDelta: 5 });
    plan.outbound.push({
      kind: "text",
      text: "Dạ em nhận được số điện thoại của mình rồi ạ. Em sẽ liên hệ tư vấn và hỗ trợ chốt đơn giúp mình ngay nha. Cảm ơn anh/chị 💗",
    });
    return plan;
  }

  // 1b) Email -> lưu + hỏi consent (khi khách cung cấp email mới).
  // Luôn bắt email (kể cả khi chưa cấu hình Resend) để lưu dữ liệu; việc gửi/enroll mới cần key.
  {
    const email = extractEmail(rawText);
    if (email && customer.email !== email) {
      plan.email = email;
      plan.tags.push("co_email");
      plan.scoreDelta += 1;
      plan.events.push({ name: "email_captured", value: email, scoreDelta: 1 });
      plan.outbound.push({
        kind: "quickReplies",
        text: "Dạ em đã lưu email của anh/chị rồi ạ. Anh/chị có đồng ý nhận thông tin tư vấn/ưu đãi phù hợp qua email không ạ?",
        replies: [
          { title: "Đồng ý nhận email", payload: "EMAIL_CONSENT_YES" },
          { title: "Không cần", payload: "EMAIL_CONSENT_NO" },
        ],
      });
      return plan;
    }
  }

  // 2) Postback / quick reply có payload
  if ((inbound.kind === "postback" || inbound.kind === "quick_reply") && inbound.payload) {
    return buildPostbackPlan(plan, inbound.payload, customer, vertical, stepMap);
  }

  // 3) Tin nhắn đầu tiên -> welcome
  if (isFirstInbound) {
    const welcome = stepMap.get(getFlowDef(vertical).welcomeKey);
    if (welcome) {
      applyStepMeta(plan, welcome);
      pushStepOutbound(plan, welcome);
    }
    plan.events.push({ name: "welcome_sent", scoreDelta: 0 });
    return plan;
  }

  // 4) Rule keyword trên text
  const norm = normalizeText(rawText);
  let matched = false;

  if (containsAny(norm, ["gia", "bao nhieu", "price", "nhieu tien", "may tien"])) {
    plan.tags.push("hoi_gia");
    plan.scoreDelta += 2;
    plan.events.push({ name: "ask_price", scoreDelta: 2 });
    matched = true;
  }
  if (containsAny(norm, ["size", "cao", "nang", "kg", "chieu cao", "can nang"])) {
    plan.tags.push("hoi_size");
    plan.scoreDelta += 2;
    plan.events.push({ name: "ask_size", scoreDelta: 2 });
    matched = true;
  }
  if (containsAny(norm, ["ship", "giao", "freeship", "free ship", "van chuyen"])) {
    plan.tags.push("hoi_ship");
    plan.scoreDelta += 1;
    plan.events.push({ name: "ask_ship", scoreDelta: 1 });
    matched = true;
  }

  // Soạn câu trả lời theo tín hiệu (ưu tiên size > giá > ship)
  if (plan.tags.includes("hoi_size")) {
    const step = stepMap.get("NEED_SIZE");
    plan.outbound.push({
      kind: "text",
      text:
        step?.messageText ??
        "Anh/chị cho em xin chiều cao/cân nặng để em tư vấn size phù hợp nhất nha.",
    });
  } else if (plan.tags.includes("hoi_gia")) {
    const offer = await pickOffer(vertical, customer);
    if (offer) {
      plan.outbound.push({ kind: "text", text: "Dạ em gửi anh/chị giá & ưu đãi đang chạy ạ:" });
      plan.outbound.push({ kind: "offer", offer });
    } else {
      plan.outbound.push({
        kind: "text",
        text: "Dạ để em báo giá chính xác, anh/chị cho em xin mẫu/dịch vụ đang quan tâm nha.",
      });
    }
  } else if (plan.tags.includes("hoi_ship")) {
    plan.outbound.push({
      kind: "text",
      text: "Dạ bên em hỗ trợ giao toàn quốc, nhiều mẫu đang freeship ạ. Anh/chị ở khu vực nào để em báo phí ship chính xác nha.",
    });
  }

  // 5) Không hiểu -> fallback + hỏi lại nhu cầu
  if (!matched) {
    const welcome = stepMap.get(getFlowDef(vertical).welcomeKey);
    plan.outbound.push({
      kind: "quickReplies",
      text: "Dạ em chưa rõ ý mình lắm ạ. Anh/chị đang quan tâm sản phẩm/dịch vụ nào để em tư vấn kỹ hơn nha 💗",
      replies: welcome?.quickReplies ?? [],
    });
    plan.events.push({ name: "fallback", scoreDelta: 0 });
  }

  return plan;
}

async function buildPostbackPlan(
  plan: Plan,
  payload: string,
  customer: Customer,
  vertical: Vertical,
  stepMap: Map<string, StepDef>
): Promise<Plan> {
  // Nút "Bắt đầu" của Messenger
  if (payload === "GET_STARTED" || payload === "GET_STARTED_PAYLOAD") {
    const welcome = stepMap.get(getFlowDef(vertical).welcomeKey);
    if (welcome) {
      applyStepMeta(plan, welcome);
      pushStepOutbound(plan, welcome);
    }
    plan.events.push({ name: "get_started", scoreDelta: 0 });
    return plan;
  }

  // Email consent qua quick reply
  if (payload === "EMAIL_CONSENT_YES") {
    plan.setEmailConsent = true;
    plan.tags.push("email_consent");
    plan.scoreDelta += 1;
    plan.events.push({ name: "email_consent_yes", scoreDelta: 1 });
    plan.outbound.push({
      kind: "text",
      text: "Dạ cảm ơn anh/chị 💗 Em sẽ gửi thông tin hữu ích và ưu đãi phù hợp qua email ạ.",
    });
    return plan;
  }
  if (payload === "EMAIL_CONSENT_NO") {
    plan.setEmailConsent = false;
    plan.events.push({ name: "email_consent_no", scoreDelta: 0 });
    plan.outbound.push({
      kind: "text",
      text: "Dạ vâng, em sẽ hỗ trợ anh/chị qua đây ạ. Cần gì anh/chị cứ nhắn em nha.",
    });
    return plan;
  }

  const step = stepMap.get(payload);
  if (!step) {
    const welcome = stepMap.get(getFlowDef(vertical).welcomeKey);
    plan.outbound.push({
      kind: "quickReplies",
      text: "Dạ anh/chị chọn giúp em mục bên dưới để em tư vấn nha 💗",
      replies: welcome?.quickReplies ?? [],
    });
    return plan;
  }

  applyStepMeta(plan, step);
  plan.events.push({ name: "postback", value: payload, scoreDelta: step.scoreDelta ?? 0 });

  // NEED_COMBO -> kèm gợi ý offer
  if (payload === "NEED_COMBO") {
    plan.outbound.push({ kind: "text", text: step.messageText });
    const offer = await pickOffer(vertical, customer);
    if (offer) plan.outbound.push({ kind: "offer", offer });
  } else {
    pushStepOutbound(plan, step);
  }
  return plan;
}

function applyStepMeta(plan: Plan, step: StepDef): void {
  if (step.tagsToAdd?.length) plan.tags.push(...step.tagsToAdd);
  if (step.scoreDelta) plan.scoreDelta += step.scoreDelta;
  if (step.stageToSet) plan.stage = step.stageToSet;
}

function pushStepOutbound(plan: Plan, step: StepDef): void {
  if (step.quickReplies?.length) {
    plan.outbound.push({
      kind: "quickReplies",
      text: step.messageText,
      replies: step.quickReplies,
    });
  } else {
    plan.outbound.push({ kind: "text", text: step.messageText });
  }
}

// ----------------------------------------------------------------
// Ghi DB + gửi tin nhắn
// ----------------------------------------------------------------
async function applyPlan(
  customer: Customer,
  conversation: Conversation,
  plan: Plan
): Promise<void> {
  const newScore = Math.max(0, customer.leadScore + plan.scoreDelta);
  const mergedTags = Array.from(new Set([...customer.tags, ...plan.tags]));

  // Tính stage mới (không hạ cấp khách)
  let newStage: Stage = customer.currentStage;
  if (plan.stage) {
    newStage = plan.stage;
  } else if (
    newScore >= LEAD_HOT_THRESHOLD &&
    (customer.currentStage === "COLD" || customer.currentStage === "WARM")
  ) {
    newStage = "HOT";
  } else if (newScore >= LEAD_WARM_THRESHOLD && customer.currentStage === "COLD") {
    newStage = "WARM";
  }

  const shouldTakeover = plan.takeover || newScore >= LEAD_HOT_THRESHOLD;
  let newStatus = conversation.status;
  let justTookOver = false;
  if (shouldTakeover && conversation.status === "BOT_ACTIVE") {
    newStatus = "HUMAN_TAKEOVER";
    justTookOver = true;
  }

  // Cập nhật khách
  const customerData: any = {
    leadScore: newScore,
    tags: mergedTags,
    currentStage: newStage,
    phone: plan.phone ?? customer.phone ?? undefined,
    lastInteractionAt: new Date(),
  };
  if (plan.email) customerData.email = plan.email;
  if (plan.setEmailConsent === true) {
    customerData.emailConsent = true;
    customerData.emailStatus = "SUBSCRIBED";
    customerData.unsubscribedAt = null;
  } else if (plan.setEmailConsent === false) {
    customerData.emailConsent = false;
  }
  await prisma.customer.update({ where: { id: customer.id }, data: customerData });

  // Ghi funnel events
  if (plan.events.length) {
    await prisma.funnelEvent.createMany({
      data: plan.events.map((e) => ({
        customerId: customer.id,
        pageId: conversation.pageId,
        eventName: e.name,
        eventValue: e.value ?? null,
        scoreDelta: e.scoreDelta,
      })),
    });
  }

  // Tạo task cho sale khi cần
  if (plan.createTask || justTookOver) {
    const t =
      plan.createTask ??
      ({
        type: "FOLLOW_UP" as TaskType,
        title: `Khách HOT cần sale tiếp quản (lead score ${newScore})`,
      } as { type: TaskType; title: string });
    await prisma.task.create({
      data: {
        customerId: customer.id,
        type: t.type,
        title: t.title,
        status: "TODO",
        assignedToId: conversation.assignedToId ?? undefined,
      },
    });
  }

  // Cập nhật conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: newStatus, lastMessageAt: new Date() },
  });

  // Email automation triggers (tag mới / chuyển HOT / vừa đồng ý nhận email)
  const newTags = plan.tags.filter((t) => !customer.tags.includes(t));
  const stageChangedTo =
    newStage !== customer.currentStage && newStage === "HOT" ? "HOT" : null;
  await fireAutomationTriggers(customer.id, {
    newTags,
    stageChangedTo,
    consentGranted: plan.setEmailConsent === true,
  });

  // Soạn danh sách tin gửi, chèn thông báo handover nếu vừa bàn giao
  const outbound = [...plan.outbound];
  if (justTookOver && !plan.phone) {
    outbound.push({
      kind: "text",
      text: "Dạ em chuyển anh/chị qua nhân viên tư vấn để hỗ trợ kỹ hơn nha. Anh/chị chờ chút xíu ạ 💗",
    });
  }

  // Gửi tối đa MAX_OUTBOUND_PER_INBOUND tin để không spam
  await deliver(customer.psid, conversation.id, outbound.slice(0, MAX_OUTBOUND_PER_INBOUND));
}

async function deliver(
  psid: string,
  conversationId: string,
  messages: OutboundMsg[]
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      pageId: true,
      facebookPage: { select: { pageAccessTokenEncrypted: true } },
    },
  });
  const pageId = conversation?.pageId ?? null;
  const pageAccessToken = conversation?.facebookPage?.pageAccessTokenEncrypted ?? null;

  for (const m of messages) {
    let result: { ok: boolean; messageId?: string; error?: unknown };
    let text = "";
    const meta: Record<string, unknown> = {};

    if (m.kind === "text") {
      await sendTypingOn(psid, pageAccessToken);
      result = await sendTextMessage(psid, m.text, pageAccessToken);
      text = m.text;
    } else if (m.kind === "quickReplies") {
      await sendTypingOn(psid, pageAccessToken);
      result = await sendQuickReplies(psid, m.text, m.replies, pageAccessToken);
      text = m.text;
      meta.quick_replies = m.replies;
    } else {
      result = await sendOfferMessage(psid, m.offer, pageAccessToken);
      text = [m.offer.title, m.offer.offerText, m.offer.priceText]
        .filter(Boolean)
        .join("\n");
      meta.offer = m.offer;
    }

    if (!result.ok) meta.error = result.error;

    await prisma.message.create({
      data: {
        conversationId,
        pageId,
        direction: "OUTBOUND",
        senderType: "BOT",
        text,
        payloadJson: Object.keys(meta).length ? (meta as object) : undefined,
        metaMessageId: result.messageId ?? null,
      },
    });
  }
}

// ----------------------------------------------------------------
// Chọn offer phù hợp
// ----------------------------------------------------------------
async function pickOffer(vertical: Vertical, customer: Customer): Promise<OfferLite | null> {
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      OR: [{ pageId: customer.pageId }, { pageId: null }],
    },
    orderBy: { priority: "desc" },
  });
  if (!offers.length) return null;

  const pageSpecific = offers.filter((o) => o.pageId === customer.pageId);
  const pool = pageSpecific.length ? pageSpecific : offers;

  const byTag = pool.find((o) => o.triggerTag && customer.tags.includes(o.triggerTag));
  if (byTag) return toLite(byTag);

  const byStage = pool.find((o) => o.customerStage && o.customerStage === customer.currentStage);
  if (byStage) return toLite(byStage);

  return toLite(pool[0]);
}

function toLite(o: { title: string; offerText: string; priceText: string | null }): OfferLite {
  return { title: o.title, offerText: o.offerText, priceText: o.priceText };
}
