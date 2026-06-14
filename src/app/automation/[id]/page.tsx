import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RuleDetailClient } from "@/components/automation/RuleDetailClient";

export const dynamic = "force-dynamic";

export default async function AutomationRulePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={user} active="automation">
      <div className="p-4 sm:p-6">
        <RuleDetailClient id={id} />
      </div>
    </AppShell>
  );
}
