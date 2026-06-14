import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FounderDashboardClient } from "@/components/dashboard/FounderDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="dashboard">
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Tổng quan</h1>
          <p className="text-sm text-gray-500">
            Bức tranh kinh doanh của brand: doanh thu, pipeline, hiệu suất sale, bình luận, việc cần làm và tự động hóa.
          </p>
        </div>
        <FounderDashboardClient />
      </div>
    </AppShell>
  );
}
