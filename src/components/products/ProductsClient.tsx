"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";
import { ProductAuditPanel, type ProductAudit } from "./ProductAuditPanel";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  costVnd: number | null;
  marginVnd: number | null;
  description: string | null;
  targetSegment: string | null;
  painPointsJson: unknown;
  benefitsJson: unknown;
  faqsJson: unknown;
  objectionsJson: unknown;
  offerIdeasJson: unknown;
  salesScript: string | null;
  isActive: boolean;
  aiAuditScore: number | null;
  aiAuditedAt: string | null;
  aiAuditJson: ProductAudit | null;
  updatedAt: string;
};

type ProductForm = {
  name: string;
  sku: string;
  priceVnd: string;
  costVnd: string;
  description: string;
  targetSegment: string;
  painPoints: string;
  benefits: string;
  faqs: string;
  objections: string;
  offerIdeas: string;
  salesScript: string;
  isActive: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  sku: "",
  priceVnd: "",
  costVnd: "",
  description: "",
  targetSegment: "",
  painPoints: "",
  benefits: "",
  faqs: "",
  objections: "",
  offerIdeas: "",
  salesScript: "",
  isActive: true,
};

function scoreChip(score: number | null) {
  if (score == null) return <span className="text-[11px] text-gray-300">chưa kiểm tra</span>;
  const tone = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>AI {score}%</span>;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function listText(value: unknown): string {
  return asList(value).join("\n");
}

function parseMoney(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formFromProduct(product: Product): ProductForm {
  return {
    name: product.name ?? "",
    sku: product.sku ?? "",
    priceVnd: product.priceVnd ? String(product.priceVnd) : "",
    costVnd: product.costVnd ? String(product.costVnd) : "",
    description: product.description ?? "",
    targetSegment: product.targetSegment ?? "",
    painPoints: listText(product.painPointsJson),
    benefits: listText(product.benefitsJson),
    faqs: listText(product.faqsJson),
    objections: listText(product.objectionsJson),
    offerIdeas: listText(product.offerIdeasJson),
    salesScript: product.salesScript ?? "",
    isActive: product.isActive,
  };
}

function formPayload(form: ProductForm) {
  return {
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    priceVnd: parseMoney(form.priceVnd),
    costVnd: form.costVnd.trim() ? parseMoney(form.costVnd) : null,
    description: form.description.trim() || null,
    targetSegment: form.targetSegment.trim() || null,
    painPoints: form.painPoints,
    benefits: form.benefits,
    faqs: form.faqs,
    objections: form.objections,
    offerIdeas: form.offerIdeas,
    salesScript: form.salesScript.trim() || null,
    isActive: form.isActive,
  };
}

function ListPreview({ items }: { items: string[] }) {
  if (!items.length) return <span className="italic text-gray-300">Chưa có</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 8).map((item) => (
        <span key={item} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          {item}
        </span>
      ))}
    </div>
  );
}

function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[10.5px] text-gray-400">{hint}</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 ${props.className ?? ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 ${props.className ?? ""}`}
    />
  );
}

export function ProductsClient({ aiEnabled }: { aiEnabled: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<ProductAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [applyingAudit, setApplyingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("pageSize", "100");
      const d = await apiGet<{ items: Product[] }>(`/api/products?${params.toString()}`);
      setItems(d.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được sản phẩm/dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((p) => p.id === selectedId) ?? null;
  const activeCount = useMemo(() => items.filter((p) => p.isActive).length, [items]);
  const avgScore = useMemo(() => {
    const scored = items.filter((p) => typeof p.aiAuditScore === "number");
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, p) => sum + (p.aiAuditScore ?? 0), 0) / scored.length);
  }, [items]);

  async function selectProduct(id: string) {
    setSelectedId(id);
    setAudit(null);
    setError(null);
    setNotice(null);
    try {
      const d = await apiGet<{ product: Product; audit: ProductAudit | null }>(`/api/products/${id}/ai-audit`);
      setAudit(d.audit ?? null);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...d.product } : p)));
    } catch (e: any) {
      setAudit(null);
      setError(e?.message ?? "Không tải được chi tiết sản phẩm.");
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm(formFromProduct(product));
    setShowForm(true);
    setNotice(null);
  }

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProduct() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = formPayload(form);
      const res = editingId
        ? await apiSend<{ product: Product }>(`/api/products/${editingId}`, "PATCH", payload)
        : await apiSend<{ product: Product }>(`/api/products`, "POST", payload);
      setItems((prev) => {
        const exists = prev.some((p) => p.id === res.product.id);
        return exists ? prev.map((p) => (p.id === res.product.id ? res.product : p)) : [res.product, ...prev];
      });
      setSelectedId(res.product.id);
      setAudit((res.product.aiAuditJson as ProductAudit | null) ?? null);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setNotice(editingId ? "Đã cập nhật sản phẩm/dịch vụ." : "Đã thêm sản phẩm/dịch vụ.");
    } catch (e: any) {
      setError(e?.message ?? "Không lưu được sản phẩm/dịch vụ.");
    } finally {
      setSaving(false);
    }
  }

  async function runAudit() {
    if (!selectedId) return;
    setAuditing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiSend<{ aiConfigured: boolean; status: string; product: Product; audit: ProductAudit }>(
        `/api/products/${selectedId}/ai-audit`,
        "POST"
      );
      setAudit({ ...res.audit, aiConfigured: res.aiConfigured, fallback: !res.aiConfigured || res.status !== "SUCCESS" });
      setItems((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...res.product } : p)));
      if (!res.aiConfigured) setNotice("Đang dùng chế độ phân tích cơ bản vì chưa cấu hình AI model.");
    } catch (e: any) {
      setError(e?.message ?? "Không kiểm tra được sản phẩm/dịch vụ.");
    } finally {
      setAuditing(false);
    }
  }

  async function applyAuditToEmptyFields() {
    if (!selected || !audit) return;
    const patch: Record<string, unknown> = {};
    if (!selected.targetSegment && audit.targetSegments?.length) patch.targetSegment = audit.targetSegments[0];
    if (!asList(selected.painPointsJson).length && audit.painPoints?.length) patch.painPoints = audit.painPoints.join("\n");
    if (!asList(selected.benefitsJson).length && audit.benefits?.length) patch.benefits = audit.benefits.join("\n");
    if (!asList(selected.faqsJson).length && audit.faqSuggestions?.length) patch.faqs = audit.faqSuggestions.join("\n");
    if (!asList(selected.objectionsJson).length && audit.objectionHandling?.length) patch.objections = audit.objectionHandling.join("\n");
    if (!asList(selected.offerIdeasJson).length && audit.offerIdeas?.length) patch.offerIdeas = audit.offerIdeas.join("\n");
    if (!selected.salesScript && audit.salesScriptSuggestions?.length) patch.salesScript = audit.salesScriptSuggestions[0];
    if (!Object.keys(patch).length) {
      setNotice("Không có field trống để lưu thêm. Dữ liệu sale đã nhập được giữ nguyên.");
      return;
    }
    setApplyingAudit(true);
    setError(null);
    try {
      const res = await apiSend<{ product: Product }>(`/api/products/${selected.id}`, "PATCH", patch);
      setItems((prev) => prev.map((p) => (p.id === selected.id ? res.product : p)));
      setNotice("Đã lưu gợi ý vào các field còn trống, không ghi đè dữ liệu cũ.");
    } catch (e: any) {
      setError(e?.message ?? "Không lưu được gợi ý AI.");
    } finally {
      setApplyingAudit(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="dc-card rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sản phẩm/dịch vụ</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{items.length}</div>
          <p className="text-[12px] text-gray-500">{activeCount} đang bán</p>
        </div>
        <div className="dc-card rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">AI audit trung bình</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{avgScore == null ? "—" : `${avgScore}%`}</div>
          <p className="text-[12px] text-gray-500">Điểm đầy đủ thông tin</p>
        </div>
        <div className="dc-card rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Trạng thái AI</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{aiEnabled ? "AI model đã cấu hình" : "Phân tích cơ bản"}</div>
          <p className="text-[12px] text-gray-500">Không có key vẫn dùng fallback rule-based.</p>
        </div>
      </div>

      <div className="dc-card flex h-[calc(100vh-245px)] min-h-[640px] overflow-hidden rounded-2xl">
        <div className={`flex w-full flex-col border-r border-gray-100 lg:w-[390px] ${selectedId ? "hidden lg:flex" : "flex"}`}>
          <div className="space-y-2 border-b border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand focus-within:bg-white">
              <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm sản phẩm, dịch vụ, SKU..."
                className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              <Icon name="plus" className="h-4 w-4" />
              Thêm sản phẩm/dịch vụ
            </button>
          </div>

          <div className="scroll-thin flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
                  <Icon name="products" className="h-6 w-6" />
                </span>
                <p className="text-[13px] font-medium text-gray-600">Chưa có sản phẩm/dịch vụ</p>
                <p className="max-w-[17rem] text-[12px] text-gray-400">
                  Thêm sản phẩm đầu tiên để AI có dữ liệu tư vấn, gợi ý offer và hỗ trợ sale.
                </p>
                <button type="button" onClick={startCreate} className="mt-2 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white">
                  Thêm sản phẩm/dịch vụ
                </button>
              </div>
            ) : (
              items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                    selectedId === p.id ? "bg-brand-light/70" : "hover:bg-gray-100/70"
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-gray-800">{p.name}</span>
                    <span className="text-[12px] text-gray-500">{formatVnd(p.priceVnd)}{p.sku ? ` · ${p.sku}` : ""}</span>
                  </span>
                  {scoreChip(p.aiAuditScore)}
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`min-w-0 flex-1 flex-col ${selectedId || showForm ? "flex" : "hidden lg:flex"}`}>
          {showForm ? (
            <ProductFormPanel
              form={form}
              editing={Boolean(editingId)}
              saving={saving}
              onChange={updateForm}
              onSave={saveProduct}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            />
          ) : selected ? (
            <>
              <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 px-3 pt-3 text-[12px] text-gray-500 lg:hidden">
                <Icon name="chevron" className="h-4 w-4 rotate-180" /> Danh sách
              </button>
              <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
                <ProductDetail product={selected} onEdit={() => startEdit(selected)} />
                <ProductAuditPanel
                  product={selected}
                  audit={audit ?? selected.aiAuditJson}
                  auditing={auditing}
                  aiEnabled={aiEnabled}
                  applyingSuggestions={applyingAudit}
                  onAudit={runAudit}
                  onApplySuggestions={applyAuditToEmptyFields}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-gray-400">
              <Icon name="sparkles" className="h-8 w-8 text-gray-300" />
              <p className="text-[13px]">Chọn một sản phẩm để xem chi tiết và AI kiểm tra thông tin.</p>
            </div>
          )}
          {(error || notice) && (
            <div className="border-t border-gray-100 px-4 py-2">
              {error && <p className="text-[12px] text-rose-500">{error}</p>}
              {notice && <p className="text-[12px] text-emerald-600">{notice}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductFormPanel({
  form,
  editing,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  form: ProductForm;
  editing: boolean;
  saving: boolean;
  onChange: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="scroll-thin flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{editing ? "Sửa sản phẩm/dịch vụ" : "Thêm sản phẩm/dịch vụ"}</h3>
          <p className="text-[13px] text-gray-500">Mỗi dòng trong các ô danh sách sẽ được lưu thành một ý để AI dùng khi tư vấn.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
          Đóng
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Tên sản phẩm/dịch vụ">
          <TextInput value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="VD: Baby Tee Basic" />
        </FormField>
        <FormField label="SKU / Mã">
          <TextInput value={form.sku} onChange={(e) => onChange("sku", e.target.value)} placeholder="VD: BT-BASIC" />
        </FormField>
        <FormField label="Giá bán VND">
          <TextInput value={form.priceVnd} onChange={(e) => onChange("priceVnd", e.target.value)} inputMode="numeric" placeholder="VD: 320000" />
        </FormField>
        <FormField label="Giá vốn VND">
          <TextInput value={form.costVnd} onChange={(e) => onChange("costVnd", e.target.value)} inputMode="numeric" placeholder="Tuỳ chọn" />
        </FormField>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <FormField label="Mô tả">
          <TextArea value={form.description} onChange={(e) => onChange("description", e.target.value)} rows={4} placeholder="Mô tả ngắn, chất liệu, điểm khác biệt..." />
        </FormField>
        <FormField label="Kịch bản tư vấn">
          <TextArea value={form.salesScript} onChange={(e) => onChange("salesScript", e.target.value)} rows={4} placeholder="Câu tư vấn mẫu cho inbox..." />
        </FormField>
        <FormField label="Phân khúc khách hàng">
          <TextArea value={form.targetSegment} onChange={(e) => onChange("targetSegment", e.target.value)} rows={3} placeholder="VD: nữ 18-28 thích basic, cần áo dễ phối..." />
        </FormField>
        <FormField label="Pain point" hint="Mỗi dòng một ý">
          <TextArea value={form.painPoints} onChange={(e) => onChange("painPoints", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Lợi ích / USP" hint="Mỗi dòng một ý">
          <TextArea value={form.benefits} onChange={(e) => onChange("benefits", e.target.value)} rows={3} />
        </FormField>
        <FormField label="FAQ" hint="Mỗi dòng một câu hỏi/câu trả lời">
          <TextArea value={form.faqs} onChange={(e) => onChange("faqs", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Phản đối thường gặp" hint="Mỗi dòng một phản đối/cách xử lý">
          <TextArea value={form.objections} onChange={(e) => onChange("objections", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Ý tưởng offer/combo" hint="Mỗi dòng một ý tưởng">
          <TextArea value={form.offerIdeas} onChange={(e) => onChange("offerIdeas", e.target.value)} rows={3} />
        </FormField>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3">
        <label className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={(e) => onChange("isActive", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand" />
          Đang bán / cho AI gợi ý
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <Icon name="products" className="h-4 w-4" />
          {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo sản phẩm/dịch vụ"}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-50 py-2 last:border-b-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-gray-700">{children || <span className="italic text-gray-300">Chưa có</span>}</div>
    </div>
  );
}

function ProductDetail({ product, onEdit }: { product: Product; onEdit: () => void }) {
  return (
    <div className="scroll-thin min-h-0 overflow-y-auto border-r border-gray-100 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${product.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {product.isActive ? "Đang bán" : "Tạm ẩn"}
            </span>
            {scoreChip(product.aiAuditScore)}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
          <p className="text-[12px] text-gray-500">{product.sku || "Chưa có SKU"}</p>
        </div>
        <button type="button" onClick={onEdit} className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
          Sửa
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Giá bán</div>
          <div className="mt-1 font-bold text-gray-900">{formatVnd(product.priceVnd)}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Giá vốn</div>
          <div className="mt-1 font-bold text-gray-900">{product.costVnd == null ? "—" : formatVnd(product.costVnd)}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Margin</div>
          <div className="mt-1 font-bold text-gray-900">{product.marginVnd == null ? "—" : formatVnd(product.marginVnd)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 p-3">
        <InfoRow label="Mô tả">{product.description}</InfoRow>
        <InfoRow label="Phân khúc khách hàng">{product.targetSegment}</InfoRow>
        <InfoRow label="Pain point"><ListPreview items={asList(product.painPointsJson)} /></InfoRow>
        <InfoRow label="Lợi ích / USP"><ListPreview items={asList(product.benefitsJson)} /></InfoRow>
        <InfoRow label="FAQ"><ListPreview items={asList(product.faqsJson)} /></InfoRow>
        <InfoRow label="Xử lý phản đối"><ListPreview items={asList(product.objectionsJson)} /></InfoRow>
        <InfoRow label="Ý tưởng offer"><ListPreview items={asList(product.offerIdeasJson)} /></InfoRow>
        <InfoRow label="Kịch bản tư vấn">{product.salesScript}</InfoRow>
      </div>
    </div>
  );
}
