import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const TASK_STATUS = ["TODO", "DONE", "CANCELLED"];
const TASK_TYPES = ["FOLLOW_UP", "CALL", "CHECK_ORDER", "CUSTOM"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.status !== undefined && TASK_STATUS.includes(body.status)) data.status = body.status;
  if (body.type !== undefined && TASK_TYPES.includes(body.type)) data.type = body.type;
  if (body.title !== undefined) data.title = String(body.title);
  if (body.dueAt !== undefined) {
    const d = body.dueAt ? new Date(body.dueAt) : null;
    data.dueAt = d && !isNaN(d.getTime()) ? d : null;
  }
  if (body.assignedToId !== undefined) {
    data.assignedToId = body.assignedToId ? String(body.assignedToId) : null;
  }

  try {
    const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
    if (!existing) return jsonError("Không tìm thấy task", 404);
    const task = await prisma.task.update({ where: { id }, data });
    return jsonOk(task);
  } catch {
    return jsonError("Không tìm thấy task", 404);
  }
}
