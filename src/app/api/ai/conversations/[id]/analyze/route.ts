import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { analyzeConversationForSales } from "@/lib/ai/conversation-analysis";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const result = await analyzeConversationForSales({ workspaceId, conversationId: id });
  if (!result) return jsonError("Không tìm thấy hội thoại", 404);

  return jsonOk({
    aiConfigured: result.aiConfigured,
    status: result.aiConfigured ? result.status : "AI_NOT_CONFIGURED",
    insight: result.insight,
    run: {
      id: result.run.id,
      status: result.run.status,
      error: result.run.error,
      createdAt: result.run.createdAt,
    },
    error: result.error,
  });
}
