"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type Page = { pageId: string; pageName: string };

type Offer = {
  id: string;
  pageId: string | null;
  facebookPage?: Page | null;
  product: string;
  title: string;
  description: string | null;
  priceText: string | null;
  offerText: string;
  triggerTag: string | null;
  customerStage: string | null;
  priority: number;
  isActive: boolean;
};

const EMPTY = {
  pageId: "",
  product: "",
  title: "",
  offerText: "",
  priceText: "",
  triggerTag: "",
  customerStage: "",
  description: "",
  priority: 0,
  isActive: true,
};

export function OffersClient() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [offerData, pageData] = await Promise.all([
        apiGet<Offer[]>("/api/offers"),
        apiGet<Page[]>("/api/facebook-pages"),
      ]);
      setOffers(offerData);
      setPages(pageData);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(o: Offer) {
    setEditingId(o.id);
    setForm({
      pageId: o.pageId ?? "",
      product: o.product,
      title: o.title,
      offerText: o.offerText,
      priceText: o.priceText ?? "",
      triggerTag: o.triggerTag ?? "",
      customerStage: o.customerStage ?? "",
      description: o.description ?? "",
      priority: o.priority,
      isActive: o.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setErr(null);
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        ...form,
        pageId: form.pageId || null,
        customerStage: form.customerStage || null,
      };
      if (editingId) await apiSend(`/api/offers/${editingId}`, "PATCH", payload);
      else await apiSend("/api/offers", "POST", payload);
      reset();
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(o: Offer) {
    await apiSend(`/api/offers/${o.id}`, "PATCH", { isActive: !o.isActive });
    await load();
  }

  async function remove(o: Offer) {
    if (!confirm(`Xóa offer "${o.title}"?`)) return;
    await apiSend(`/api/offers/${o.id}`, "DELETE");
    await load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Offers</h1>
      <p className="mb-4 text-sm text-gray-500">
        Offer của Space hiện tại. Có thể áp dụng cho toàn Space hoặc riêng một Fanpage.
      </p>

      {err && <div className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <div className="mb-6 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">{editingId ? "Sửa offer" : "Thêm offer mới"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Áp dụng">
            <select className="inp" value={form.pageId} onChange={(e) => setForm({ ...form, pageId: e.target.value })}>
              <option value="">Toàn Space</option>
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
              ))}
            </select>
          </Field>
          <Field label="Sản phẩm/dịch vụ *">
            <input className="inp" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          </Field>
          <Field label="Title *">
            <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Price text">
            <input className="inp" value={form.priceText} onChange={(e) => setForm({ ...form, priceText: e.target.value })} placeholder="320K / freeship" />
          </Field>
          <Field label="Offer text * (nội dung bot gửi)">
            <textarea className="inp" rows={2} value={form.offerText} onChange={(e) => setForm({ ...form, offerText: e.target.value })} />
          </Field>
          <Field label="Mô tả nội bộ">
            <textarea className="inp" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Trigger tag">
            <input className="inp" value={form.triggerTag} onChange={(e) => setForm({ ...form, triggerTag: e.target.value })} placeholder="hoi_combo" />
          </Field>
          <Field label="Customer stage">
            <select className="inp" value={form.customerStage} onChange={(e) => setForm({ ...form, customerStage: e.target.value })}>
              <option value="">(bất kỳ)</option>
              {["COLD", "WARM", "HOT", "CUSTOMER", "LOST"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <input type="number" className="inp" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </Field>
          <Field label="Trạng thái">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Đang bật
            </label>
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {editingId ? "Cập nhật" : "Thêm offer"}
          </button>
          {editingId && (
            <button onClick={reset} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">Hủy</button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Phạm vi / Sản phẩm</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Trigger</th>
              <th className="px-3 py-2">Prio</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">Chưa có offer. Hãy thêm hoặc chạy seed.</td>
              </tr>
            )}
            {offers.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{o.pageId ? o.facebookPage?.pageName ?? o.pageId : "Toàn Space"}</div>
                  <div className="text-xs text-gray-500">{o.product}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{o.title}</div>
                  <div className="text-xs text-gray-500">{o.offerText}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {o.triggerTag && <div>tag: {o.triggerTag}</div>}
                  {o.customerStage && <div>stage: {o.customerStage}</div>}
                </td>
                <td className="px-3 py-2">{o.priority}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleActive(o)}
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${o.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}
                  >
                    {o.isActive ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => edit(o)} className="mr-2 text-xs text-sky-600 hover:underline">Sửa</button>
                  <button onClick={() => remove(o)} className="text-xs text-rose-600 hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .inp {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
          padding: 0.375rem 0.5rem;
          font-size: 0.875rem;
        }
        .inp:focus {
          outline: none;
          border-color: #e11d6b;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  );
}
