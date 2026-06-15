import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PipelineClient } from "@/components/pipeline/PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const canManage = user.role === "ADMIN";

  return (
    <AppShell user={user} active="pipeline">
      <div className="mx-auto flex h-full max-w-7xl flex-col p-4 sm:p-6">
        <PageHeader
          title="Pipeline"
          subtitle="Quản lý cơ hội bán hàng theo từng giai đoạn. Kéo thẻ hoặc dùng nút chuyển để đổi giai đoạn."
        />
        <PipelineClient canManage={canManage} />
      </div>
    </AppShell>
  );
}
