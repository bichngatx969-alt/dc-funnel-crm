import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrdersClient } from "@/components/orders/OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="orders">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Đơn hàng"
          subtitle="Tạo đơn nhanh, theo dõi trạng thái và thanh toán. Tiền tệ VND."
        />
        <OrdersClient />
      </div>
    </AppShell>
  );
}
