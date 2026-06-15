import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspacesClient } from "@/components/workspace/WorkspacesClient";

export const dynamic = "force-dynamic";

export default async function WorkspacesSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Quyền tạo brand: backend enforce qua requireAdmin() ở POST /api/workspaces.
  const canManage = user.role === "ADMIN";

  return (
    <AppShell user={user} active="settings">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <PageHeader
          title="Brands"
          subtitle="Quản lý các brand và chuyển không gian làm việc. Dữ liệu khách không lẫn giữa các brand."
        />
        <WorkspacesClient canManage={canManage} />
      </div>
    </AppShell>
  );
}
