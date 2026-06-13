import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FacebookIntegrationsClient } from "@/components/FacebookIntegrationsClient";

export const dynamic = "force-dynamic";

export default async function FacebookSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="settings">
      <FacebookIntegrationsClient />
    </AppShell>
  );
}
