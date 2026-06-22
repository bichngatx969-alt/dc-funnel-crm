import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/layout/icons";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="ads">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <PageHeader
          title="Ads OS"
          subtitle="Phân tích Meta Ads: spend, CPM, CTR, cost/message, chất lượng lead. Cần kết nối Meta Ads Manager."
        />
        <div className="dc-card flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-400">
            <Icon name="integrations" className="h-7 w-7" />
          </span>
          <h3 className="text-[15px] font-bold text-gray-800">Chưa kết nối Meta Ads Manager</h3>
          <p className="max-w-[30rem] text-[13px] text-gray-500">
            DCOS vẫn phân tích inbox/sale/catalog trong Daily Intelligence, nhưng chưa đánh giá được nguồn quảng cáo.
            Kết nối Meta Ads (quyền <code className="rounded bg-gray-100 px-1">ads_read</code>) để bổ sung lớp Ads OS:
            spend, CPM, CTR, cost/message, chất lượng lead theo campaign/adset/ad.
          </p>
          <a href="/settings/integrations/facebook" className="mt-1 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark">
            Kết nối Meta Ads
          </a>
          <p className="text-[11px] text-gray-400">Sau khi kết nối, DCOS sẽ tự đồng bộ ads insights mỗi sáng.</p>
        </div>
      </div>
    </AppShell>
  );
}
