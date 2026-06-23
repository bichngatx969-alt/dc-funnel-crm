import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdsClient } from "@/components/ads/AdsClient";

export const dynamic = "force-dynamic";

export default async function AdsInsightsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="ads">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Ads Insights"
          subtitle="Đọc campaign/adset/ad insights từ Meta Graph theo ngày, nếu workspace đã có ads_read và Ad Account."
        />
        <AdsClient mode="insights" />
      </div>
    </AppShell>
  );
}
