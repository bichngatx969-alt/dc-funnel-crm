"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type Page = {
  id: string;
  pageId: string;
  pageName: string;
  pageUsername?: string | null;
  pagePictureUrl?: string | null;
  botEnabled: boolean;
  webhookSubscribed: boolean;
  status: string;
  lastHealthCheckAt?: string | null;
  lastError?: string | null;
};

type BusinessItem = {
  id: string;
  name: string;
  verificationStatus?: string | null;
  createdTime?: string | null;
  connected: boolean;
};

type ConnectedBusiness = {
  id: string;
  businessId: string;
  businessName: string;
  verificationStatus?: string | null;
  updatedAt: string;
};

type CatalogItem = {
  id: string;
  name: string;
  businessId: string;
  vertical?: string | null;
  productCount?: number | null;
  connected: boolean;
};

type ConnectedCatalog = {
  id: string;
  businessId: string;
  catalogId: string;
  catalogName: string;
  vertical?: string | null;
  productCount?: number | null;
  updatedAt: string;
};

export function FacebookIntegrationsClient() {
  const [pages, setPages] = useState<Page[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [connectedBusinesses, setConnectedBusinesses] = useState<ConnectedBusiness[]>([]);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [connectedCatalogs, setConnectedCatalogs] = useState<ConnectedCatalog[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [busyBusinessId, setBusyBusinessId] = useState<string | null>(null);
  const [busyCatalogId, setBusyCatalogId] = useState<string | null>(null);

  async function load() {
    const data = await apiGet<{ connectedPages: Page[] }>("/api/integrations/facebook/pages");
    setPages(data.connectedPages);
  }

  async function loadBusinesses(includeAvailable = false) {
    setLoadingBusinesses(true);
    setBusinessError(null);
    try {
      const data = await apiGet<{
        items: BusinessItem[];
        connectedBusinesses: ConnectedBusiness[];
        error?: string;
      }>(`/api/integrations/facebook/businesses${includeAvailable ? "?available=true" : ""}`);
      setBusinesses(data.items);
      setConnectedBusinesses(data.connectedBusinesses);
      setBusinessError(data.error ?? null);
    } catch (e: any) {
      setBusinessError(e.message);
    } finally {
      setLoadingBusinesses(false);
    }
  }

  async function loadCatalogs(businessId: string) {
    setSelectedBusinessId(businessId);
    setLoadingCatalogs(true);
    setCatalogError(null);
    try {
      const data = await apiGet<{
        items: CatalogItem[];
        connectedCatalogs: ConnectedCatalog[];
        error?: string;
      }>(`/api/integrations/facebook/businesses/${businessId}/catalogs`);
      setCatalogs(data.items);
      setConnectedCatalogs(data.connectedCatalogs);
      setCatalogError(data.error ?? null);
    } catch (e: any) {
      setCatalogs([]);
      setConnectedCatalogs([]);
      setCatalogError(e.message);
    } finally {
      setLoadingCatalogs(false);
    }
  }

  useEffect(() => {
    load().catch((e: any) => setNotice(e.message));
    loadBusinesses(false);
  }, []);

  async function toggle(page: Page) {
    await apiSend(`/api/integrations/facebook/pages/${page.pageId}/toggle-bot`, "POST", {
      botEnabled: !page.botEnabled,
    });
    await load();
  }

  async function healthCheck(pageId: string) {
    setNotice(null);
    await apiSend(`/api/integrations/facebook/pages/${pageId}/health-check`, "POST");
    await load();
  }

  async function disconnect(pageId: string) {
    if (!confirm("Ngắt kết nối Fanpage này? Bot sẽ tắt và token sẽ bị xóa khỏi CRM.")) return;
    await apiSend(`/api/integrations/facebook/pages/${pageId}/disconnect`, "POST");
    await load();
  }

  async function connectBusiness(business: BusinessItem) {
    setBusyBusinessId(business.id);
    setBusinessError(null);
    try {
      await apiSend("/api/integrations/facebook/businesses/connect", "POST", {
        businessId: business.id,
        businessName: business.name,
      });
      await loadBusinesses();
    } catch (e: any) {
      setBusinessError(e.message);
    } finally {
      setBusyBusinessId(null);
    }
  }

  async function connectCatalog(catalog: CatalogItem) {
    setBusyCatalogId(catalog.id);
    setCatalogError(null);
    try {
      await apiSend("/api/integrations/facebook/catalogs/connect", "POST", {
        businessId: catalog.businessId,
        catalogId: catalog.id,
        catalogName: catalog.name,
      });
      await loadCatalogs(catalog.businessId);
    } catch (e: any) {
      setCatalogError(e.message);
    } finally {
      setBusyCatalogId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Kết nối Fanpage Facebook</h1>
          <p className="text-sm text-gray-500">
            Kết nối Fanpage để D.C Funnel Bot nhận inbox, phân loại khách và hỗ trợ sale theo funnel.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/integrations/facebook/pages" className="rounded border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Chọn Fanpage
          </Link>
          <a href="/api/integrations/facebook/login" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Kết nối Facebook
          </a>
        </div>
      </div>

      {notice && <div className="mb-3 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{notice}</div>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Fanpage</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Bot</th>
              <th className="px-3 py-2">Webhook</th>
              <th className="px-3 py-2">Health check</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  Chưa có Fanpage nào được kết nối.
                </td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.pageId} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {p.pagePictureUrl ? <img src={p.pagePictureUrl} alt="" className="h-9 w-9 rounded-full" /> : <div className="h-9 w-9 rounded-full bg-gray-200" />}
                    <div>
                      <div className="font-medium">{p.pageName}</div>
                      <div className="font-mono text-xs text-gray-500">{p.pageId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-3 py-2"><Badge ok={p.botEnabled} text={p.botEnabled ? "ON" : "OFF"} /></td>
                <td className="px-3 py-2"><Badge ok={p.webhookSubscribed} text={p.webhookSubscribed ? "Subscribed" : "Chưa subscribed"} /></td>
                <td className="px-3 py-2 text-xs text-gray-500">{p.lastHealthCheckAt ? new Date(p.lastHealthCheckAt).toLocaleString("vi-VN") : "Chưa chạy"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => toggle(p)} className="mr-2 text-xs text-sky-600 hover:underline">{p.botEnabled ? "Tắt bot" : "Bật bot"}</button>
                  <button onClick={() => healthCheck(p.pageId)} className="mr-2 text-xs text-sky-600 hover:underline">Health check</button>
                  <Link href={`/settings/integrations/facebook/pages/${p.pageId}`} className="mr-2 text-xs text-sky-600 hover:underline">Chi tiết</Link>
                  <button onClick={() => disconnect(p.pageId)} className="text-xs text-rose-600 hover:underline">Ngắt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Business Manager / Business Portfolio</h2>
            <p className="text-sm text-gray-500">
              Kết nối Business và Catalog để chuẩn bị đồng bộ sản phẩm, Pixel hoặc Ad Account về sau.
            </p>
          </div>
          <button
            onClick={() => loadBusinesses(true)}
            disabled={loadingBusinesses}
            className="rounded border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingBusinesses ? "Đang tải..." : "Tải danh sách Business"}
          </button>
        </div>

        {businessError && (
          <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {businessError}
          </div>
        )}

        {connectedBusinesses.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Connected Businesses</div>
            <div className="grid gap-2 md:grid-cols-2">
              {connectedBusinesses.map((business) => (
                <div key={business.businessId} className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <div className="font-semibold">{business.businessName}</div>
                  <div className="font-mono text-xs text-gray-500">{business.businessId}</div>
                  {business.verificationStatus && (
                    <div className="mt-1 text-xs text-gray-500">Verification: {business.verificationStatus}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {businesses.map((business) => (
            <div key={business.id} className="rounded-lg border p-3">
              <div className="mb-2 min-w-0">
                <div className="truncate font-semibold">{business.name}</div>
                <div className="font-mono text-xs text-gray-500">{business.id}</div>
                {business.verificationStatus && (
                  <div className="mt-1 text-xs text-gray-500">Verification: {business.verificationStatus}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => connectBusiness(business)}
                  disabled={busyBusinessId === business.id}
                  className="rounded bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busyBusinessId === business.id ? "Đang kết nối..." : business.connected ? "Reconnect" : "Kết nối"}
                </button>
                <button
                  onClick={() => loadCatalogs(business.id)}
                  disabled={loadingCatalogs && selectedBusinessId === business.id}
                  className="rounded border bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingCatalogs && selectedBusinessId === business.id ? "Đang tải..." : "Tải Catalog"}
                </button>
              </div>
            </div>
          ))}
          {businesses.length === 0 && !businessError && (
            <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-500">
              Chưa tìm thấy Business/Catalog. Kiểm tra tài khoản Facebook có quyền trong Business Manager và app đã
              được cấp business_management/catalog_management.
            </div>
          )}
        </div>

        {(selectedBusinessId || connectedCatalogs.length > 0) && (
          <div className="mt-5 border-t pt-4">
            <div className="mb-3">
              <h3 className="font-semibold">Catalogs</h3>
              {selectedBusinessId && (
                <div className="font-mono text-xs text-gray-500">Business: {selectedBusinessId}</div>
              )}
            </div>

            {catalogError && (
              <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {catalogError}
              </div>
            )}

            {connectedCatalogs.length > 0 && (
              <div className="mb-4 grid gap-2 md:grid-cols-2">
                {connectedCatalogs.map((catalog) => (
                  <div key={catalog.catalogId} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="font-semibold">{catalog.catalogName}</div>
                    <div className="font-mono text-xs text-gray-500">{catalog.catalogId}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {catalog.vertical || "Catalog"} · {catalog.productCount ?? 0} sản phẩm
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {catalogs.map((catalog) => (
                <div key={catalog.id} className="rounded-lg border p-3">
                  <div className="mb-2">
                    <div className="font-semibold">{catalog.name}</div>
                    <div className="font-mono text-xs text-gray-500">{catalog.id}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {catalog.vertical || "Catalog"} · {catalog.productCount ?? 0} sản phẩm
                    </div>
                  </div>
                  <button
                    onClick={() => connectCatalog(catalog)}
                    disabled={busyCatalogId === catalog.id}
                    className="rounded bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {busyCatalogId === catalog.id ? "Đang kết nối..." : catalog.connected ? "Reconnect" : "Kết nối Catalog"}
                  </button>
                </div>
              ))}
              {selectedBusinessId && catalogs.length === 0 && !catalogError && !loadingCatalogs && (
                <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-500">
                  No catalogs found. Kiểm tra Business có Catalog và app đã được cấp catalog_management.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "CONNECTED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "WEBHOOK_NOT_SUBSCRIBED"
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{status}</span>;
}

export function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
      {text}
    </span>
  );
}
