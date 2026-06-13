import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { isAiEnabled, isEmailEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const connectedPageCount = await prisma.facebookPage.count({
    where: { status: { not: "DISCONNECTED" } },
  });

  return (
    <AppShell user={user} active="settings">
      <div className="p-6">
        <h1 className="mb-1 text-2xl font-bold">Integrations</h1>
        <p className="mb-5 text-sm text-gray-500">Kết nối các kênh vận hành cho brand hiện tại.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <IntegrationCard
            title="Facebook Fanpage"
            status={`Đã kết nối ${connectedPageCount} Page`}
            href="/settings/integrations/facebook"
            action="Quản lý Fanpage"
          />
          <IntegrationCard
            title="Email Automation"
            status={isEmailEnabled() ? "Đã bật gửi email" : "Chưa cấu hình gửi email"}
            href="/email"
            action="Mở Email"
          />
          <IntegrationCard
            title="OpenAI"
            status={isAiEnabled() ? "AI suggestion đang bật" : "Chưa có OPENAI_API_KEY"}
            href="/inbox"
            action="Mở Inbox"
          />
        </div>
      </div>
    </AppShell>
  );
}

function IntegrationCard({
  title,
  status,
  href,
  action,
}: {
  title: string;
  status: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{status}</p>
      <Link href={href} className="mt-4 inline-flex rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        {action}
      </Link>
    </div>
  );
}
