import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireAdmin, requireApiUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const TRIGGERS = [
  "TAG_ADDED",
  "STAGE_CHANGED",
  "FORM_SUBMITTED",
  "MANUAL",
  "PURCHASED",
  "BOOKING_CREATED",
];

export async function GET() {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const sequences = await prisma.emailSequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: { template: { select: { id: true, name: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });
  return jsonOk(sequences);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return jsonError("Vui lòng nhập tên sequence");
  if (!TRIGGERS.includes(body.triggerType)) return jsonError("triggerType không hợp lệ");

  const steps = Array.isArray(body.steps) ? body.steps : [];

  try {
    const seq = await prisma.emailSequence.create({
      data: {
        name,
        description: body.description ? String(body.description) : null,
        triggerType: body.triggerType,
        triggerValue: body.triggerValue ? String(body.triggerValue).trim() : null,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        steps: {
          create: steps
            .filter((s: any) => s?.templateId)
            .map((s: any, i: number) => ({
              templateId: String(s.templateId),
              delayMinutes: Number.isFinite(Number(s.delayMinutes)) ? Number(s.delayMinutes) : 0,
              order: Number.isFinite(Number(s.order)) ? Number(s.order) : i,
              conditionsJson: s.conditionsJson ?? undefined,
            })),
        },
      },
      include: { steps: true },
    });
    return jsonOk(seq);
  } catch (e: any) {
    return jsonError("Không tạo được sequence: " + (e?.message ?? "lỗi"), 400);
  }
}
