import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getAIProviderStatus } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

// Trạng thái AI provider (chỉ boolean + tên model, KHÔNG bao giờ in key).
export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const status = getAIProviderStatus();
  return jsonOk({
    AI_PROVIDER: status.aiProvider,
    provider: status.provider,
    configured: status.configured,
    model: status.model,
    ANTHROPIC_API_KEY: status.anthropicConfigured,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? null,
    ANTHROPIC_MODEL_FAST: process.env.ANTHROPIC_MODEL_FAST ?? null,
    ANTHROPIC_MODEL_SMART: process.env.ANTHROPIC_MODEL_SMART ?? null,
    OPENAI_API_KEY: status.openaiConfigured,
  });
}
