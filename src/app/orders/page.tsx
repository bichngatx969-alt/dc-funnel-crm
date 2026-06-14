import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { OrdersClient } from "@/components/orders/OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="orders">
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <p className="text-sm text-gray-500">Tạo đơn nhanh, theo dõi trạng thái và thanh toán. Tiền tệ VND.</p>
        </div>
        <OrdersClient />
      </div>
    </AppShell>
  );
}
