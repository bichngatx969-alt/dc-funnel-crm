import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { commentInclude, parseCommentStatus } from "@/lib/facebook/comments";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const comment = await prisma.facebookComment.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: commentInclude,
  });
  if (!comment) return jsonError("Không tìm thấy comment", 404);

  return jsonOk({ comment });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.facebookComment.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return jsonError("Không tìm thấy comment", 404);

  const body = await req.json().catch(() => ({}));
  const status = body.status === undefined ? undefined : parseCommentStatus(body.status);
  if (body.status !== undefined && !status) return jsonError("Trạng thái comment không hợp lệ");

  const comment = await prisma.facebookComment.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(body.needsFollowUp !== undefined ? { needsFollowUp: Boolean(body.needsFollowUp) } : {}),
      ...(body.isHidden !== undefined ? { isHidden: Boolean(body.isHidden) } : {}),
      ...(body.deleted !== undefined ? { deletedAt: Boolean(body.deleted) ? new Date() : null } : {}),
    },
    include: commentInclude,
  });

  return jsonOk({ comment });
}
