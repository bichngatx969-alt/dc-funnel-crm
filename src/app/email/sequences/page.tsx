import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { EmailSequencesClient } from "@/components/EmailSequencesClient";

export const dynamic = "force-dynamic";

export default async function EmailSequencesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="email">
      <EmailSequencesClient />
    </AppShell>
  );
}
