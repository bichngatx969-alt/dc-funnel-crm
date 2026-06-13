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

export function FacebookIntegrationsClient() {
  const [pages, setPages] = useState<Page[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const data = await apiGet<{ connectedPages: Page[] }>("/api/integrations/facebook/pages");
    setPages(data.connectedPages);
  }

  useEffect(() => {
    load().catch((e: any) => setNotice(e.message));
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
