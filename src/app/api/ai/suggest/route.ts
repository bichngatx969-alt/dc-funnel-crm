import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { buildConversationReplySuggestion } from "@/lib/ai/reply-suggestion";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Gợi ý câu trả lời cho sale. CHỈ gợi ý, không tự gửi.
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const body = await req.json().catch(() => ({}));
  const conversationId = String(body.conversationId ?? "");
  if (!conversationId) return jsonError("Thiếu conversationId");

  const result = await buildConversationReplySuggestion({ workspaceId, conversationId });
  if (!result) return jsonError("Không tìm thấy hội thoại", 404);

  if (result.status === "FAILED" && !result.suggestion?.suggestedReply) {
    return jsonError("Không tạo được gợi ý AI: " + (result.error ?? "unknown"), 502);
  }

  return jsonOk({
    enabled: true,
    aiConfigured: result.aiConfigured,
    status: result.aiConfigured ? result.status : "AI_NOT_CONFIGURED",
    suggestion: result.suggestion.suggestedReply,
    catalog: {
      referencedItems: result.suggestion.referencedItems,
      referencedVariants: result.suggestion.referencedVariants,
      referencedServices: result.suggestion.referencedServices,
      referencedPackages: result.suggestion.referencedPackages,
      warnings: result.suggestion.warnings,
      reason: result.suggestion.reason,
      confidence: result.suggestion.confidence,
    },
    error: result.error,
  });
}
