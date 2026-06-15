import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContactDetailClient } from "@/components/contacts/ContactDetailClient";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={user} active="contacts">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ContactDetailClient id={id} />
      </div>
    </AppShell>
  );
}
