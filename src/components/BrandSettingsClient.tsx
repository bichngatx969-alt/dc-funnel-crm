"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

const INDUSTRIES = ["FASHION", "STUDIO", "SALON", "WEDDING", "SERVICE", "OTHER"];

export function BrandSettingsClient() {
  const [form, setForm] = useState<any>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/api/brand-profile").then(setForm).catch((e: any) => setNotice(e.message));
  }, []);

  async function save() {
    setNotice(null);
    try {
      setForm(await apiSend("/api/brand-profile", "PATCH", form));
      setNotice("Đã lưu cấu hình brand.");
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  if (!form) return <div className="p-6 text-sm text-gray-500">Đang tải cấu hình brand...</div>;

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Cấu hình brand</h1>
      <p className="mb-4 text-sm text-gray-500">
        Instance CRM này chỉ phục vụ một brand. Cấu hình ở đây là ngữ cảnh mặc định cho dashboard, inbox, flow, offer và email.
      </p>
      {notice && <div className="mb-3 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">{notice}</div>}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Brand name">
            <input className="inp" value={form.brandName ?? ""} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </Field>
          <Field label="Ngành">
            <select className="inp" value={form.industry ?? "OTHER"} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Logo URL">
            <input className="inp" value={form.logoUrl ?? ""} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          </Field>
          <Field label="Màu thương hiệu">
            <div className="flex gap-2">
              <input type="color" value={form.primaryColor ?? "#e11d6b"} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-9 w-12 rounded border" />
              <input className="inp" value={form.primaryColor ?? ""} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
            </div>
          </Field>
          <Field label="Mô tả thương hiệu">
            <textarea className="inp" rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Tone of voice">
            <textarea className="inp" rows={3} value={form.defaultTone ?? ""} onChange={(e) => setForm({ ...form, defaultTone: e.target.value })} />
          </Field>
          <Field label="Sản phẩm/dịch vụ chính">
            <textarea className="inp" rows={3} value={form.productServices ?? ""} onChange={(e) => setForm({ ...form, productServices: e.target.value })} />
          </Field>
          <Field label="Chính sách bán hàng cơ bản">
            <textarea className="inp" rows={3} value={form.salesPolicy ?? ""} onChange={(e) => setForm({ ...form, salesPolicy: e.target.value })} />
          </Field>
          <Field label="Thông tin liên hệ">
            <textarea className="inp" rows={3} value={form.contactInfo ?? ""} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          </Field>
        </div>
        <button onClick={save} className="mt-4 rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Lưu cấu hình
        </button>
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
