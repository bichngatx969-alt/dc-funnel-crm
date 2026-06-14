import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { getContactInWorkspace, normalizeText } from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const contact = await getContactInWorkspace(id, workspaceId);
  if (!contact) return jsonError("Không tìm thấy contact", 404);

  const body = await req.json().catch(() => ({}));
  const noteBody = normalizeText(body.body ?? body.text ?? body.note);
  if (!noteBody) return jsonError("Nội dung note không được để trống");

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.note.create({
      data: {
        workspaceId,
        customerId: id,
        authorId: user.id,
        body: noteBody,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.customer.update({
      where: { id },
      data: { lastActivityAt: created.createdAt },
    });

    return created;
  });

  return jsonOk({ note }, 201);
}
