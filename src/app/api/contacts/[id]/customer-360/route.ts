import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { buildContactTimeline } from "@/lib/contact";

export const dynamic = "force-dynamic";

const RECENT_TAKE = 5;
const ACTIVITY_TAKE = 10;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const workspaceId = await getCurrentWorkspaceId(user);
  const { id } = await params;

  const contact = await prisma.customer.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      ownerId: true,
      pageId: true,
      psid: true,
      name: true,
      phone: true,
      email: true,
      gender: true,
      birthday: true,
      address: true,
      avatarUrl: true,
      source: true,
      firstCampaign: true,
      firstPostId: true,
      currentStage: true,
      leadScore: true,
      tags: true,
      emailConsent: true,
      emailStatus: true,
      lastInteractionAt: true,
      lastActivityAt: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true } },
      facebookPage: { select: { pageId: true, pageName: true, pagePictureUrl: true } },
    },
  });
  if (!contact) return jsonError("Không tìm thấy contact", 404);

  const [
    totalOrders,
    totalSpent,
    openOpportunities,
    openTasks,
    orders,
    opportunities,
    tasks,
    notes,
    offers,
    recentItems,
    activities,
  ] = await Promise.all([
    prisma.order.count({
      where: { workspaceId, customerId: id, deletedAt: null },
    }),
    prisma.order.aggregate({
      where: {
        workspaceId,
        customerId: id,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { totalVnd: true },
    }),
    prisma.opportunity.count({
      where: { workspaceId, customerId: id, deletedAt: null, status: "OPEN" },
    }),
    prisma.task.count({
      where: { workspaceId, customerId: id, status: "TODO" },
    }),
    prisma.order.findMany({
      where: { workspaceId, customerId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: RECENT_TAKE,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, title: true, status: true } },
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            quantity: true,
            unitPriceVnd: true,
            discountVnd: true,
            lineTotalVnd: true,
          },
        },
      },
    }),
    prisma.opportunity.findMany({
      where: { workspaceId, customerId: id, deletedAt: null },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: RECENT_TAKE,
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, position: true, color: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: { workspaceId, customerId: id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: RECENT_TAKE,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    }),
    prisma.note.findMany({
      where: { workspaceId, customerId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: RECENT_TAKE,
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.offer.findMany({
      where: {
        workspaceId,
        isActive: true,
        OR: [
          { customerStage: contact.currentStage },
          { triggerTag: { in: contact.tags } },
          ...(contact.pageId ? [{ pageId: contact.pageId }] : []),
        ],
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: RECENT_TAKE,
      select: {
        id: true,
        product: true,
        customerStage: true,
        triggerTag: true,
        title: true,
        description: true,
        priceText: true,
        offerText: true,
        priority: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          workspaceId,
          customerId: id,
          deletedAt: null,
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        productId: true,
        name: true,
        sku: true,
        quantity: true,
        unitPriceVnd: true,
        lineTotalVnd: true,
        createdAt: true,
      },
    }),
    buildContactTimeline(id, workspaceId, ACTIVITY_TAKE),
  ]);

  const recentProducts = Array.from(
    recentItems
      .reduce((map, item) => {
        const key = item.productId ?? `${item.name}:${item.sku ?? ""}`;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalVnd += item.lineTotalVnd;
          return map;
        }
        map.set(key, {
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPriceVnd: item.unitPriceVnd,
          totalVnd: item.lineTotalVnd,
          lastPurchasedAt: item.createdAt,
        });
        return map;
      }, new Map<string, { productId: string | null; name: string; sku: string | null; quantity: number; unitPriceVnd: number; totalVnd: number; lastPurchasedAt: Date }>())
      .values()
  ).slice(0, RECENT_TAKE);

  return jsonOk({
    contact,
    summary: {
      totalOrders,
      totalSpentVnd: totalSpent._sum.totalVnd ?? 0,
      openOpportunities,
      openTasks,
      lastActivityAt: contact.lastActivityAt ?? contact.lastInteractionAt ?? contact.updatedAt,
    },
    orders,
    opportunities,
    tasks,
    notes,
    offers,
    tags: contact.tags,
    recentProducts,
    activities,
  });
}
