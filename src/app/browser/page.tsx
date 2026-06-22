import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrowserClient } from "@/components/browser/BrowserClient";

export const dynamic = "force-dynamic";

export default async function BrowserPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="browser">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Browser OS"
          subtitle="Shortcut workbench cho các công cụ vận hành cá nhân trong DCOS: Meta, Zalo OA, Canva, Webcake, Google Drive và Gmail."
        />
        <BrowserClient />
      </div>
    </AppShell>
  );
}
