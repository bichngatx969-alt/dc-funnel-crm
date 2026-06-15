import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { FounderDashboardClient } from "@/components/dashboard/FounderDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="dashboard">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Tổng quan"
          subtitle="Bức tranh kinh doanh của brand: doanh thu, pipeline, hiệu suất sale, bình luận, việc cần làm và tự động hóa."
        />
        <FounderDashboardClient />
      </div>
    </AppShell>
  );
}
