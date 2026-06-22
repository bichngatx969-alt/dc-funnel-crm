import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { isAiEnabled, isEmailEnabled } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";

export const dynamic = "force-dynamic";

type AppCard = {
  title: string;
  description: string;
  status: string;
  tone: "ready" | "partial" | "planned";
  href: string;
  action: string;
  external?: boolean;
};

export default async function AppsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const workspaceId = await getCurrentWorkspaceId(user);
  const [facebookPages, conversations, comments, catalogItems, activeRules] = await Promise.all([
    prisma.facebookPage.count({ where: { workspaceId, status: { not: "DISCONNECTED" } } }),
    prisma.conversation.count({ where: { workspaceId } }),
    prisma.facebookComment.count({ where: { workspaceId } }),
    prisma.catalogItem.count({ where: { workspaceId, deletedAt: null } }),
    prisma.automationRule.count({ where: { workspaceId, isActive: true, deletedAt: null } }),
  ]);

  const apps: AppCard[] = [
    {
      title: "Facebook OS",
      description: `${facebookPages} Page, ${conversations} hội thoại, ${comments} bình luận trong Space hiện tại.`,
      status: facebookPages > 0 ? "Đã kết nối" : "Chưa kết nối",
      tone: facebookPages > 0 ? "ready" : "partial",
      href: "/settings/integrations/facebook",
      action: facebookPages > 0 ? "Quản lý kênh" : "Kết nối Facebook",
    },
    {
      title: "Zalo OS",
      description: "Chuẩn bị cho Zalo OA theo API chính thức, không dùng cookie/session cá nhân.",
      status: "Planned",
      tone: "planned",
      href: "https://oa.zalo.me/manage",
      action: "Mở Zalo OA",
      external: true,
    },
    {
      title: "Browser OS",
      description: "Workbench shortcut cho Meta, Zalo, Canva, Webcake, Drive và các công cụ vận hành.",
      status: "MVP sẵn sàng",
      tone: "ready",
      href: "/browser",
      action: "Mở Browser OS",
    },
    {
      title: "Catalog OS",
      description: `${catalogItems} sản phẩm/dịch vụ trong Catalog v2, có media, variant và inventory.`,
      status: catalogItems > 0 ? "Đang dùng" : "Cần nhập dữ liệu",
      tone: catalogItems > 0 ? "ready" : "partial",
      href: "/products",
      action: "Mở Catalog",
    },
    {
      title: "AI Copilot",
      description: "Insight, offer suggestion, audit sản phẩm và growth report với fallback an toàn khi chưa có API key.",
      status: isAiEnabled() ? "AI model bật" : "Fallback rules",
      tone: isAiEnabled() ? "ready" : "partial",
      href: "/dashboard/ai-growth",
      action: "Mở AI Copilot",
    },
    {
      title: "Automation OS",
      description: `${activeRules} rule đang bật trong Space hiện tại.`,
      status: activeRules > 0 ? "Đang chạy" : "Chưa bật rule",
      tone: activeRules > 0 ? "ready" : "partial",
      href: "/automation",
      action: "Mở Automation",
    },
    {
      title: "Email OS",
      description: "Sequence, template và email follow-up; gửi thật chỉ bật khi env Resend đầy đủ.",
      status: isEmailEnabled() ? "Đã cấu hình gửi" : "Chưa cấu hình gửi",
      tone: isEmailEnabled() ? "ready" : "partial",
      href: "/email",
      action: "Mở Email",
    },
    {
      title: "Canva / Drive / Webcake",
      description: "Shortcut thao tác thủ công cho creator và chủ shop, chưa đồng bộ dữ liệu tự động.",
      status: "Shortcut",
      tone: "planned",
      href: "/browser",
      action: "Mở shortcut",
    },
  ];

  return (
    <AppShell user={user} active="apps">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="App Center"
          subtitle="Kết nối và mở nhanh các app vận hành trong DCOS: kênh bán hàng, inbox, catalog, automation, AI và công cụ creator."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <Surface key={app.title} className="flex min-h-[190px] flex-col justify-between">
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900">{app.title}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(app.tone)}`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-sm leading-6 text-gray-500">{app.description}</p>
              </div>
              <Link
                href={app.href}
                target={app.external ? "_blank" : undefined}
                rel={app.external ? "noopener noreferrer" : undefined}
                className="mt-5 inline-flex w-fit rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {app.action}
              </Link>
            </Surface>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function toneClass(tone: AppCard["tone"]) {
  if (tone === "ready") return "bg-emerald-50 text-emerald-700";
  if (tone === "partial") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}
