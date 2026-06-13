import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

const TRIGGERS = [
  "TAG_ADDED",
  "STAGE_CHANGED",
  "FORM_SUBMITTED",
  "MANUAL",
  "PURCHASED",
  "BOOKING_CREATED",
];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body.triggerType !== undefined) {
    if (!TRIGGERS.includes(body.triggerType)) return jsonError("triggerType không hợp lệ");
    data.triggerType = body.triggerType;
  }
  if (body.triggerValue !== undefined) data.triggerValue = body.triggerValue ? String(body.triggerValue).trim() : null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const steps = Array.isArray(body.steps) ? body.steps : null;

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) await tx.emailSequence.update({ where: { id }, data });
      if (steps) {
        await tx.emailSequenceStep.deleteMany({ where: { sequenceId: id } });
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (!s?.templateId) continue;
          await tx.emailSequenceStep.create({
            data: {
              sequenceId: id,
              templateId: String(s.templateId),
              delayMinutes: Number.isFinite(Number(s.delayMinutes)) ? Number(s.delayMinutes) : 0,
              order: Number.isFinite(Number(s.order)) ? Number(s.order) : i,
              conditionsJson: s.conditionsJson ?? undefined,
            },
          });
        }
      }
    });
    const seq = await prisma.emailSequence.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" }, include: { template: { select: { id: true, name: true } } } } },
    });
    return jsonOk(seq);
  } catch (e: any) {
    return jsonError("Không cập nhật được sequence: " + (e?.message ?? "lỗi"), 400);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await prisma.emailSequence.delete({ where: { id } });
    return jsonOk({ id });
  } catch {
    return jsonError("Không tìm thấy sequence", 404);
  }
}
