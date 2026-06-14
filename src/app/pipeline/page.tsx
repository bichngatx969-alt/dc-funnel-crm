import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PipelineClient } from "@/components/pipeline/PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Tạo/sửa pipeline cần quyền admin ở backend (requireAdmin). UI chỉ ẩn/hiện cho gọn.
  const canManage = user.role === "ADMIN";

  return (
    <AppShell user={user} active="pipeline">
      <div className="flex h-full flex-col p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-gray-500">
            Quản lý cơ hội bán hàng theo từng giai đoạn. Kéo thẻ hoặc dùng nút chuyển để đổi giai đoạn.
          </p>
        </div>
        <PipelineClient canManage={canManage} />
      </div>
    </AppShell>
  );
}
