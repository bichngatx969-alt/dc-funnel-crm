import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { OffersClient } from "@/components/OffersClient";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="offers">
      <OffersClient />
    </AppShell>
  );
}
