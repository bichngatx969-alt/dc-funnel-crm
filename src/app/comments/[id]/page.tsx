import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { CommentDetailClient } from "@/components/comments/CommentDetailClient";

export const dynamic = "force-dynamic";

export default async function CommentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={user} active="comments">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <CommentDetailClient id={id} />
      </div>
    </AppShell>
  );
}
