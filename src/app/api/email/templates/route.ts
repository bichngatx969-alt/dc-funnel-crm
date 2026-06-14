import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const templates = await prisma.emailTemplate.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk(templates);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const workspaceId = await getCurrentWorkspaceId(auth.user);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? "").trim();
  if (!name || !subject || !bodyHtml) return jsonError("Vui lòng nhập name, subject, bodyHtml");

  const tpl = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name,
      subject,
      bodyHtml,
      preheader: body.preheader ? String(body.preheader) : null,
      bodyText: body.bodyText ? String(body.bodyText) : null,
      variablesJson: body.variablesJson ?? undefined,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  });
  return jsonOk(tpl);
}
