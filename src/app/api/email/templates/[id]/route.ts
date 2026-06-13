import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  for (const f of ["name", "subject", "bodyHtml", "preheader", "bodyText"]) {
    if (body[f] !== undefined) data[f] = body[f] === null ? null : String(body[f]);
  }
  if (body.variablesJson !== undefined) data.variablesJson = body.variablesJson;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  try {
    const tpl = await prisma.emailTemplate.update({ where: { id }, data });
    return jsonOk(tpl);
  } catch {
    return jsonError("Không tìm thấy template", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await prisma.emailTemplate.delete({ where: { id } });
    return jsonOk({ id });
  } catch {
    return jsonError("Không xóa được (template có thể đang được dùng trong sequence)", 409);
  }
}
