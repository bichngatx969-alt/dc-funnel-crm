import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { buildConversationReplySuggestion } from "@/lib/ai/reply-suggestion";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// Gợi ý câu trả lời dựa trên Catalog v2. Chỉ trả suggestion, không tự gửi tin.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const result = await buildConversationReplySuggestion({ workspaceId, conversationId: id });
  if (!result) return jsonError("Không tìm thấy hội thoại", 404);

  return jsonOk({
    aiConfigured: result.aiConfigured,
    status: result.aiConfigured ? result.status : "AI_NOT_CONFIGURED",
    suggestion: result.suggestion,
    error: result.error,
  });
}
