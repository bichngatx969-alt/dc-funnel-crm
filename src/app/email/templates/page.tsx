import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isEmailEnabled } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { EmailTemplatesClient } from "@/components/EmailTemplatesClient";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="email">
      <EmailTemplatesClient emailEnabled={isEmailEnabled()} />
    </AppShell>
  );
}
