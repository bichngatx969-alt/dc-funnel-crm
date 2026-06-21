import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAIProviderStatus } from "@/lib/ai/provider";
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
          subtitle="Quản lý catalog để AI tư vấn, gợi ý offer và hỗ trợ sale theo từng sản phẩm, dịch vụ hoặc combo."
        />
        <ProductsClient aiEnabled={getAIProviderStatus().configured} />
      </div>
    </AppShell>
  );
}
