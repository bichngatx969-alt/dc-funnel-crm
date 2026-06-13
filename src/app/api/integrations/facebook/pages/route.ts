import { jsonOk, requireAdmin } from "@/lib/api";
import { listAvailablePages } from "@/lib/facebook/facebook-integration-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return jsonOk(await listAvailablePages());
}
