import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiGrowthReport } from "@/components/dashboard/AiGrowthReport";

export const dynamic = "force-dynamic";

export default async function AiGrowthPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="dashboard">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="AI Growth"
          subtitle="Báo cáo tối ưu tăng trưởng do AI tổng hợp mỗi ngày: điểm nghẽn, khách cần chăm, offer nên test và việc nên làm ngày mai."
        />
        <AiGrowthReport />
      </div>
    </AppShell>
  );
}
