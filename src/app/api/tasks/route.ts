import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const TASK_TYPES = ["FOLLOW_UP", "CALL", "CHECK_ORDER", "CUSTOM"];

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: any = {};
  if (status && status !== "all") where.status = status;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      customer: { select: { id: true, name: true, psid: true, phone: true, currentStage: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  return jsonOk(tasks);
}

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId ?? "");
  const title = String(body.title ?? "").trim();
  if (!customerId || !title) return jsonError("Thiếu customerId hoặc title");

  const type = TASK_TYPES.includes(body.type) ? body.type : "FOLLOW_UP";
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;

  const task = await prisma.task.create({
    data: {
      customerId,
      title,
      type,
      dueAt: dueAt && !isNaN(dueAt.getTime()) ? dueAt : null,
      assignedToId: body.assignedToId ? String(body.assignedToId) : user.id,
      status: "TODO",
    },
  });
  return jsonOk(task);
}
