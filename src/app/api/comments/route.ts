import type { Prisma } from "@prisma/client";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import {
  commentInclude,
  parseBooleanFilter,
  parseCommentStatus,
  parsePagination,
} from "@/lib/facebook/comments";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);

  const { searchParams } = new URL(req.url);
  const { page, pageSize, skip } = parsePagination(searchParams);
  const q = String(searchParams.get("q") ?? searchParams.get("search") ?? "").trim();
  const status = searchParams.get("status") ? parseCommentStatus(searchParams.get("status")) : null;
  if (searchParams.get("status") && !status) return jsonError("Trạng thái comment không hợp lệ");

  const hasPhone = parseBooleanFilter(searchParams.get("hasPhone"));
  const needsFollowUp = parseBooleanFilter(searchParams.get("needsFollowUp"));
  const isHidden = parseBooleanFilter(searchParams.get("isHidden"));
  const pageId = String(searchParams.get("pageId") ?? "").trim();
  const customerId = String(searchParams.get("customerId") ?? "").trim();
  const postId = String(searchParams.get("postId") ?? "").trim();
  const withTotal = searchParams.get("withTotal") === "true";

  const where: Prisma.FacebookCommentWhereInput = {
    workspaceId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(hasPhone === undefined ? {} : { hasPhone }),
    ...(needsFollowUp === undefined ? {} : { needsFollowUp }),
    ...(isHidden === undefined ? {} : { isHidden }),
    ...(pageId ? { pageId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(postId ? { postId } : {}),
    ...(q
      ? {
          OR: [
            { message: { contains: q, mode: "insensitive" } },
            { fromName: { contains: q, mode: "insensitive" } },
            { fromId: { contains: q, mode: "insensitive" } },
            { externalCommentId: { contains: q, mode: "insensitive" } },
            { externalPostId: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const items = await prisma.facebookComment.findMany({
    where,
    orderBy: [{ needsFollowUp: "desc" }, { createdAt: "desc" }],
    skip,
    take: pageSize,
    include: commentInclude,
  });
  const total = withTotal
    ? await prisma.facebookComment.count({ where })
    : skip + items.length + (items.length === pageSize ? 1 : 0);

  return jsonOk({
    items,
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
