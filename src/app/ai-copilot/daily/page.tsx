import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DailyIntelligenceClient } from "@/components/ai-copilot/DailyIntelligenceClient";

export const dynamic = "force-dynamic";

export default async function DailyIntelligencePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="ai-copilot">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Daily Intelligence"
          subtitle="Mỗi sáng DCOS đọc bức tranh Truyền thông → Ads → Inbox → Sale → Doanh thu của hôm qua và chỉ ra điểm nghẽn + việc cần làm."
        />
        <DailyIntelligenceClient />
      </div>
    </AppShell>
  );
}
