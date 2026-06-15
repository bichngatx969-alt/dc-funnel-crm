import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={user} active="orders">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <OrderDetailClient id={id} />
      </div>
    </AppShell>
  );
}
