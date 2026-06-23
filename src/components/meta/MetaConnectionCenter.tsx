"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/client";
import { Icon } from "@/components/layout/icons";

type PermissionStatus = "OK" | "MISSING" | "UNKNOWN";
type OverallStatus = "CONNECTED" | "PARTIAL" | "NOT_CONNECTED" | "ERROR";

type MetaConnectionStatus = {
  overallStatus: OverallStatus;
  facebookApp: { configured: boolean; appId: boolean; appSecret: boolean; redirectUri: boolean };
  userToken: { exists: boolean; valid: boolean; expiresAt: string | null; scopes: string[]; status: string | null };
  pages: {
    connectedCount: number;
    items: {
      id: string;
      name: string;
      status: string;
      hasPageToken: boolean;
      messengerReady: boolean;
      commentReady: boolean;
      subscribedFields: string[];
      lastError: string | null;
    }[];
  };
  webhooks: { messenger: string; comments: string; callbackReachable: boolean };
  business: { connected: boolean; items: { id: string; name: string; verificationStatus: string | null }[] };
  adAccounts: {
    connected: boolean;
    items: { id: string; accountId: string | null; name: string; status: number | null; currency: string | null; timezone: string | null }[];
    error?: string;
  };
  permissions: Record<string, PermissionStatus>;
  blockers: { code: string; title: string; description: string; action: string }[];
  nextActions: string[];
};

const PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_manage_engagement",
  "ads_read",
  "business_management",
];

export function MetaConnectionCenter() {
  const [status, setStatus] = useState<MetaConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await apiGet<MetaConnectionStatus>("/api/meta/connection-status"));
    } catch (err: any) {
      setError(err?.message ?? "Không tải được trạng thái Meta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const adsAccountId = useMemo(() => status?.adAccounts.items[0]?.accountId ?? status?.adAccounts.items[0]?.id ?? null, [status]);

  async function runAction(name: string, fn: () => Promise<Response>) {
    setBusy(name);
    setMessage(null);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || json?.code || `Lỗi ${res.status}`);
      }
      setMessage("Đã chạy kiểm tra. Trạng thái mới đã được cập nhật.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Không chạy được hành động.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <StateCard tone="bad" title="Không tải được diagnostics" value={error ?? "Unknown error"} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="dc-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={status.overallStatus} />
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                Token {status.userToken.exists ? (status.userToken.valid ? "OK" : "lỗi") : "chưa có"}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-gray-900">Meta Connection Center</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Kiểm tra Facebook Page, Messenger, Comment, Business Manager, Ad Account và quyền Ads. Màn này chỉ đọc
              trạng thái, không sửa campaign hoặc chạy quảng cáo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/integrations/facebook/login" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Reconnect Facebook
            </a>
            <button
              type="button"
              onClick={() => runAction("pages", () => fetch("/api/integrations/facebook/pages?available=true"))}
              disabled={busy !== null}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "pages" ? "Đang sync..." : "Sync Pages"}
            </button>
            <button
              type="button"
              onClick={() => runAction("adAccounts", () => fetch("/api/meta/ad-accounts/sync", { method: "POST" }))}
              disabled={busy !== null}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "adAccounts" ? "Đang sync..." : "Sync Ad Accounts"}
            </button>
            <button
              type="button"
              onClick={() =>
                runAction("insights", () =>
                  fetch("/api/meta/ads/insights/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ level: "campaign", adAccountId: adsAccountId }),
                  })
                )
              }
              disabled={busy !== null || !adsAccountId}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "insights" ? "Đang đọc..." : "Sync Ads Insights"}
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-400"
              title="Webhook test dùng payload Meta thật hoặc health-check từng Fanpage ở trang Fanpage / Kênh."
            >
              Test Webhook
            </button>
          </div>
        </div>
        {message && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <StateCard tone={status.facebookApp.configured ? "good" : "bad"} title="Meta App" value={status.facebookApp.configured ? "Configured" : "Missing env"} />
        <StateCard tone={status.pages.connectedCount > 0 ? "good" : "warn"} title="Facebook Page" value={`${status.pages.connectedCount} Page`} />
        <StateCard tone={status.webhooks.messenger === "OK" ? "good" : "warn"} title="Messenger" value={status.webhooks.messenger} />
        <StateCard tone={status.adAccounts.connected ? "good" : "warn"} title="Ads Manager" value={status.adAccounts.connected ? `${status.adAccounts.items.length} account` : "Chưa sẵn sàng"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Facebook Page">
          {status.pages.items.length === 0 ? (
            <EmptyLine text="Chưa có Fanpage trong workspace này." />
          ) : (
            <div className="space-y-3">
              {status.pages.items.map((page) => (
                <div key={page.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{page.name}</p>
                      <p className="text-xs text-gray-400">{page.id}</p>
                    </div>
                    <StatusText ok={page.status === "CONNECTED"} text={page.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <CheckRow ok={page.hasPageToken} label="Page token" />
                    <CheckRow ok={page.messengerReady} label="Messenger ready" />
                    <CheckRow ok={page.commentReady} label="Comment ready" />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Subscribed fields: {page.subscribedFields.length > 0 ? page.subscribedFields.join(", ") : "Chưa có dữ liệu health-check"}
                  </p>
                  {page.lastError && <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700">{page.lastError}</p>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Permissions">
          <div className="space-y-2">
            {PERMISSIONS.map((permission) => (
              <div key={permission} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">{permission}</span>
                <PermissionPill status={status.permissions[permission] ?? "UNKNOWN"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Meta Business">
          {status.business.items.length === 0 ? (
            <EmptyLine text="Chưa kết nối Business Manager hoặc thiếu quyền business_management." />
          ) : (
            <div className="space-y-2">
              {status.business.items.map((business) => (
                <div key={business.id} className="rounded-xl border border-gray-100 px-3 py-2">
                  <p className="font-semibold text-gray-900">{business.name}</p>
                  <p className="text-xs text-gray-400">
                    {business.id} · {business.verificationStatus ?? "verification unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Ad Accounts">
          {status.adAccounts.items.length === 0 ? (
            <EmptyLine text={status.adAccounts.error ?? "Chưa có Ad Account. Thường do thiếu ads_read hoặc user chưa có quyền Ads trong Business."} />
          ) : (
            <div className="space-y-2">
              {status.adAccounts.items.map((account) => (
                <div key={account.id} className="rounded-xl border border-gray-100 px-3 py-2">
                  <p className="font-semibold text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-400">
                    {account.id} · {account.currency ?? "currency?"} · status {account.status ?? "unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Diagnostics / Blockers">
          {status.blockers.length === 0 ? (
            <EmptyLine text="Không có blocker lớn. Nếu Ads vẫn không có số liệu, kiểm tra ngày/campaign có spend." />
          ) : (
            <div className="space-y-3">
              {status.blockers.map((blocker) => (
                <div key={blocker.code} className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-900">{blocker.title}</p>
                  <p className="mt-1 text-sm text-amber-800">{blocker.description}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">Hành động: {blocker.action}</p>
                  <p className="mt-1 text-[11px] text-amber-600">{blocker.code}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Next actions">
          {status.nextActions.length === 0 ? (
            <EmptyLine text="Không có việc cần làm ngay." />
          ) : (
            <ul className="space-y-2">
              {status.nextActions.map((item) => (
                <li key={item} className="flex gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <Icon name="tasks" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dc-card rounded-2xl p-4">
      <h3 className="mb-3 text-base font-bold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">{text}</p>;
}

function StateCard({ tone, title, value }: { tone: "good" | "warn" | "bad"; title: string; value: string }) {
  const cls =
    tone === "good"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-rose-100 bg-rose-50 text-rose-700";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{title}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: OverallStatus }) {
  const cls =
    status === "CONNECTED"
      ? "bg-emerald-100 text-emerald-700"
      : status === "PARTIAL"
        ? "bg-amber-100 text-amber-800"
        : status === "ERROR"
          ? "bg-rose-100 text-rose-700"
          : "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{status}</span>;
}

function StatusText({ ok, text }: { ok: boolean; text: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{text}</span>;
}

function PermissionPill({ status }: { status: PermissionStatus }) {
  const cls =
    status === "OK"
      ? "bg-emerald-100 text-emerald-700"
      : status === "MISSING"
        ? "bg-rose-100 text-rose-700"
        : "bg-gray-100 text-gray-500";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{status}</span>;
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`rounded-lg px-2 py-1 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
      {ok ? "OK" : "Missing"} · {label}
    </div>
  );
}
