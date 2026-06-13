import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAiEnabled, isEmailEnabled } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { InboxClient } from "@/components/InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="inbox">
      <InboxClient aiEnabled={isAiEnabled()} emailEnabled={isEmailEnabled()} />
    </AppShell>
  );
}
