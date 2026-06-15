import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="contacts">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Khách hàng"
          subtitle="Quản lý toàn bộ khách của brand: thông tin, hội thoại, cơ hội, việc cần làm và ghi chú."
        />
        <ContactsClient />
      </div>
    </AppShell>
  );
}
