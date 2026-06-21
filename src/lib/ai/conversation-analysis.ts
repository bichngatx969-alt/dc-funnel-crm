import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractContactSignals } from "@/lib/contact/extract-contact-signals";
import { getAIProviderStatus, generateStructuredAIResponse } from "@/lib/ai/provider";

type InsightDraft = {
  buyingIntent: string | null;
  funnelStage: string | null;
  communicationStyle: string | null;
  sentiment: string | null;
  customerSegment: string | null;
  mainNeed: string | null;
  objections: string[];
  productsInterested: string[];
  missingData: string[];
  nextBestAction: string | null;
  recommendedOffer: string | null;
  suggestedReply: string | null;
  confidence: number | null;
  raw: Record<string, unknown>;
};

type AnalyzeResult = {
  aiConfigured: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  insight: Awaited<ReturnType<typeof prisma.aIConversationInsight.create>>;
  run: Awaited<ReturnType<typeof prisma.aIAnalysisRun.create>>;
  error?: string;
};

const SYSTEM_PROMPT = `Bạn là AI Growth Copilot cho CRM bán hàng qua Facebook.
Phân tích hội thoại để hỗ trợ sale ra quyết định. Chỉ suy luận từ tín hiệu hội thoại và hành vi, không phán xét con người.
Không tự động gửi tin, không chốt đơn thay sale. Trả về JSON hợp lệ, ngắn gọn, tiếng Việt.`;

export async function analyzeConversationForSales(params: {
  workspaceId: string;
  conversationId: string;
}): Promise<AnalyzeResult | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.conversationId, workspaceId: params.workspaceId },
    include: {
      customer: true,
      facebookPage: { select: { pageId: true, pageName: true } },
    },
  });
  if (!conversation) return null;

  const [messagesDesc, opportunities, orders, offers] = await Promise.all([
    prisma.message.findMany({
      where: { workspaceId: params.workspaceId, conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        direction: true,
        senderType: true,
        text: true,
        createdAt: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId: params.workspaceId, customerId: conversation.customerId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { stage: { select: { name: true } }, pipeline: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { workspaceId: params.workspaceId, customerId: conversation.customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { select: { name: true, quantity: true, lineTotalVnd: true } } },
    }),
    prisma.offer.findMany({
      where: {
        workspaceId: params.workspaceId,
        isActive: true,
        OR: [
          { pageId: conversation.pageId },
          { pageId: null },
          { customerStage: conversation.customer.currentStage },
          { triggerTag: { in: conversation.customer.tags } },
        ],
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 8,
    }),
  ]);

  const messages = messagesDesc.reverse();
  const inputHash = hashInput(
    JSON.stringify({
      conversationId: conversation.id,
      customerId: conversation.customerId,
      messages: messages.map((m) => [m.id, m.text, m.createdAt.toISOString()]),
      stage: conversation.customer.currentStage,
      tags: conversation.customer.tags,
    })
  );

  let draft: InsightDraft;
  let status: AnalyzeResult["status"] = "SUCCESS";
  let error: string | undefined;
  let modelName = "rule-based-fallback";
  const providerStatus = getAIProviderStatus();
  const aiConfigured = providerStatus.configured;

  if (aiConfigured) {
    try {
      draft = normalizeDraft(
        await analyzeWithOpenAI({
          conversation,
          messages,
          opportunities,
          orders,
          offers,
        })
      );
      modelName = providerStatus.model ?? "ai";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      status = "FAILED";
      draft = buildRuleBasedInsight({ conversation, messages, opportunities, orders, offers, error });
    }
  } else {
    status = "SKIPPED";
    error = "AI_NOT_CONFIGURED";
    draft = buildRuleBasedInsight({ conversation, messages, opportunities, orders, offers });
  }

  const insight = await prisma.aIConversationInsight.create({
    data: {
      workspaceId: params.workspaceId,
      customerId: conversation.customerId,
      conversationId: conversation.id,
      buyingIntent: draft.buyingIntent,
      funnelStage: draft.funnelStage,
      communicationStyle: draft.communicationStyle,
      sentiment: draft.sentiment,
      customerSegment: draft.customerSegment,
      mainNeed: draft.mainNeed,
      objectionsJson: draft.objections as Prisma.InputJsonValue,
      productsInterestedJson: draft.productsInterested as Prisma.InputJsonValue,
      missingDataJson: draft.missingData as Prisma.InputJsonValue,
      nextBestAction: draft.nextBestAction,
      recommendedOffer: draft.recommendedOffer,
      suggestedReply: draft.suggestedReply,
      confidence: draft.confidence,
      rawJson: {
        ...draft.raw,
        aiConfigured,
        fallback: modelName === "rule-based-fallback",
      } as Prisma.InputJsonValue,
      modelName,
    },
  });

  const run = await prisma.aIAnalysisRun.create({
    data: {
      workspaceId: params.workspaceId,
      sourceType: "CONVERSATION",
      sourceId: conversation.id,
      status,
      inputHash,
      outputJson: { insightId: insight.id, aiConfigured, modelName } as Prisma.InputJsonValue,
      error,
    },
  });

  return { aiConfigured, status, insight, run, error };
}

async function analyzeWithOpenAI(input: {
  conversation: Prisma.ConversationGetPayload<{ include: { customer: true; facebookPage: { select: { pageId: true; pageName: true } } } }>;
  messages: Array<{ direction: string; senderType: string; text: string | null; createdAt: Date }>;
  opportunities: Array<any>;
  orders: Array<any>;
  offers: Array<any>;
}) {
  return generateStructuredAIResponse({
    task: "conversation-insight",
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input),
    temperature: 0.2,
    maxTokens: 900,
  });
}

function buildPrompt(input: Parameters<typeof analyzeWithOpenAI>[0]): string {
  const customer = input.conversation.customer;
  const history = input.messages
    .map((m) => `${m.direction === "INBOUND" ? "Khách" : m.senderType === "HUMAN" ? "Sale" : "Bot"}: ${m.text ?? ""}`)
    .join("\n");
  const offers = input.offers
    .map((o) => `- ${o.title}: ${o.offerText}${o.priceText ? ` (${o.priceText})` : ""}`)
    .join("\n");

  return `Hãy phân tích hội thoại và trả JSON đúng schema:
{
  "buyingIntent": "Lạnh|Ấm|Nóng|Sẵn sàng chốt",
  "funnelStage": "Awareness|Consideration|Decision|Retention",
  "communicationStyle": "D|I|S|C|chưa rõ",
  "sentiment": "tích cực|trung tính|lo ngại|khó chịu",
  "customerSegment": "mô tả ngắn",
  "mainNeed": "nhu cầu chính",
  "objections": ["..."],
  "productsInterested": ["..."],
  "missingData": ["..."],
  "nextBestAction": "việc sale nên làm tiếp",
  "recommendedOffer": "offer phù hợp hoặc null",
  "suggestedReply": "câu trả lời gợi ý, tối đa 3 câu",
  "confidence": 0.0
}

Thông tin khách:
- Tên: ${customer.name ?? "chưa rõ"}
- Stage CRM: ${customer.currentStage}
- Lead score: ${customer.leadScore}
- Tags: ${customer.tags.join(", ") || "(chưa có)"}
- Đã có phone/email: ${customer.phone ? "phone" : "thiếu phone"} / ${customer.email ? "email" : "thiếu email"}

Fanpage: ${input.conversation.facebookPage?.pageName ?? input.conversation.pageId ?? "chưa rõ"}

Cơ hội gần đây:
${input.opportunities.map((o) => `- ${o.title} / ${o.status} / ${o.stage?.name ?? ""} / ${o.valueVnd} VND`).join("\n") || "(chưa có)"}

Đơn gần đây:
${input.orders.map((o) => `- ${o.code} / ${o.status} / ${o.totalVnd} VND`).join("\n") || "(chưa có)"}

Offer có thể dùng:
${offers || "(chưa có)"}

Hội thoại:
${history || "(chưa có tin nhắn)"}`;
}

function buildRuleBasedInsight(input: {
  conversation: Prisma.ConversationGetPayload<{ include: { customer: true; facebookPage: { select: { pageId: true; pageName: true } } } }>;
  messages: Array<{ direction: string; senderType: string; text: string | null }>;
  opportunities: Array<any>;
  orders: Array<any>;
  offers: Array<any>;
  error?: string;
}): InsightDraft {
  const inboundTexts = input.messages
    .filter((m) => m.direction === "INBOUND")
    .map((m) => m.text ?? "")
    .filter(Boolean);
  const allText = inboundTexts.join("\n").toLowerCase();
  const lastInbound = inboundTexts[inboundTexts.length - 1] ?? "";
  const signals = extractContactSignals(inboundTexts.join("\n"));
  const objections = detectObjections(allText);
  const productsInterested = detectProductInterest(allText, input.offers, input.orders);
  const missingData = [
    !input.conversation.customer.phone && signals.phones.length === 0 ? "SĐT" : null,
    !input.conversation.customer.email && signals.emails.length === 0 ? "Email" : null,
    hasAny(allText, ["size", "kích cỡ", "cao", "nặng"]) ? null : "Thông tin size/nhu cầu cụ thể",
  ].filter(Boolean) as string[];
  const readyToClose = hasAny(allText, ["chốt", "đặt", "mua", "lấy", "ship", "địa chỉ", "sđt", "số điện thoại"]);
  const asksPrice = hasAny(allText, ["giá", "bao nhiêu", "nhiêu", "tiền", "combo"]);
  const asksProduct = hasAny(allText, ["mẫu", "size", "màu", "áo", "váy", "quần", "ảnh thật"]);
  const buyingIntent = readyToClose ? "Sẵn sàng chốt" : asksPrice ? "Nóng" : asksProduct ? "Ấm" : "Lạnh";
  const funnelStage = readyToClose ? "Decision" : asksPrice || asksProduct ? "Consideration" : "Awareness";
  const recommendedOffer = input.offers[0]?.title ?? null;

  return {
    buyingIntent,
    funnelStage,
    communicationStyle: inferCommunicationStyle(allText),
    sentiment: inferSentiment(allText),
    customerSegment: input.conversation.customer.tags[0] ?? input.conversation.customer.source ?? "Khách từ Facebook",
    mainNeed: inferMainNeed(allText),
    objections,
    productsInterested,
    missingData,
    nextBestAction: readyToClose
      ? "Xác nhận mẫu/size/thông tin giao hàng và tạo đơn nháp."
      : asksPrice
        ? "Gửi giá rõ ràng kèm lợi ích, chính sách và một câu hỏi chốt bước tiếp theo."
        : "Hỏi thêm nhu cầu chính để tư vấn đúng sản phẩm.",
    recommendedOffer,
    suggestedReply: buildSuggestedReply({ lastInbound, readyToClose, asksPrice, recommendedOffer }),
    confidence: 0.45,
    raw: {
      source: "rule-based",
      reason: input.error ? "openai_failed_fallback" : "openai_not_configured_or_rule_based",
      signals: {
        hasPhone: signals.phones.length > 0,
        hasEmail: signals.emails.length > 0,
        messageCount: input.messages.length,
      },
      error: input.error,
    },
  };
}

function normalizeDraft(raw: Record<string, unknown>): InsightDraft {
  return {
    buyingIntent: asText(raw.buyingIntent),
    funnelStage: asText(raw.funnelStage),
    communicationStyle: asText(raw.communicationStyle),
    sentiment: asText(raw.sentiment),
    customerSegment: asText(raw.customerSegment),
    mainNeed: asText(raw.mainNeed),
    objections: asTextArray(raw.objections),
    productsInterested: asTextArray(raw.productsInterested),
    missingData: asTextArray(raw.missingData),
    nextBestAction: asText(raw.nextBestAction),
    recommendedOffer: asText(raw.recommendedOffer),
    suggestedReply: asText(raw.suggestedReply),
    confidence: clampConfidence(raw.confidence),
    raw,
  };
}

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "null") return null;
  return text.slice(0, 2000);
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean) as string[];
}

function clampConfidence(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number));
}

function detectObjections(text: string): string[] {
  const items: string[] = [];
  if (hasAny(text, ["đắt", "mắc", "rẻ hơn", "giảm giá"])) items.push("Giá");
  if (hasAny(text, ["thật không", "uy tín", "lừa", "ảnh thật", "feedback"])) items.push("Niềm tin");
  if (hasAny(text, ["để xem", "suy nghĩ", "mai", "hôm khác"])) items.push("Thời điểm");
  if (hasAny(text, ["không hợp", "không biết", "phân vân"])) items.push("Nhu cầu chưa rõ");
  return items;
}

function detectProductInterest(text: string, offers: Array<any>, orders: Array<any>): string[] {
  const names = new Set<string>();
  for (const offer of offers) {
    const product = String(offer.product ?? "").trim();
    if (product && text.includes(product.toLowerCase())) names.add(product);
  }
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const name = String(item.name ?? "").trim();
      if (name && text.includes(name.toLowerCase())) names.add(name);
    }
  }
  if (names.size === 0) {
    if (hasAny(text, ["áo", "baby tee", "tee"])) names.add("Áo");
    if (hasAny(text, ["váy", "đầm"])) names.add("Váy/đầm");
    if (hasAny(text, ["combo", "set"])) names.add("Combo/set");
  }
  return Array.from(names).slice(0, 5);
}

function inferCommunicationStyle(text: string): string {
  if (hasAny(text, ["nhanh", "chốt", "gửi luôn", "lấy"])) return "D";
  if (hasAny(text, ["xinh", "thích", "ưng", "haha", "hihi"])) return "I";
  if (hasAny(text, ["tư vấn", "phân vân", "không biết", "hợp không"])) return "S";
  if (hasAny(text, ["chất liệu", "size", "số đo", "chi tiết", "bảng size"])) return "C";
  return "chưa rõ";
}

function inferSentiment(text: string): string {
  if (hasAny(text, ["bực", "khó chịu", "lâu", "không được", "tệ"])) return "khó chịu";
  if (hasAny(text, ["đắt", "mắc", "phân vân", "sợ", "lo"])) return "lo ngại";
  if (hasAny(text, ["ok", "thích", "ưng", "đẹp", "cảm ơn"])) return "tích cực";
  return "trung tính";
}

function inferMainNeed(text: string): string {
  if (hasAny(text, ["giá", "bao nhiêu", "combo"])) return "Cần biết giá/ưu đãi rõ ràng";
  if (hasAny(text, ["size", "cao", "nặng", "vừa"])) return "Cần tư vấn size/phù hợp";
  if (hasAny(text, ["ảnh thật", "feedback", "chất liệu"])) return "Cần thêm bằng chứng tin cậy";
  if (hasAny(text, ["ship", "giao", "địa chỉ"])) return "Cần thông tin giao hàng/chốt đơn";
  return "Cần được tư vấn thêm để chọn đúng sản phẩm";
}

function buildSuggestedReply(input: {
  lastInbound: string;
  readyToClose: boolean;
  asksPrice: boolean;
  recommendedOffer: string | null;
}): string {
  if (input.readyToClose) {
    return "Dạ em xác nhận lại giúp chị mẫu/size và địa chỉ nhận hàng nhé. Em có thể lên đơn nháp để chị kiểm tra trước khi chốt ạ.";
  }
  if (input.asksPrice) {
    return `Dạ em gửi chị giá và ưu đãi hiện tại nhé${input.recommendedOffer ? `: ${input.recommendedOffer}` : ""}. Chị muốn em tư vấn theo size hay xem combo tiết kiệm hơn ạ?`;
  }
  return "Dạ em tư vấn kỹ hơn cho chị nhé. Chị đang quan tâm mẫu nào hoặc muốn em gợi ý theo nhu cầu/sở thích của mình ạ?";
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function hashInput(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
