import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AutomationClient } from "@/components/automation/AutomationClient";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="automation">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Tự động hóa"
          subtitle="Đặt quy tắc “khi… thì…” để hệ thống tự làm việc lặp lại: nhắc follow-up, gắn tag, ghi chú, xử lý comment."
        />
        <AutomationClient />
      </div>
    </AppShell>
  );
}
