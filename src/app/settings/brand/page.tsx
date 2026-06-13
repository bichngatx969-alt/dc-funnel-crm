import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { BrandSettingsClient } from "@/components/BrandSettingsClient";

export const dynamic = "force-dynamic";

export default async function BrandSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} active="settings">
      <BrandSettingsClient />
    </AppShell>
  );
}
