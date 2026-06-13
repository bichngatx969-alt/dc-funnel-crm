import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { VERTICAL_LABEL } from "@/lib/types";
import { env } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ?? "text-gray-900"}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ pageId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = (await searchParams) ?? {};
  const pageId = params.pageId && params.pageId !== "all" ? params.pageId : null;
  const pageWhere = pageId ? { pageId } : {};

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [brandProfile, pages, newCustomersToday, openConversations, hotCustomers, followUpNeeded, customers, topPostbacks] =
    await Promise.all([
      prisma.brandProfile.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.facebookPage.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.customer.count({ where: { ...pageWhere, createdAt: { gte: startOfToday } } }),
      prisma.conversation.count({ where: { ...pageWhere, status: { in: ["BOT_ACTIVE", "HUMAN_TAKEOVER"] } } }),
      prisma.customer.count({ where: { ...pageWhere, currentStage: "HOT" } }),
      prisma.task.count({ where: { status: "TODO", customer: pageWhere } }),
      prisma.customer.findMany({ where: pageWhere, select: { tags: true }, take: 2000 }),
      prisma.funnelEvent.groupBy({
        by: ["eventValue"],
        where: { ...pageWhere, eventName: "postback", eventValue: { not: null } },
        _count: { eventValue: true },
        orderBy: { _count: { eventValue: "desc" } },
        take: 8,
      }),
    ]);

  const tagCount = new Map<string, number>();
  for (const c of customers) for (const t of c.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topTags = Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topProducts = topPostbacks
    .filter((p) => p.eventValue)
    .map((p) => ({ payload: p.eventValue as string, count: p._count.eventValue }));

  return (
    <AppShell user={user} active="dashboard">
      <div className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Tổng quan funnel của brand {brandProfile?.brandName ?? "hiện tại"}.
            </p>
          </div>
          <div className="text-right">
            <span className="rounded bg-brand-light px-2 py-1 text-xs font-medium text-brand-dark">
              Vertical: {VERTICAL_LABEL[env.defaultVertical] ?? env.defaultVertical}
            </span>
          </div>
        </div>
        <div className="mb-6 mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/dashboard"
            className={`rounded border px-3 py-1.5 ${!pageId ? "bg-brand text-white" : "bg-white text-gray-700"}`}
          >
            Tất cả Fanpage
          </Link>
          {pages.map((p) => (
            <Link
              key={p.pageId}
              href={`/dashboard?pageId=${encodeURIComponent(p.pageId)}`}
              className={`rounded border px-3 py-1.5 ${pageId === p.pageId ? "bg-brand text-white" : "bg-white text-gray-700"}`}
            >
              {p.pageName}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Khách mới hôm nay" value={newCustomersToday} accent="text-sky-600" />
          <StatCard label="Hội thoại đang mở" value={openConversations} accent="text-indigo-600" />
          <StatCard label="Khách HOT" value={hotCustomers} accent="text-rose-600" />
          <StatCard label="Cần follow-up" value={followUpNeeded} accent="text-amber-600" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Top tag phổ biến</h2>
            {topTags.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có dữ liệu. Hãy để khách inbox vào Fanpage.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map((t) => (
                  <span
                    key={t.tag}
                    className="rounded-full bg-brand-light px-3 py-1 text-sm text-brand-dark"
                  >
                    {t.tag} <span className="font-bold">{t.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Top sản phẩm/dịch vụ được hỏi</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có lượt chọn sản phẩm/dịch vụ nào.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {topProducts.map((p) => (
                  <li key={p.payload} className="flex items-center justify-between border-b py-1 last:border-0">
                    <span className="font-mono text-xs text-gray-700">{p.payload}</span>
                    <span className="font-bold text-gray-900">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
