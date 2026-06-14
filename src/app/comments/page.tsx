import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { CommentsClient } from "@/components/comments/CommentsClient";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="comments">
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Bình luận</h1>
          <p className="text-sm text-gray-500">
            Bình luận Facebook kéo về để xử lý nhanh. Ưu tiên comment có số điện thoại và cần follow-up.
          </p>
        </div>
        <CommentsClient />
      </div>
    </AppShell>
  );
}
