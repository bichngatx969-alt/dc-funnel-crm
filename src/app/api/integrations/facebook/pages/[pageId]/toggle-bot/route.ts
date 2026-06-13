import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { toggleBot } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { pageId } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    return jsonOk(await toggleBot(pageId, Boolean(body.botEnabled)));
  } catch {
    return jsonError("Không tìm thấy Fanpage", 404);
  }
}
