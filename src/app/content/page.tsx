import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContentClient } from "@/components/content/ContentClient";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="content">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Content OS"
          subtitle="Bài đăng fanpage hôm qua, comment và tín hiệu SĐT từ nội dung. Reach/impressions cần Page insights permission."
        />
        <ContentClient />
      </div>
    </AppShell>
  );
}
