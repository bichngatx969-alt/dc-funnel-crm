"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type AvailablePage = {
  pageId: string;
  pageName: string;
  pageUsername?: string | null;
  pagePictureUrl?: string | null;
  connected: boolean;
};

export function FacebookPagesClient() {
  const [pages, setPages] = useState<AvailablePage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyPageId, setBusyPageId] = useState<string | null>(null);

  async function load() {
    const data = await apiGet<{ availablePages: AvailablePage[]; error?: string }>("/api/integrations/facebook/pages");
    setPages(data.availablePages);
    setError(data.error ?? null);
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message));
  }, []);

  async function connect(pageId: string) {
    setBusyPageId(pageId);
    setError(null);
    try {
      await apiSend("/api/integrations/facebook/pages/connect", "POST", { pageId });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyPageId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">Chọn Fanpage</h1>
          <p className="text-sm text-gray-500">Danh sách Page lấy từ Facebook Login gần nhất.</p>
        </div>
        <Link href="/settings/integrations/facebook" className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50">Quay lại</Link>
      </div>

      {error && (
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error || "Không lấy được danh sách Page. Vui lòng kiểm tra quyền pages_show_list và role của app."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <div key={p.pageId} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              {p.pagePictureUrl ? <img src={p.pagePictureUrl} alt="" className="h-12 w-12 rounded-full" /> : <div className="h-12 w-12 rounded-full bg-gray-200" />}
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.pageName}</div>
                <div className="font-mono text-xs text-gray-500">{p.pageId}</div>
              </div>
            </div>
            <button
              onClick={() => connect(p.pageId)}
              disabled={busyPageId === p.pageId}
              className="w-full rounded bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busyPageId === p.pageId ? "Đang kết nối..." : p.connected ? "Reconnect" : "Connect"}
            </button>
          </div>
        ))}
        {pages.length === 0 && !error && (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-500">
            Chưa có Page từ Facebook. Hãy bấm Kết nối Facebook và cấp đủ quyền.
          </div>
        )}
      </div>
    </div>
  );
}
