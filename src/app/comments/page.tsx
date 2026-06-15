import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CommentsClient } from "@/components/comments/CommentsClient";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="comments">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Bình luận"
          subtitle="Bình luận Facebook kéo về để xử lý nhanh. Ưu tiên comment có số điện thoại và cần follow-up."
        />
        <CommentsClient />
      </div>
    </AppShell>
  );
}
