import { buildCatalogContextForConversation } from "@/lib/ai/catalog-context";
import { matchCatalogContext, type CatalogMatcherResult } from "@/lib/ai/catalog-matcher";
import { generateStructuredAIResponse, getAIProviderStatus } from "@/lib/ai/provider";

export type ConversationReplySuggestion = {
  suggestedReply: string;
  referencedItems: CatalogMatcherResult["matchedItems"];
  referencedVariants: CatalogMatcherResult["matchedVariants"];
  referencedServices: CatalogMatcherResult["matchedServices"];
  referencedPackages: CatalogMatcherResult["matchedPackages"];
  reason: string;
  confidence: number;
  warnings: string[];
};

export type ConversationReplySuggestionResult = {
  aiConfigured: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  suggestion: ConversationReplySuggestion;
  error?: string;
};

const SYSTEM_PROMPT = `Bạn là AI reply suggestion cho CRM inbox.
Bạn chỉ được gợi ý nội dung để sale duyệt thủ công. Không tự gửi tin.
Chỉ dùng dữ liệu catalog được cung cấp. Không bịa giá, tồn kho, lịch trống hay chính sách. Trả JSON hợp lệ bằng tiếng Việt.`;

export async function buildConversationReplySuggestion(params: {
  workspaceId: string;
  conversationId: string;
}): Promise<ConversationReplySuggestionResult | null> {
  const context = await buildCatalogContextForConversation({
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
    itemLimit: 80,
  });
  if (!context.conversationContext.conversation) return null;

  const query = buildConversationQuery(context.conversationContext.recentMessages);
  const matches = matchCatalogContext({ context, query, limit: 6 });
  const aiConfigured = getAIProviderStatus().configured;

  if (aiConfigured) {
    try {
      const raw = await generateStructuredAIResponse({
        task: "catalog-reply-suggestion-v2",
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(context, matches),
        temperature: 0.35,
        maxTokens: 900,
      });
      return {
        aiConfigured,
        status: "SUCCESS",
        suggestion: normalizeSuggestion(raw, matches),
      };
    } catch (err) {
      return {
        aiConfigured,
        status: "FAILED",
        suggestion: buildRuleBasedReply(matches, query),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    aiConfigured,
    status: "SKIPPED",
    suggestion: buildRuleBasedReply(matches, query),
    error: "AI_NOT_CONFIGURED",
  };
}

function buildConversationQuery(messages: Array<{ direction: string; text: string | null }>) {
  const inbound = messages.filter((message) => message.direction === "INBOUND").slice(-8);
  const scoped = inbound.length ? inbound : messages.slice(-8);
  return scoped.map((message) => message.text ?? "").join("\n");
}

function buildPrompt(
  context: Awaited<ReturnType<typeof buildCatalogContextForConversation>>,
  matches: CatalogMatcherResult
) {
  const customer = context.conversationContext.customer;
  const messages = context.conversationContext.recentMessages
    .slice(-12)
    .map((message) => `${message.direction === "INBOUND" ? "Khách" : message.senderType === "HUMAN" ? "Sale" : "Bot"}: ${message.text ?? ""}`)
    .join("\n");
  return `Trả JSON đúng schema:
{
  "suggestedReply": "tối đa 3 câu, sale có thể gửi",
  "reason": "vì sao gợi ý như vậy",
  "confidence": 0.0,
  "warnings": ["..."]
}

Khách:
- Tên: ${customer?.name ?? "chưa rõ"}
- Stage: ${customer?.currentStage ?? "chưa rõ"}
- Tags: ${customer?.tags.join(", ") || "(chưa có)"}

Catalog matched:
- Items: ${matches.matchedItems.map((item) => `${item.name} (${item.type}, ${item.priceVnd} VND, available=${item.available})`).join("; ") || "(không có)"}
- Variants còn hàng: ${matches.matchedVariants.map((variant) => `${variant.itemName} - ${variant.name} (${variant.priceVnd} VND, tồn ${variant.inventoryQuantity})`).join("; ") || "(không có)"}
- Services: ${matches.matchedServices.map((service) => `${service.itemName}${service.variationName ? ` - ${service.variationName}` : ""} (${service.durationMinutes ?? "?"} phút, ${service.priceVnd} VND)`).join("; ") || "(không có)"}
- Packages: ${matches.matchedPackages.map((pkg) => `${pkg.name} (${pkg.priceVnd} VND, tiết kiệm ${pkg.savingsVnd} VND)`).join("; ") || "(không có)"}
- Missing data: ${matches.missingCatalogData.join("; ") || "(không có)"}

Hội thoại:
${messages || "(chưa có)"}

Quy tắc:
- Nếu có variant còn hàng phù hợp, nhắc đúng variant/giá/tồn nếu cần.
- Nếu là dịch vụ, không hứa lịch trống; chỉ đề nghị chọn khung giờ.
- Nếu là package/combo, có thể gợi ý combo để tiết kiệm.
- Nếu thiếu dữ liệu catalog, hỏi thêm thay vì bịa.`;
}

function normalizeSuggestion(raw: Record<string, unknown>, matches: CatalogMatcherResult): ConversationReplySuggestion {
  const fallback = buildRuleBasedReply(matches, "");
  return {
    suggestedReply: asText(raw.suggestedReply) ?? fallback.suggestedReply,
    referencedItems: matches.matchedItems,
    referencedVariants: matches.matchedVariants,
    referencedServices: matches.matchedServices,
    referencedPackages: matches.matchedPackages,
    reason: asText(raw.reason) ?? fallback.reason,
    confidence: clampConfidence(raw.confidence, fallback.confidence),
    warnings: asTextArray(raw.warnings, fallback.warnings),
  };
}

function buildRuleBasedReply(matches: CatalogMatcherResult, query: string): ConversationReplySuggestion {
  const variant = matches.matchedVariants[0];
  const service = matches.matchedServices[0];
  const pkg = matches.matchedPackages[0];
  const item = matches.matchedItems.find((candidate) => candidate.available) ?? matches.matchedItems[0] ?? null;
  const asksPrice = includesAny(query, ["giá", "bao nhiêu", "nhiêu", "tiền", "combo", "ưu đãi"]);
  const asksStock = includesAny(query, ["còn", "size", "màu", "mau", "hang", "hàng"]);

  let suggestedReply: string;
  let reason: string;
  let confidence = 0.35;

  if (variant) {
    suggestedReply = asksStock
      ? `Dạ mẫu ${variant.itemName} bản ${variant.name} hiện còn ${variant.inventoryQuantity} sản phẩm, giá ${formatVnd(variant.priceVnd)}. Chị muốn em giữ mẫu này hay tư vấn thêm size/màu khác ạ?`
      : `Dạ em thấy ${variant.itemName} bản ${variant.name} đang phù hợp, giá ${formatVnd(variant.priceVnd)}. Chị muốn em tư vấn theo size/màu để chọn đúng mẫu nhất không ạ?`;
    reason = "Có variant active còn hàng khớp với nội dung hội thoại.";
    confidence = 0.7;
  } else if (pkg) {
    suggestedReply = `Dạ nếu chị muốn tiết kiệm hơn, bên em có combo ${pkg.name} giá ${formatVnd(pkg.priceVnd)}${pkg.savingsVnd > 0 ? `, lợi hơn khoảng ${formatVnd(pkg.savingsVnd)} so với mua lẻ` : ""}. Chị muốn em gửi chi tiết combo này không ạ?`;
    reason = "Có package/combo phù hợp để upsell hoặc xử lý phản đối giá.";
    confidence = 0.62;
  } else if (service) {
    suggestedReply = `Dạ dịch vụ ${service.itemName}${service.variationName ? ` gói ${service.variationName}` : ""} giá ${formatVnd(service.priceVnd)}${service.durationMinutes ? `, thời lượng khoảng ${service.durationMinutes} phút` : ""}. Chị muốn em tư vấn và hẹn khung giờ phù hợp không ạ?`;
    reason = "Có dịch vụ bookable phù hợp với hội thoại.";
    confidence = 0.6;
  } else if (item) {
    suggestedReply = asksPrice
      ? `Dạ ${item.name} hiện có giá ${formatVnd(item.priceVnd)}. Chị muốn em tư vấn thêm mẫu/nhu cầu để chọn đúng lựa chọn nhất không ạ?`
      : `Dạ em tư vấn thêm cho chị về ${item.name} nhé. Chị đang ưu tiên mẫu mã, giá hay nhu cầu sử dụng nào ạ?`;
    reason = "Có catalog item phù hợp nhưng chưa đủ tín hiệu variant/service/package.";
    confidence = 0.5;
  } else {
    suggestedReply = "Dạ em tư vấn kỹ hơn cho chị nhé. Chị đang quan tâm mẫu/dịch vụ nào, hoặc muốn em gợi ý theo nhu cầu hiện tại ạ?";
    reason = "Chưa match được catalog đủ rõ, nên cần hỏi thêm để tránh bịa thông tin.";
  }

  return {
    suggestedReply,
    referencedItems: matches.matchedItems,
    referencedVariants: matches.matchedVariants,
    referencedServices: matches.matchedServices,
    referencedPackages: matches.matchedPackages,
    reason,
    confidence,
    warnings: matches.missingCatalogData,
  };
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function includesAny(text: string, words: string[]) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word.toLowerCase()));
}

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 1500) : null;
}

function asTextArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.map(asText).filter((item): item is string => Boolean(item)).slice(0, 8);
  return items.length ? items : fallback;
}

function clampConfidence(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}
