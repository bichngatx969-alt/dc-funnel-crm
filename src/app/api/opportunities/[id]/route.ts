import type { OpportunityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import {
  normalizeOpportunityStatus,
  opportunityInclude,
  parseDateOrNull,
  parseVnd,
  statusClosedAt,
  validateOwnerInWorkspace,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const existing = await prisma.opportunity.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
  if (!existing) return jsonError("Không tìm thấy cơ hội", 404);

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    valueVnd?: number;
    status?: OpportunityStatus;
    ownerId?: string | null;
    source?: string | null;
    expectedCloseAt?: Date | null;
    lastActivityAt?: Date | null;
    closedAt?: Date | null;
    deletedAt?: Date | null;
  } = {};

  if (body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError("Tên cơ hội không được để trống");
    data.title = title;
  }
  if (body.valueVnd !== undefined) data.valueVnd = parseVnd(body.valueVnd);
  if (body.ownerId !== undefined) {
    const ownerId = String(body.ownerId || "").trim() || null;
    if (!(await validateOwnerInWorkspace(ownerId, workspaceId))) {
      return jsonError("Owner không thuộc workspace hiện tại", 400);
    }
    data.ownerId = ownerId;
  }
  if (body.source !== undefined) data.source = String(body.source ?? "").trim() || null;
  if (body.expectedCloseAt !== undefined) data.expectedCloseAt = parseDateOrNull(body.expectedCloseAt);
  if (body.lastActivityAt !== undefined) data.lastActivityAt = parseDateOrNull(body.lastActivityAt);
  if (body.status !== undefined) {
    const status = normalizeOpportunityStatus(body.status);
    if (!status) return jsonError("Trạng thái cơ hội không hợp lệ");
    data.status = status;
    data.closedAt = statusClosedAt(status, existing.closedAt);
  }
  if (body.deleted !== undefined) data.deletedAt = Boolean(body.deleted) ? new Date() : null;

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data,
    include: opportunityInclude,
  });

  return jsonOk({ opportunity });
}
