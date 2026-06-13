import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { disconnectPage } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { pageId } = await params;
  try {
    return jsonOk(await disconnectPage(pageId));
  } catch {
    return jsonError("Không tìm thấy Fanpage", 404);
  }
}
