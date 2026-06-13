import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FlowsClient } from "@/components/FlowsClient";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="flows">
      <FlowsClient />
    </AppShell>
  );
}
