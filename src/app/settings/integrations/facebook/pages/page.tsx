import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FacebookPagesClient } from "@/components/FacebookPagesClient";

export const dynamic = "force-dynamic";

export default async function FacebookPagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="settings">
      <FacebookPagesClient />
    </AppShell>
  );
}
