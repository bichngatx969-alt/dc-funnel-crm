import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FacebookPageDetailClient } from "@/components/FacebookPageDetailClient";

export const dynamic = "force-dynamic";

export default async function FacebookPageDetailPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { pageId } = await params;
  return (
    <AppShell user={user} active="settings">
      <FacebookPageDetailClient pageId={pageId} />
    </AppShell>
  );
}
