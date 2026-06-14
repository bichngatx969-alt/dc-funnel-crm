import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { AutomationClient } from "@/components/automation/AutomationClient";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="automation">
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Tự động hóa</h1>
          <p className="text-sm text-gray-500">
            Đặt quy tắc “khi… thì…” để hệ thống tự làm việc lặp lại: nhắc follow-up, gắn tag, ghi chú, xử lý comment.
          </p>
        </div>
        <AutomationClient />
      </div>
    </AppShell>
  );
}
