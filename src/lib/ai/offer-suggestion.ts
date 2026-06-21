import { prisma } from "@/lib/prisma";
import { getAIProviderStatus, generateStructuredAIResponse } from "@/lib/ai/provider";

export type OfferSuggestionPayload = {
  offerId: string | null;
  offerTitle: string | null;
  productId: string | null;
  productName: string | null;
  reason: string;
  suggestedReply: string;
  nextActions: string[];
  alternatives: Array<{
    offerId: string | null;
    offerTitle: string | null;
    productId: string | null;
    productName: string | null;
    reason: string;
  }>;
  confidence: number;
};

type OfferCandidate = {
  id: string;
  product: string;
  title: string;
  offerText: string;
  priceText: string | null;
  priority: number;
  score: number;
};

type ProductCandidate = {
  id: string;
  name: string;
  priceVnd: number;
  description: string | null;
  score: number;
};

type SuggestionResult = {
  aiConfigured: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  suggestion: OfferSuggestionPayload;
  error?: string;
};

const SYSTEM_PROMPT = `Bạn là AI Offer Engine cho CRM bán hàng qua inbox.
Chọn offer/sản phẩm phù hợp nhất từ dữ liệu được cung cấp. Không tự gửi tin, không hứa chính sách ngoài dữ liệu.
Trả JSON hợp lệ, ngắn gọn, tiếng Việt.`;

export async function suggestOfferForConversation(params: {
  workspaceId: string;
  conversationId: string;
}): Promise<SuggestionResult | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.conversationId, workspaceId: params.workspaceId },
    include: {
      customer: true,
      facebookPage: { select: { pageId: true, pageName: true } },
    },
  });
  if (!conversation) return null;

  const [messagesDesc, offers, products, orders] = await Promise.all([
    prisma.message.findMany({
      where: { workspaceId: params.workspaceId, conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { direction: true, senderType: true, text: true, createdAt: true },
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
      take: 12,
    }),
    prisma.productLite.findMany({
      where: { workspaceId: params.workspaceId, isActive: true, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    }),
    prisma.order.findMany({
      where: { workspaceId: params.workspaceId, customerId: conversation.customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { select: { name: true, quantity: true, lineTotalVnd: true } } },
    }),
  ]);

  const messages = messagesDesc.reverse();
  const conversationText = messages.map((message) => message.text ?? "").join("\n").toLowerCase();
  const offerCandidates = rankOffers(offers, conversationText, conversation.customer.tags);
  const productCandidates = rankProducts(products, conversationText);

  let suggestion: OfferSuggestionPayload;
  let status: SuggestionResult["status"] = "SUCCESS";
  let error: string | undefined;
  const aiConfigured = getAIProviderStatus().configured;

  if (aiConfigured) {
    try {
      suggestion = normalizeSuggestion(
        await suggestWithOpenAI({
          customer: {
            name: conversation.customer.name,
            currentStage: conversation.customer.currentStage,
            leadScore: conversation.customer.leadScore,
            tags: conversation.customer.tags,
          },
          pageName: conversation.facebookPage?.pageName ?? null,
          messages,
          offers: offerCandidates,
          products: productCandidates,
          orders,
        }),
        offerCandidates,
        productCandidates
      );
    } catch (err) {
      status = "FAILED";
      error = err instanceof Error ? err.message : String(err);
      suggestion = buildRuleBasedSuggestion(offerCandidates, productCandidates, conversationText);
    }
  } else {
    status = "SKIPPED";
    error = "AI_NOT_CONFIGURED";
    suggestion = buildRuleBasedSuggestion(offerCandidates, productCandidates, conversationText);
  }

  return { aiConfigured, status, suggestion, error };
}

async function suggestWithOpenAI(input: {
  customer: {
    name: string | null;
    currentStage: string;
    leadScore: number;
    tags: string[];
  };
  pageName: string | null;
  messages: Array<{ direction: string; senderType: string; text: string | null; createdAt: Date }>;
  offers: OfferCandidate[];
  products: ProductCandidate[];
  orders: Array<{ code: string; status: string; totalVnd: number; items: Array<{ name: string; quantity: number; lineTotalVnd: number }> }>;
}) {
  return generateStructuredAIResponse({
    task: "offer-suggestion",
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(input),
    temperature: 0.2,
    maxTokens: 800,
  });
}

function buildPrompt(input: Parameters<typeof suggestWithOpenAI>[0]): string {
  const history = input.messages
    .map((message) => {
      const actor = message.direction === "INBOUND" ? "Khách" : message.senderType === "HUMAN" ? "Sale" : "Bot";
      return `${actor}: ${message.text ?? ""}`;
    })
    .join("\n");
  const offers = input.offers
    .map((offer) => `- id=${offer.id}; title=${offer.title}; product=${offer.product}; price=${offer.priceText ?? "n/a"}; offer=${offer.offerText}`)
    .join("\n");
  const products = input.products
    .map((product) => `- id=${product.id}; name=${product.name}; priceVnd=${product.priceVnd}; description=${product.description ?? "n/a"}`)
    .join("\n");
  const orders = input.orders
    .map((order) => `- ${order.code}; ${order.status}; ${order.totalVnd} VND; items=${order.items.map((item) => item.name).join(", ")}`)
    .join("\n");

  return `Chọn offer/sản phẩm phù hợp nhất và trả JSON:
{
  "offerId": "offer id hoặc null",
  "offerTitle": "tên offer hoặc null",
  "productId": "product id hoặc null",
  "productName": "tên sản phẩm hoặc null",
  "reason": "lý do chọn",
  "suggestedReply": "câu sale có thể gửi, tối đa 3 câu",
  "nextActions": ["..."],
  "alternatives": [{"offerId": null, "offerTitle": null, "productId": null, "productName": null, "reason": "..."}],
  "confidence": 0.0
}

Khách:
- Tên: ${input.customer.name ?? "chưa rõ"}
- Stage: ${input.customer.currentStage}
- Lead score: ${input.customer.leadScore}
- Tags: ${input.customer.tags.join(", ") || "(chưa có)"}
- Page: ${input.pageName ?? "chưa rõ"}

Offer khả dụng:
${offers || "(chưa có)"}

Sản phẩm khả dụng:
${products || "(chưa có)"}

Đơn gần đây:
${orders || "(chưa có)"}

Hội thoại:
${history || "(chưa có tin nhắn)"}

Chỉ chọn từ danh sách trên. Không bịa giá/chính sách.`;
}

function rankOffers(offers: Array<{
  id: string;
  product: string;
  title: string;
  offerText: string;
  priceText: string | null;
  priority: number;
  triggerTag: string | null;
  customerStage: string | null;
}>, text: string, tags: string[]): OfferCandidate[] {
  return offers
    .map((offer) => {
      let score = offer.priority * 10;
      if (offer.triggerTag && tags.includes(offer.triggerTag)) score += 30;
      if (offer.customerStage) score += 15;
      if (containsText(text, offer.product)) score += 20;
      if (containsText(text, offer.title)) score += 15;
      if (hasAny(text, ["giá", "bao nhiêu", "combo", "ưu đãi", "sale"])) score += 10;
      return { ...offer, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function rankProducts(products: Array<{
  id: string;
  name: string;
  priceVnd: number;
  description: string | null;
}>, text: string): ProductCandidate[] {
  return products
    .map((product) => {
      let score = 0;
      if (containsText(text, product.name)) score += 30;
      if (product.description && hasAny(text, product.description.toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 12))) {
        score += 8;
      }
      return { ...product, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function buildRuleBasedSuggestion(offers: OfferCandidate[], products: ProductCandidate[], text: string): OfferSuggestionPayload {
  const bestOffer = offers[0] ?? null;
  const bestProduct = products[0] ?? null;
  const asksPrice = hasAny(text, ["giá", "bao nhiêu", "nhiêu", "tiền", "combo", "ưu đãi"]);
  const readyToClose = hasAny(text, ["chốt", "đặt", "mua", "lấy", "ship", "địa chỉ"]);
  const offerTitle = bestOffer?.title ?? null;
  const productName = bestProduct?.name ?? bestOffer?.product ?? null;

  return {
    offerId: bestOffer?.id ?? null,
    offerTitle,
    productId: bestProduct?.id ?? null,
    productName,
    reason: bestOffer
      ? "Offer có điểm phù hợp cao nhất theo stage/tag/page và nội dung hội thoại."
      : bestProduct
        ? "Chưa có offer phù hợp; gợi ý sản phẩm khớp tín hiệu hội thoại."
        : "Chưa đủ dữ liệu offer/sản phẩm để đề xuất mạnh.",
    suggestedReply: buildSuggestedReply({ offerTitle, productName, asksPrice, readyToClose }),
    nextActions: readyToClose
      ? ["Xác nhận mẫu/size/thông tin giao hàng", "Tạo đơn nháp nếu khách đồng ý"]
      : asksPrice
        ? ["Gửi giá/ưu đãi rõ ràng", "Hỏi thêm nhu cầu để chọn combo phù hợp"]
        : ["Hỏi thêm nhu cầu chính", "Gợi ý 1-2 lựa chọn dễ chốt"],
    alternatives: [
      ...offers.slice(1, 3).map((offer) => ({
        offerId: offer.id,
        offerTitle: offer.title,
        productId: null,
        productName: offer.product,
        reason: "Offer thay thế có priority/tín hiệu liên quan.",
      })),
      ...products.slice(bestOffer ? 0 : 1, bestOffer ? 2 : 3).map((product) => ({
        offerId: null,
        offerTitle: null,
        productId: product.id,
        productName: product.name,
        reason: "Sản phẩm thay thế có tín hiệu liên quan trong hội thoại.",
      })),
    ].slice(0, 4),
    confidence: bestOffer || bestProduct ? 0.55 : 0.25,
  };
}

function normalizeSuggestion(raw: Record<string, unknown>, offers: OfferCandidate[], products: ProductCandidate[]): OfferSuggestionPayload {
  const offerId = asNullableId(raw.offerId, offers.map((offer) => offer.id));
  const productId = asNullableId(raw.productId, products.map((product) => product.id));
  const offer = offerId ? offers.find((item) => item.id === offerId) ?? null : null;
  const product = productId ? products.find((item) => item.id === productId) ?? null : null;
  const fallback = buildRuleBasedSuggestion(offers, products, "");

  return {
    offerId,
    offerTitle: asText(raw.offerTitle) ?? offer?.title ?? fallback.offerTitle,
    productId,
    productName: asText(raw.productName) ?? product?.name ?? offer?.product ?? fallback.productName,
    reason: asText(raw.reason) ?? fallback.reason,
    suggestedReply: asText(raw.suggestedReply) ?? fallback.suggestedReply,
    nextActions: asTextArray(raw.nextActions, fallback.nextActions),
    alternatives: normalizeAlternatives(raw.alternatives, offers, products, fallback.alternatives),
    confidence: clampConfidence(raw.confidence, fallback.confidence),
  };
}

function normalizeAlternatives(
  value: unknown,
  offers: OfferCandidate[],
  products: ProductCandidate[],
  fallback: OfferSuggestionPayload["alternatives"]
): OfferSuggestionPayload["alternatives"] {
  if (!Array.isArray(value)) return fallback;
  const offerIds = offers.map((offer) => offer.id);
  const productIds = products.map((product) => product.id);
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const offerId = asNullableId(raw.offerId, offerIds);
      const productId = asNullableId(raw.productId, productIds);
      const offer = offerId ? offers.find((candidate) => candidate.id === offerId) ?? null : null;
      const product = productId ? products.find((candidate) => candidate.id === productId) ?? null : null;
      return {
        offerId,
        offerTitle: asText(raw.offerTitle) ?? offer?.title ?? null,
        productId,
        productName: asText(raw.productName) ?? product?.name ?? offer?.product ?? null,
        reason: asText(raw.reason) ?? "Phương án thay thế.",
      };
    })
    .slice(0, 4);
}

function buildSuggestedReply(input: {
  offerTitle: string | null;
  productName: string | null;
  asksPrice: boolean;
  readyToClose: boolean;
}): string {
  if (input.readyToClose) {
    return `Dạ em có thể lên đơn nháp cho ${input.productName ?? "mẫu này"} để chị kiểm tra trước khi chốt nhé. Chị gửi em size/màu và địa chỉ nhận hàng giúp em ạ.`;
  }
  if (input.asksPrice) {
    return `Dạ ${input.offerTitle ? `hiện bên em có ưu đãi ${input.offerTitle}` : "em gửi chị giá và ưu đãi hiện tại"} cho ${input.productName ?? "mẫu chị hỏi"} nhé. Chị muốn em tư vấn combo tiết kiệm hay chọn đúng size trước ạ?`;
  }
  return `Dạ em tư vấn thêm cho chị về ${input.productName ?? "mẫu phù hợp"} nhé. Chị đang ưu tiên kiểu dáng, giá hay nhu cầu sử dụng nào ạ?`;
}

function asNullableId(value: unknown, allowedIds: string[]): string | null {
  const text = asText(value);
  if (!text || text.toLowerCase() === "null") return null;
  return allowedIds.includes(text) ? text : null;
}

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "null") return null;
  return text.slice(0, 2000);
}

function asTextArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map(asText)
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
  return items.length ? items : fallback;
}

function clampConfidence(value: unknown, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function containsText(haystack: string, needle: string): boolean {
  const text = needle.trim().toLowerCase();
  return Boolean(text) && haystack.includes(text);
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => word && text.includes(word.toLowerCase()));
}
