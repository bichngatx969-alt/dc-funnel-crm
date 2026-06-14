import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import {
  createWorkspaceForUser,
  listUserWorkspaces,
  normalizeIndustry,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const result = await listUserWorkspaces(user);
  return jsonOk(result);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return jsonError("Vui lòng nhập tên workspace");

  const result = await createWorkspaceForUser(auth.user, {
    name,
    industry: normalizeIndustry(body.industry),
    timezone: body.timezone,
    currency: body.currency,
    locale: body.locale,
  });

  return jsonOk(result, 201);
}
