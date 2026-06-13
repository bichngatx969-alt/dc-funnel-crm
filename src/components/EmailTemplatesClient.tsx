"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type Template = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
};

const EMPTY = {
  name: "",
  subject: "",
  preheader: "",
  bodyHtml: "",
  bodyText: "",
  isActive: true,
};

const VARS = [
  "{{customer.name}}",
  "{{customer.email}}",
  "{{customer.phone}}",
  "{{customer.currentStage}}",
  "{{offer.title}}",
  "{{offer.offerText}}",
  "{{unsubscribeUrl}}",
  "{{appName}}",
];

export function EmailTemplatesClient({ emailEnabled }: { emailEnabled: boolean }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setTemplates(await apiGet<Template[]>("/api/email/templates"));
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function edit(t: Template) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      subject: t.subject,
      preheader: t.preheader ?? "",
      bodyHtml: t.bodyHtml,
      bodyText: t.bodyText ?? "",
      isActive: t.isActive,
    });
    setPreviewHtml(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setErr(null);
    setPreviewHtml(null);
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      if (editingId) await apiSend(`/api/email/templates/${editingId}`, "PUT", form);
      else await apiSend("/api/email/templates", "POST", form);
      reset();
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Xóa template "${t.name}"?`)) return;
    try {
      await apiSend(`/api/email/templates/${t.id}`, "DELETE");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function preview() {
    setErr(null);
    try {
      const r = await apiSend<{ subject: string; html: string }>("/api/email/preview", "POST", {
        subject: form.subject,
        bodyHtml: form.bodyHtml,
      });
      setPreviewHtml(`<p style="font-family:sans-serif"><b>Subject:</b> ${r.subject}</p><hr/>${r.html}`);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function sendTest() {
    setErr(null);
    setNotice(null);
    try {
      const r = await apiSend<{ to: string }>("/api/email/send-test", "POST", {
        templateId: editingId || undefined,
        subject: editingId ? undefined : form.subject,
        html: editingId ? undefined : form.bodyHtml,
      });
      setNotice(`Đã gửi test tới ${r.to}`);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Email Templates</h1>
      <p className="mb-4 text-sm text-gray-500">
        Biến khả dụng: {VARS.map((v) => <code key={v} className="mr-2 rounded bg-gray-100 px-1">{v}</code>)}
      </p>

      {err && <div className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      {notice && <div className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">{editingId ? "Sửa template" : "Tạo template"}</h2>
          <div className="space-y-3">
            <input className="inp" placeholder="Tên template *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="inp" placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <input className="inp" placeholder="Preheader (tùy chọn)" value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} />
            <textarea className="inp font-mono text-xs" rows={8} placeholder="Body HTML *" value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} />
            <textarea className="inp" rows={3} placeholder="Body text (tùy chọn)" value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang bật
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={save} disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {editingId ? "Cập nhật" : "Tạo"}
            </button>
            <button onClick={preview} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">Preview</button>
            <button onClick={sendTest} disabled={!emailEnabled} title={emailEnabled ? "" : "Email đang tắt"} className="rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              Gửi test
            </button>
            {editingId && <button onClick={reset} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">Hủy</button>}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Preview</h2>
          {previewHtml ? (
            <iframe title="preview" className="h-[420px] w-full rounded border" srcDoc={previewHtml} />
          ) : (
            <p className="text-sm text-gray-400">Bấm "Preview" để xem email với dữ liệu mẫu.</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Chưa có template. Tạo mới hoặc chạy seed.</td></tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.subject}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                    {t.isActive ? "ON" : "OFF"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => edit(t)} className="mr-2 text-xs text-sky-600 hover:underline">Sửa</button>
                  <button onClick={() => remove(t)} className="text-xs text-rose-600 hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .inp { width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.4rem 0.55rem; font-size: 0.875rem; }
        .inp:focus { outline: none; border-color: #e11d6b; }
      `}</style>
    </div>
  );
}
