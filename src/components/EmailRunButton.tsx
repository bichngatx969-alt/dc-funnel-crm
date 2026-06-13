"use client";

import { useState } from "react";

export function EmailRunButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cron/email-automation", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Lỗi");
      setMsg(`Đã xử lý ${j.data.processed} enrollment · gửi ${j.data.sent} · lỗi ${j.data.failed}`);
    } catch (e: any) {
      setMsg("Lỗi: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Đang chạy..." : "Chạy automation ngay"}
      </button>
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  );
}
