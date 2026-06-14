import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { WorkspacesClient } from "@/components/workspace/WorkspacesClient";

export const dynamic = "force-dynamic";

export default async function WorkspacesSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Quyền tạo brand: backend enforce qua requireAdmin() ở POST /api/workspaces.
  // UI chỉ ẩn/hiện form cho gọn (legacy ADMIN). SALE vẫn chuyển brand được.
  const canManage = user.role === "ADMIN";

  return (
    <AppShell user={user} active="settings">
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-sm text-gray-500">
            Quản lý các brand và chuyển không gian làm việc. Dữ liệu khách không lẫn giữa các brand.
          </p>
        </div>
        <WorkspacesClient canManage={canManage} />
      </div>
    </AppShell>
  );
}
