"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Badge, StatusBadge } from "@/components/FacebookIntegrationsClient";

type Page = any;
type Log = {
  id: string;
  eventType: string | null;
  processingStatus: string;
  errorMessage: string | null;
  createdAt: string;
};

export function FacebookPageDetailClient({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<Page | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [pageData, logData] = await Promise.all([
      apiGet<Page>(`/api/integrations/facebook/pages/${pageId}`),
      apiGet<Log[]>(`/api/integrations/facebook/pages/${pageId}/logs`),
    ]);
    setPage(pageData);
    setLogs(logData);
  }

  useEffect(() => {
    load().catch((e: any) => setNotice(e.message));
  }, [pageId]);

  async function toggle() {
    if (!page) return;
    await apiSend(`/api/integrations/facebook/pages/${pageId}/toggle-bot`, "POST", {
      botEnabled: !page.botEnabled,
    });
    await load();
  }

  async function healthCheck() {
    await apiSend(`/api/integrations/facebook/pages/${pageId}/health-check`, "POST");
    await load();
  }

  async function disconnect() {
    if (!confirm("Ngắt kết nối Fanpage này?")) return;
    await apiSend(`/api/integrations/facebook/pages/${pageId}/disconnect`, "POST");
    await load();
  }

  if (!page) return <div className="p-6 text-sm text-gray-500">{notice ?? "Đang tải Fanpage..."}</div>;
  const subscribedFields = Array.isArray(page.permissionsJson?.subscribedFields)
    ? page.permissionsJson.subscribedFields
    : [];
  const requiredFields = Array.isArray(page.permissionsJson?.requiredSubscribedFields)
    ? page.permissionsJson.requiredSubscribedFields
    : [];

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{page.pageName}</h1>
          <div className="font-mono text-xs text-gray-500">{page.pageId}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={healthCheck} className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50">Run health check</button>
          <button onClick={toggle} className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            {page.botEnabled ? "Disable bot" : "Enable bot"}
          </button>
          <button onClick={disconnect} className="rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">Disconnect</button>
        </div>
      </div>

      {notice && <div className="mb-3 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{notice}</div>}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Info label="Status"><StatusBadge status={page.status} /></Info>
        <Info label="Bot enabled"><Badge ok={page.botEnabled} text={page.botEnabled ? "ON" : "OFF"} /></Info>
        <Info label="Webhook subscribed"><Badge ok={page.webhookSubscribed} text={page.webhookSubscribed ? "Subscribed" : "Chưa subscribed"} /></Info>
        <Info label="Last health check">{page.lastHealthCheckAt ? new Date(page.lastHealthCheckAt).toLocaleString("vi-VN") : "Chưa chạy"}</Info>
        <Info label="Last error">{page.lastError ?? "Không có"}</Info>
        <Info label="Subscribed fields">
          {subscribedFields.length > 0 ? subscribedFields.join(", ") : "Chưa có dữ liệu"}
        </Info>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Checklist setup</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <Check ok={Boolean(page.id)} text="Facebook Login OK" />
          <Check ok={page.status !== "TOKEN_EXPIRED" && page.status !== "DISCONNECTED"} text="Page token OK" />
          <Check ok={page.webhookSubscribed} text="Webhook subscribed" />
          <Check
            ok={requiredFields.length > 0 && requiredFields.every((field: string) => subscribedFields.includes(field))}
            text="Subscribed đủ messages/feed"
          />
          <Check ok={page.botEnabled} text="Bot enabled" />
          <Check ok={logs.length > 0} text="Gửi tin nhắn test vào Fanpage" />
          <Check ok={logs.length > 0} text="Kiểm tra log webhook" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">Recent webhook logs</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString("vi-VN")}</td>
                <td className="px-3 py-2">{l.eventType ?? "unknown"}</td>
                <td className="px-3 py-2">{l.processingStatus}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{l.errorMessage ?? ""}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Chưa có webhook log.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 text-xs font-semibold uppercase text-gray-500">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return <div className={ok ? "text-emerald-700" : "text-gray-500"}>{ok ? "OK" : "Pending"} - {text}</div>;
}
