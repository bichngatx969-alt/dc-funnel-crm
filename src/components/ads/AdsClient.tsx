"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";

type MetaConnectionStatus = {
  overallStatus: "CONNECTED" | "PARTIAL" | "NOT_CONNECTED" | "ERROR";
  permissions: Record<string, "OK" | "MISSING" | "UNKNOWN">;
  blockers: { code: string; title: string; description: string; action: string }[];
  adAccounts: {
    connected: boolean;
    items: { id: string; accountId: string | null; name: string; currency: string | null; status: number | null }[];
  };
};

type InsightRow = {
  id: string;
  name: string;
  level: "campaign" | "adset" | "ad";
  impressions: number;
  clicks: number;
  spendVnd: number;
  cpm: number;
  ctr: number;
  messages: number;
};

export function AdsClient({ mode = "overview" }: { mode?: "overview" | "insights" }) {
  const [status, setStatus] = useState<MetaConnectionStatus | null>(null);
  const [date, setDate] = useState(todayVietnamDate());
  const [level, setLevel] = useState<"campaign" | "adset" | "ad">("campaign");
  const [adAccountId, setAdAccountId] = useState("");
  const [items, setItems] = useState<InsightRow[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MetaConnectionStatus>("/api/meta/connection-status");
      setStatus(data);
      const firstAccount = data.adAccounts.items[0];
      if (firstAccount && !adAccountId) setAdAccountId(firstAccount.accountId ?? firstAccount.id);
    } catch (err: any) {
      setError(err?.message ?? "Không tải được trạng thái Meta Ads.");
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  const canLoadInsights = useMemo(
    () => status?.permissions.ads_read === "OK" && status.adAccounts.items.length > 0 && Boolean(adAccountId),
    [status, adAccountId]
  );

  const loadInsights = useCallback(async () => {
    if (!canLoadInsights) return;
    setInsightsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date, level, adAccountId });
      const res = await fetch(`/api/meta/ads/insights?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || json?.code || `Lỗi ${res.status}`);
      setItems(json.data?.items ?? []);
      setNote(json.data?.note ?? "");
    } catch (err: any) {
      setItems([]);
      setNote("");
      setError(err?.message ?? "Không đọc được Ads Insights.");
    } finally {
      setInsightsLoading(false);
    }
  }, [adAccountId, canLoadInsights, date, level]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!status) {
    return <ConnectionEmpty title="Không tải được Meta Ads" description={error ?? "Hãy thử lại sau."} />;
  }

  const adsReadMissing = status.permissions.ads_read !== "OK";
  const noAccount = status.permissions.ads_read === "OK" && status.adAccounts.items.length === 0;

  if (adsReadMissing || noAccount) {
    const blocker = status.blockers.find((item) => item.code === "MISSING_ADS_READ" || item.code === "NO_AD_ACCOUNT" || item.code === "AD_ACCOUNT_GRAPH_ERROR");
    return (
      <div className="space-y-4">
        <ConnectionEmpty
          title={adsReadMissing ? "Thiếu quyền ads_read" : "Chưa có Ad Account"}
          description={
            blocker?.description ??
            "DCOS vẫn phân tích inbox/sale/catalog, nhưng chưa đánh giá được nguồn quảng cáo vì Meta Ads chưa sẵn sàng."
          }
        />
        <div className="dc-card rounded-2xl p-4">
          <h3 className="font-bold text-gray-900">Cần làm tiếp</h3>
          <p className="mt-1 text-sm text-gray-500">{blocker?.action ?? "Mở Meta Connection Center để xem diagnostics chi tiết."}</p>
          <Link href="/apps/meta" className="mt-3 inline-flex rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Tới Meta Connection Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="dc-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">ADS_READY</span>
            <h2 className="mt-2 text-lg font-bold text-gray-900">Meta Ads Insights</h2>
            <p className="mt-1 text-sm text-gray-500">Đọc số liệu live từ Meta Graph theo workspace hiện tại. Không chỉnh campaign/ads.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              {status.adAccounts.items.map((account) => (
                <option key={account.id} value={account.accountId ?? account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <select value={level} onChange={(e) => setLevel(e.target.value as any)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="campaign">Campaign</option>
              <option value="adset">Ad set</option>
              <option value="ad">Ad</option>
            </select>
            <button type="button" onClick={() => void loadInsights()} disabled={insightsLoading} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {insightsLoading ? "Đang tải..." : "Tải số liệu"}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {note && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700">{note}</p>}

      <div className="dc-card overflow-hidden rounded-2xl">
        <div className="border-b border-gray-100 px-4 py-3 font-bold text-gray-900">
          {mode === "insights" ? "Ads insights" : "Campaign overview"}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3 text-right">Messages</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    {insightsLoading ? "Đang tải..." : "Chưa có số liệu cho ngày/level này."}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatVnd(item.spendVnd)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.impressions.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.clicks.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.messages.toLocaleString("vi-VN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConnectionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="dc-card flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-400">
        <Icon name="integrations" className="h-7 w-7" />
      </span>
      <h3 className="text-[15px] font-bold text-gray-800">{title}</h3>
      <p className="max-w-[34rem] text-[13px] leading-6 text-gray-500">
        {description} DCOS vẫn phân tích inbox/sale/catalog, nhưng chưa đánh giá được nguồn quảng cáo.
      </p>
      <Link href="/apps/meta" className="mt-1 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark">
        Tới Meta Connection Center
      </Link>
    </div>
  );
}

function todayVietnamDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
