import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BookingsClient } from "@/components/bookings/BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="bookings">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Lịch booking"
          subtitle="Theo dõi lịch hẹn dịch vụ, đặt cọc và trạng thái phục vụ theo từng workspace."
        />
        <BookingsClient />
      </div>
    </AppShell>
  );
}
