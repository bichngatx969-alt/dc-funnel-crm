import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspacesClient } from "@/components/workspace/WorkspacesClient";

export const dynamic = "force-dynamic";

export default async function WorkspacesSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Quyền tạo space: backend enforce qua requireAdmin() ở POST /api/workspaces.
  const canManage = user.role === "ADMIN";

  return (
    <AppShell user={user} active="settings">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <PageHeader
          title="Spaces"
          subtitle="Quản lý không gian làm việc cá nhân/brand. Dữ liệu khách không lẫn giữa các space."
        />
        <WorkspacesClient canManage={canManage} />
      </div>
    </AppShell>
  );
}
