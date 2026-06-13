"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type Cust = {
  id: string;
  email: string | null;
  emailConsent: boolean;
  emailStatus: string;
  unsubscribedAt: string | null;
};
type Named = { id: string; name: string };
type Log = {
  id: string;
  subject: string;
  status: string;
  toEmail: string;
  createdAt: string;
  errorMessage: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  SUBSCRIBED: "bg-emerald-100 text-emerald-700",
  UNSUBSCRIBED: "bg-gray-200 text-gray-600",
  BOUNCED: "bg-amber-100 text-amber-800",
  COMPLAINED: "bg-orange-100 text-orange-800",
};

export function CustomerEmailPanel({
  customer,
  emailEnabled,
  onChange,
}: {
  customer: Cust;
  emailEnabled: boolean;
  onChange: () => void;
}) {
  const [email, setEmail] = useState(customer.email ?? "");
  const [sequences, setSequences] = useState<Named[]>([]);
  const [templates, setTemplates] = useState<Named[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [seqId, setSeqId] = useState("");
  const [tplId, setTplId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setEmail(customer.email ?? "");
  }, [customer.id, customer.email]);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await apiGet<Log[]>(`/api/customers/${customer.id}/emails`));
    } catch {
      /* ignore */
    }
  }, [customer.id]);

  useEffect(() => {
    loadLogs();
    if (emailEnabled) {
      apiGet<any[]>("/api/email/sequences")
        .then((s) => setSequences(s.map((x) => ({ id: x.id, name: x.name }))))
        .catch(() => {});
      apiGet<Named[]>("/api/email/templates").then(setTemplates).catch(() => {});
    }
  }, [customer.id, emailEnabled, loadLogs]);

  async function saveEmail() {
    setErr(null);
    setMsg(null);
    try {
      await apiSend(`/api/customers/${customer.id}`, "PATCH", { email });
      setMsg("Đã lưu email");
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function toggleConsent(v: boolean) {
    setErr(null);
    setMsg(null);
    try {
      await apiSend(`/api/customers/${customer.id}`, "PATCH", { emailConsent: v });
      onChange();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function enroll() {
    if (!seqId) return;
    setErr(null);
    setMsg(null);
    try {
      const r = await apiSend<any>(`/api/email/sequences/${seqId}/enroll`, "POST", {
        customerId: customer.id,
      });
      setMsg(r.enrolled ? "Đã enroll vào sequence" : "Không enroll: " + (r.reason ?? ""));
      await loadLogs();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function sendOne() {
    if (!tplId) return;
    setErr(null);
    setMsg(null);
    try {
      await apiSend(`/api/customers/${customer.id}/send-email`, "POST", { templateId: tplId });
      setMsg("Đã gửi email");
      await loadLogs();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="border-t pt-3">
      <label className="mb-1 block text-xs font-semibold text-gray-500">Email</label>

      {err && <div className="mb-2 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{err}</div>}
      {msg && <div className="mb-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{msg}</div>}

      <div className="mb-2 flex gap-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@khach.com"
          className="flex-1 rounded border px-2 py-1 text-sm"
        />
        <button onClick={saveEmail} className="rounded bg-gray-200 px-2 text-sm hover:bg-gray-300">
          Lưu
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customer.emailConsent}
            onChange={(e) => toggleConsent(e.target.checked)}
          />
          Đồng ý nhận email
        </label>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[customer.emailStatus] ?? "bg-gray-100 text-gray-600"}`}>
          {customer.emailStatus}
        </span>
      </div>

      {!emailEnabled && (
        <p className="mb-2 text-[11px] text-amber-700">
          Gửi email đang tắt (thiếu RESEND_API_KEY). Vẫn lưu được email/consent.
        </p>
      )}

      {emailEnabled && (
        <div className="mb-2 space-y-2">
          <div className="flex gap-1">
            <select value={seqId} onChange={(e) => setSeqId(e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm">
              <option value="">— Chọn sequence —</option>
              {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={enroll} className="rounded bg-brand px-2 text-xs font-semibold text-white hover:bg-brand-dark">
              Enroll
            </button>
          </div>
          <div className="flex gap-1">
            <select value={tplId} onChange={(e) => setTplId(e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm">
              <option value="">— Gửi template ngay —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={sendOne} className="rounded bg-violet-600 px-2 text-xs font-semibold text-white hover:bg-violet-700">
              Gửi
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-xs font-semibold text-gray-500">Lịch sử email</div>
          <div className="max-h-40 space-y-1 overflow-auto">
            {logs.map((l) => (
              <div key={l.id} className="rounded border px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="truncate">{l.subject}</span>
                  <span className={`ml-1 rounded px-1 ${l.status === "FAILED" ? "text-rose-600" : "text-gray-500"}`}>{l.status}</span>
                </div>
                <div className="text-gray-400">{new Date(l.createdAt).toLocaleString("vi-VN")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
