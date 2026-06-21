// AI provider layer — hỗ trợ Anthropic (Claude), OpenAI, và rule_based fallback.
// Đọc env trực tiếp (không sửa src/lib/env.ts). KHÔNG log prompt/secret/dữ liệu khách.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProviderName = "anthropic" | "openai" | "rule_based";

function trimEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}
function numEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function anthropicModel(kind?: "fast" | "smart"): string {
  if (kind === "fast" && trimEnv("ANTHROPIC_MODEL_FAST")) return trimEnv("ANTHROPIC_MODEL_FAST");
  if (kind === "smart" && trimEnv("ANTHROPIC_MODEL_SMART")) return trimEnv("ANTHROPIC_MODEL_SMART");
  return trimEnv("ANTHROPIC_MODEL") || DEFAULT_ANTHROPIC_MODEL;
}
function openaiModel(): string {
  return trimEnv("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;
}

export type AIProviderStatus = {
  provider: AIProviderName;
  configured: boolean;
  aiProvider: string; // giá trị AI_PROVIDER thô
  model: string | null;
  anthropicConfigured: boolean;
  openaiConfigured: boolean;
};

// Quyết định provider: ưu tiên AI_PROVIDER, có key thì dùng, không thì fallback sang
// provider còn lại có key, cuối cùng là rule_based.
export function getAIProviderStatus(): AIProviderStatus {
  const anthropicConfigured = trimEnv("ANTHROPIC_API_KEY").length > 0;
  const openaiConfigured = trimEnv("OPENAI_API_KEY").length > 0;
  const pref = (trimEnv("AI_PROVIDER") || "anthropic").toLowerCase();

  let provider: AIProviderName = "rule_based";
  if (pref === "anthropic" && anthropicConfigured) provider = "anthropic";
  else if (pref === "openai" && openaiConfigured) provider = "openai";
  else if (anthropicConfigured) provider = "anthropic";
  else if (openaiConfigured) provider = "openai";

  return {
    provider,
    configured: provider !== "rule_based",
    aiProvider: pref,
    model: provider === "anthropic" ? anthropicModel() : provider === "openai" ? openaiModel() : null,
    anthropicConfigured,
    openaiConfigured,
  };
}

// Một số model Claude (Opus 4.7/4.8, Fable, Mythos) từ chối tham số temperature.
function supportsTemperature(model: string): boolean {
  const m = model.toLowerCase();
  return !(m.includes("opus-4-7") || m.includes("opus-4-8") || m.includes("fable") || m.includes("mythos"));
}

type GenParams = {
  task: string;
  system: string;
  prompt: string;
  schemaHint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

// Gọi provider hiện hành, trả text thô. json=true → ép OpenAI dùng JSON mode.
// Ném lỗi nếu không cấu hình AI (caller tự fallback rule-based).
async function callProvider(params: GenParams, json: boolean): Promise<string> {
  const status = getAIProviderStatus();
  if (!status.configured) throw new Error("AI_NOT_CONFIGURED");

  const maxTokens = params.maxTokens ?? numEnv("AI_MAX_TOKENS", 900);
  const temperature = params.temperature ?? numEnv("AI_TEMPERATURE", 0.2);
  const timeout = numEnv("AI_TIMEOUT_MS", 30000);
  const userContent =
    json && params.schemaHint
      ? `${params.prompt}\n\nChỉ trả về JSON hợp lệ đúng schema sau, không kèm giải thích:\n${params.schemaHint}`
      : params.prompt;

  if (status.provider === "anthropic") {
    const model = params.model ?? anthropicModel();
    const client = new Anthropic({ apiKey: trimEnv("ANTHROPIC_API_KEY"), timeout });
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: params.system,
      messages: [{ role: "user", content: userContent }],
      ...(supportsTemperature(model) ? { temperature } : {}),
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    return text;
  }

  // openai
  const model = params.model ?? openaiModel();
  const client = new OpenAI({ apiKey: trimEnv("OPENAI_API_KEY"), timeout });
  const completion = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: userContent },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  return content.trim();
}

// Sinh text thô (không ép JSON) — dùng cho gợi ý câu trả lời.
export async function generateTextAIResponse(params: GenParams): Promise<string> {
  return callProvider(params, false);
}

// Sinh + parse JSON object. Bóc code-fence và trích {...} an toàn.
export async function generateStructuredAIResponse(params: GenParams): Promise<Record<string, unknown>> {
  const text = await callProvider(params, true);
  return parseJsonObject(text);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    /* thử trích object đầu tiên */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  }
  throw new Error("AI_INVALID_JSON");
}
