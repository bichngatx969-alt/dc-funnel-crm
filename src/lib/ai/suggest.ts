import OpenAI from "openai";
import { env, isAiEnabled } from "@/lib/env";

export type AiSuggestInput = {
  customer: {
    name?: string | null;
    currentStage: string;
    tags: string[];
    leadScore: number;
  };
  recentMessages: { direction: string; senderType: string; text: string | null }[];
  latestMessage: string;
  brandName: string;
  offers: {
    product: string;
    title: string;
    offerText: string;
    priceText?: string | null;
  }[];
};

export type AiSuggestResult = {
  ok: boolean;
  suggestion?: string;
  error?: string;
};

const SYSTEM_PROMPT = `Bạn là trợ lý sale/funnel cho fanpage bán hàng.
Hãy gợi ý 1 câu trả lời ngắn, tự nhiên, đúng thông tin offer, mục tiêu là tư vấn và đưa khách sang bước tiếp theo.
Không bịa chính sách. Nếu thiếu thông tin thì hỏi thêm. Không quá 3 câu.
Trả lời bằng tiếng Việt, giọng thân thiện, lịch sự, xưng "em" với khách.`;

export async function aiSuggestReply(input: AiSuggestInput): Promise<AiSuggestResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "ai_disabled" };
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey });

  const offerLines = input.offers.length
    ? input.offers
        .map(
          (o) =>
            `- [${input.brandName} / ${o.product}] ${o.title}: ${o.offerText}${
              o.priceText ? ` (${o.priceText})` : ""
            }`
        )
        .join("\n")
    : "(chưa có offer phù hợp)";

  const history = input.recentMessages
    .slice(-10)
    .map((m) => {
      const who =
        m.direction === "INBOUND" ? "Khách" : m.senderType === "HUMAN" ? "Sale" : "Bot";
      return `${who}: ${m.text ?? ""}`;
    })
    .join("\n");

  const userPrompt = `Thông tin khách:
- Tên: ${input.customer.name ?? "chưa rõ"}
- Giai đoạn phễu: ${input.customer.currentStage}
- Lead score: ${input.customer.leadScore}
- Tag: ${input.customer.tags.join(", ") || "(chưa có)"}

Các offer đang có:
${offerLines}

Lịch sử hội thoại gần đây:
${history}

Tin nhắn mới nhất của khách: "${input.latestMessage}"

Hãy gợi ý 1 câu trả lời cho sale gửi cho khách.`;

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.7,
      max_tokens: 220,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const suggestion = completion.choices[0]?.message?.content?.trim();
    if (!suggestion) return { ok: false, error: "empty_response" };
    return { ok: true, suggestion };
  } catch (err) {
    console.error("[AI] Lỗi gọi OpenAI:", err);
    return { ok: false, error: String(err) };
  }
}
