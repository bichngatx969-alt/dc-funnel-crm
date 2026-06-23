import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetaConnectionCenter } from "@/components/meta/MetaConnectionCenter";

export const dynamic = "force-dynamic";

export default async function MetaAppsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="apps">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Meta Connection Center"
          subtitle="Chẩn đoán Facebook Page, Messenger, Comment, Business Manager, Ad Account và quyền Ads cho workspace hiện tại."
        />
        <MetaConnectionCenter />
      </div>
    </AppShell>
  );
}
