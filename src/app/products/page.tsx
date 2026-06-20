import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isAiEnabled } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductsClient } from "@/components/products/ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user} active="products">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <PageHeader
          title="Sản phẩm / Dịch vụ"
          subtitle="Quản lý sản phẩm và để AI kiểm tra thông tin còn thiếu, đề xuất phân khúc, pain point, FAQ, xử lý phản đối và sales script."
        />
        <ProductsClient aiEnabled={isAiEnabled()} />
      </div>
    </AppShell>
  );
}
