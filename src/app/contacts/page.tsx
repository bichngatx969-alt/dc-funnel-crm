import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="contacts">
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-gray-500">
            Quản lý toàn bộ khách của brand: thông tin, hội thoại, cơ hội, việc cần làm và ghi chú.
          </p>
        </div>
        <ContactsClient />
      </div>
    </AppShell>
  );
}
