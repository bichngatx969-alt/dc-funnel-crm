import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["ADMIN", "AGENCY_ADMIN", "OWNER", "MANAGER", "SALE", "MARKETER"];

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const rawRole = searchParams.get("role")?.trim().toUpperCase();
  const role = ROLES.includes(rawRole as Role) ? (rawRole as Role) : null;

  const where: Prisma.WorkspaceMemberWhereInput = {
    workspaceId,
    workspace: { deletedAt: null },
  };
  if (role) where.role = role;
  if (q) {
    where.user = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const members = await prisma.workspaceMember.findMany({
    where,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      assignedOnly: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  return jsonOk({
    items: members.map((member) => ({
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role,
      assignedOnly: member.assignedOnly,
      createdAt: member.createdAt,
      user: member.user,
      label: member.user.name || member.user.email,
      isCurrentUser: member.userId === user.id,
    })),
  });
}
