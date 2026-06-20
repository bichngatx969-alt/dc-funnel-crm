import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { suggestOfferForConversation } from "@/lib/ai/offer-suggestion";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const result = await suggestOfferForConversation({ workspaceId, conversationId: id });
  if (!result) return jsonError("Không tìm thấy hội thoại", 404);

  return jsonOk({
    aiConfigured: result.aiConfigured,
    status: result.aiConfigured ? result.status : "AI_NOT_CONFIGURED",
    suggestion: result.suggestion,
    error: result.error,
  });
}
