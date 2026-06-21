"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { Icon } from "@/components/layout/icons";
import { formatVnd } from "@/components/money";
import { ProductAuditPanel, type ProductAudit } from "./ProductAuditPanel";

type CatalogType = "PHYSICAL_PRODUCT" | "DIGITAL_PRODUCT" | "BOOKABLE_SERVICE" | "PACKAGE";
type CatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type MediaAsset = {
  id: string;
  url: string;
  altText: string | null;
};

type CatalogItem = {
  id: string;
  type: CatalogType;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  status: CatalogStatus;
  categoryId: string | null;
  category?: Category | null;
  basePriceVnd: number;
  compareAtPriceVnd: number | null;
  costVnd: number | null;
  marginVnd: number | null;
  tagsJson: unknown;
  coverImageId: string | null;
  coverImage?: MediaAsset | null;
  galleryJson: unknown;
  targetSegment: string | null;
  painPointsJson: unknown;
  benefitsJson: unknown;
  faqsJson: unknown;
  objectionsJson: unknown;
  offerIdeasJson: unknown;
  salesScript: string | null;
  aiAuditScore: number | null;
  aiAuditedAt: string | null;
  aiAuditJson: ProductAudit | null;
  updatedAt: string;
};

type CatalogForm = {
  type: CatalogType;
  name: string;
  sku: string;
  categoryId: string;
  status: CatalogStatus;
  shortDescription: string;
  description: string;
  coverImageUrl: string;
  coverImageAltText: string;
  basePriceVnd: string;
  compareAtPriceVnd: string;
  costVnd: string;
  tags: string;
  targetSegment: string;
  painPoints: string;
  benefits: string;
  faqs: string;
  objections: string;
  offerIdeas: string;
  salesScript: string;
};

const EMPTY_FORM: CatalogForm = {
  type: "PHYSICAL_PRODUCT",
  name: "",
  sku: "",
  categoryId: "",
  status: "ACTIVE",
  shortDescription: "",
  description: "",
  coverImageUrl: "",
  coverImageAltText: "",
  basePriceVnd: "",
  compareAtPriceVnd: "",
  costVnd: "",
  tags: "",
  targetSegment: "",
  painPoints: "",
  benefits: "",
  faqs: "",
  objections: "",
  offerIdeas: "",
  salesScript: "",
};

const TYPE_LABEL: Record<CatalogType, string> = {
  PHYSICAL_PRODUCT: "Sản phẩm vật lý",
  DIGITAL_PRODUCT: "Sản phẩm số",
  BOOKABLE_SERVICE: "Dịch vụ",
  PACKAGE: "Combo/Gói",
};

const STATUS_LABEL: Record<CatalogStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang bán",
  ARCHIVED: "Đã ẩn",
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "products", label: "Sản phẩm" },
  { key: "services", label: "Dịch vụ" },
  { key: "packages", label: "Combo/Gói" },
  { key: "drafts", label: "Bản nháp" },
  { key: "archived", label: "Đã ẩn" },
] as const;

function scoreChip(score: number | null) {
  if (score == null) return <span className="text-[11px] text-gray-300">chưa audit</span>;
  const tone = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>AI {score}%</span>;
}

function statusTone(status: CatalogStatus) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (status === "ARCHIVED") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
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

function formFromItem(item: CatalogItem): CatalogForm {
  return {
    type: item.type,
    name: item.name ?? "",
    sku: item.sku ?? "",
    categoryId: item.categoryId ?? "",
    status: item.status,
    shortDescription: item.shortDescription ?? "",
    description: item.description ?? "",
    coverImageUrl: item.coverImage?.url ?? "",
    coverImageAltText: item.coverImage?.altText ?? "",
    basePriceVnd: item.basePriceVnd ? String(item.basePriceVnd) : "",
    compareAtPriceVnd: item.compareAtPriceVnd ? String(item.compareAtPriceVnd) : "",
    costVnd: item.costVnd ? String(item.costVnd) : "",
    tags: listText(item.tagsJson),
    targetSegment: item.targetSegment ?? "",
    painPoints: listText(item.painPointsJson),
    benefits: listText(item.benefitsJson),
    faqs: listText(item.faqsJson),
    objections: listText(item.objectionsJson),
    offerIdeas: listText(item.offerIdeasJson),
    salesScript: item.salesScript ?? "",
  };
}

function formPayload(form: CatalogForm, existing?: CatalogItem | null) {
  const payload: Record<string, unknown> = {
    type: form.type,
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    categoryId: form.categoryId || null,
    status: form.status,
    shortDescription: form.shortDescription.trim() || null,
    description: form.description.trim() || null,
    basePriceVnd: parseMoney(form.basePriceVnd),
    compareAtPriceVnd: form.compareAtPriceVnd.trim() ? parseMoney(form.compareAtPriceVnd) : null,
    costVnd: form.costVnd.trim() ? parseMoney(form.costVnd) : null,
    tags: form.tags,
    targetSegment: form.targetSegment.trim() || null,
    painPoints: form.painPoints,
    benefits: form.benefits,
    faqs: form.faqs,
    objections: form.objections,
    offerIdeas: form.offerIdeas,
    salesScript: form.salesScript.trim() || null,
  };
  const coverUrl = form.coverImageUrl.trim();
  const currentCoverUrl = existing?.coverImage?.url ?? "";
  if (coverUrl && coverUrl !== currentCoverUrl) {
    payload.coverImageUrl = coverUrl;
    payload.coverImageAltText = form.coverImageAltText.trim() || form.name.trim();
  }
  if (!coverUrl && existing?.coverImageId) payload.coverImageId = null;
  return payload;
}

function listMatchesTab(item: CatalogItem, tab: (typeof TABS)[number]["key"]) {
  if (tab === "all") return true;
  if (tab === "products") return item.type === "PHYSICAL_PRODUCT" || item.type === "DIGITAL_PRODUCT";
  if (tab === "services") return item.type === "BOOKABLE_SERVICE";
  if (tab === "packages") return item.type === "PACKAGE";
  if (tab === "drafts") return item.status === "DRAFT";
  if (tab === "archived") return item.status === "ARCHIVED";
  return true;
}

function ListPreview({ items }: { items: string[] }) {
  if (!items.length) return <span className="italic text-gray-300">Chưa có</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 10).map((item) => (
        <span key={item} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          {item}
        </span>
      ))}
    </div>
  );
}

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[10.5px] text-gray-400">{hint}</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 ${props.className ?? ""}`} />;
}

export function ProductsClient({ aiEnabled }: { aiEnabled: boolean }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [missingImageOnly, setMissingImageOnly] = useState(false);
  const [lowAiOnly, setLowAiOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<ProductAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [applyingAudit, setApplyingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("pageSize", "200");
      const [catalogResp, categoryResp] = await Promise.all([
        apiGet<{ items: CatalogItem[] }>(`/api/catalog/items?${params.toString()}`),
        apiGet<{ categories: Category[] }>("/api/catalog/categories"),
      ]);
      setItems(catalogResp.items ?? []);
      setCategories(categoryResp.categories ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được catalog.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 280);
    return () => clearTimeout(timer);
  }, [load]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => listMatchesTab(item, tab))
      .filter((item) => (missingImageOnly ? !item.coverImageId : true))
      .filter((item) => (lowAiOnly ? item.aiAuditScore == null || item.aiAuditScore < 70 : true));
  }, [items, tab, missingImageOnly, lowAiOnly]);
  const selected = items.find((p) => p.id === selectedId) ?? null;
  const activeCount = useMemo(() => items.filter((p) => p.status === "ACTIVE").length, [items]);
  const missingImageCount = useMemo(() => items.filter((p) => !p.coverImageId).length, [items]);
  const avgScore = useMemo(() => {
    const scored = items.filter((p) => typeof p.aiAuditScore === "number");
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, p) => sum + (p.aiAuditScore ?? 0), 0) / scored.length);
  }, [items]);

  async function selectItem(id: string) {
    setSelectedId(id);
    setAudit(null);
    setError(null);
    setNotice(null);
    try {
      const d = await apiGet<{ product: CatalogItem; audit: ProductAudit | null }>(`/api/catalog/items/${id}/ai-audit`);
      setAudit(d.audit ?? null);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...d.product } : p)));
    } catch (e: any) {
      setAudit(null);
      setError(e?.message ?? "Không tải được audit catalog item.");
    }
  }

  function startCreate(type: CatalogType = "PHYSICAL_PRODUCT") {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, type });
    setShowForm(true);
    setNotice(null);
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm(formFromItem(item));
    setShowForm(true);
    setNotice(null);
  }

  function updateForm<K extends keyof CatalogForm>(key: K, value: CatalogForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveItem() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const existing = editingId ? items.find((item) => item.id === editingId) ?? null : null;
      const payload = formPayload(form, existing);
      const res = editingId
        ? await apiSend<{ item: CatalogItem }>(`/api/catalog/items/${editingId}`, "PATCH", payload)
        : await apiSend<{ item: CatalogItem }>("/api/catalog/items", "POST", payload);
      setItems((prev) => {
        const exists = prev.some((p) => p.id === res.item.id);
        return exists ? prev.map((p) => (p.id === res.item.id ? res.item : p)) : [res.item, ...prev];
      });
      setSelectedId(res.item.id);
      setAudit((res.item.aiAuditJson as ProductAudit | null) ?? null);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setNotice(editingId ? "Đã cập nhật catalog item." : "Đã thêm catalog item.");
    } catch (e: any) {
      setError(e?.message ?? "Không lưu được catalog item.");
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
      const res = await apiSend<{ aiConfigured: boolean; status: string; product: CatalogItem; audit: ProductAudit }>(
        `/api/catalog/items/${selectedId}/ai-audit`,
        "POST"
      );
      setAudit({ ...res.audit, aiConfigured: res.aiConfigured, fallback: !res.aiConfigured || res.status !== "SUCCESS" });
      setItems((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...res.product } : p)));
      if (!res.aiConfigured) setNotice("Đang dùng chế độ phân tích cơ bản vì chưa cấu hình AI model.");
    } catch (e: any) {
      setError(e?.message ?? "Không kiểm tra được catalog item.");
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
      const res = await apiSend<{ item: CatalogItem }>(`/api/catalog/items/${selected.id}`, "PATCH", patch);
      setItems((prev) => prev.map((p) => (p.id === selected.id ? res.item : p)));
      setNotice("Đã lưu gợi ý vào các field còn trống, không ghi đè dữ liệu cũ.");
    } catch (e: any) {
      setError(e?.message ?? "Không lưu được gợi ý AI.");
    } finally {
      setApplyingAudit(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Catalog items" value={items.length} hint={`${activeCount} đang bán`} />
        <StatCard label="Thiếu ảnh" value={missingImageCount} hint="Cần bổ sung cover URL" tone={missingImageCount ? "warn" : "good"} />
        <StatCard label="Điểm AI TB" value={avgScore == null ? "—" : `${avgScore}%`} hint="Độ đầy đủ dữ liệu bán hàng" />
        <StatCard label="Trạng thái AI" value={aiEnabled ? "AI model" : "Cơ bản"} hint="Chưa có key vẫn chạy chế độ cơ bản" />
      </div>

      <div className="dc-card flex h-[calc(100vh-245px)] min-h-[560px] overflow-hidden rounded-2xl sm:min-h-[700px]">
        <div className={`flex w-full flex-col border-r border-gray-100 xl:w-[430px] ${selectedId ? "hidden xl:flex" : "flex"}`}>
          <div className="space-y-3 border-b border-gray-100 p-3">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand focus-within:bg-white">
              <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, SKU, mô tả..."
                className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTab(option.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${tab === option.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <input type="checkbox" checked={missingImageOnly} onChange={(e) => setMissingImageOnly(e.target.checked)} />
                  Thiếu ảnh
                </label>
                <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                  <input type="checkbox" checked={lowAiOnly} onChange={(e) => setLowAiOnly(e.target.checked)} />
                  AI thấp
                </label>
              </div>
              <button
                type="button"
                onClick={() => startCreate()}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark"
              >
                <Icon name="plus" className="h-4 w-4" />
                Thêm
              </button>
            </div>
          </div>

          <div className="scroll-thin flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : error && items.length === 0 ? (
              <ListError message={error} onRetry={() => void load()} />
            ) : filteredItems.length === 0 ? (
              <EmptyCatalog onCreate={() => startCreate()} />
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item.id)}
                  className={`flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${selectedId === item.id ? "bg-brand-light/70" : "hover:bg-gray-100/70"}`}
                >
                  <CoverThumb item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-gray-800">{item.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                      <span>{TYPE_LABEL[item.type]}</span>
                      <span>·</span>
                      <span>{formatVnd(item.basePriceVnd)}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(item.status)}`}>{STATUS_LABEL[item.status]}</span>
                      {scoreChip(item.aiAuditScore)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`min-w-0 flex-1 flex-col ${selectedId || showForm ? "flex" : "hidden xl:flex"}`}>
          {showForm ? (
            <CatalogFormPanel
              form={form}
              categories={categories}
              editing={Boolean(editingId)}
              saving={saving}
              onChange={updateForm}
              onSave={saveItem}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            />
          ) : selected ? (
            <>
              <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 px-3 pt-3 text-[12px] text-gray-500 xl:hidden">
                <Icon name="chevron" className="h-4 w-4 rotate-180" /> Danh sách
              </button>
              <div className="grid min-h-0 flex-1 grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
                <CatalogDetail item={selected} onEdit={() => startEdit(selected)} />
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
              <Icon name="products" className="h-8 w-8 text-gray-300" />
              <p className="text-[13px]">Chọn một catalog item để xem chi tiết, media và AI audit.</p>
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

function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint: string; tone?: "good" | "warn" }) {
  return (
    <div className="dc-card rounded-2xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-gray-900"}`}>{value}</div>
      <p className="text-[12px] text-gray-500">{hint}</p>
    </div>
  );
}

function CoverThumb({ item }: { item: CatalogItem }) {
  if (item.coverImage?.url) {
    return <img src={item.coverImage.url} alt={item.coverImage.altText ?? item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-gray-100" />;
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300">
      <Icon name="products" className="h-5 w-5" />
    </span>
  );
}

function EmptyCatalog({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
        <Icon name="products" className="h-6 w-6" />
      </span>
      <p className="text-[13px] font-medium text-gray-600">Chưa có sản phẩm/dịch vụ.</p>
      <p className="max-w-[18rem] text-[12px] text-gray-400">
        Thêm catalog đầu tiên để AI có dữ liệu tư vấn, gợi ý offer và hỗ trợ sale.
      </p>
      <button type="button" onClick={onCreate} className="mt-2 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white">
        Thêm sản phẩm/dịch vụ
      </button>
    </div>
  );
}

function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-400">!</span>
      <p className="text-[13px] font-medium text-gray-600">Không tải được catalog</p>
      <p className="max-w-[18rem] text-[12px] text-gray-400">{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
        Thử lại
      </button>
    </div>
  );
}

function CatalogFormPanel({
  form,
  categories,
  editing,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  form: CatalogForm;
  categories: Category[];
  editing: boolean;
  saving: boolean;
  onChange: <K extends keyof CatalogForm>(key: K, value: CatalogForm[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="scroll-thin flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{editing ? "Sửa catalog item" : "Thêm sản phẩm/dịch vụ"}</h3>
          <p className="text-[13px] text-gray-500">Phase 1 hỗ trợ image URL. Variant, tồn kho và booking sẽ làm ở phase sau.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
          Đóng
        </button>
      </div>

      <SectionTitle title="Loại catalog" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(TYPE_LABEL) as CatalogType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange("type", type)}
            className={`rounded-2xl border px-3 py-3 text-left text-[12px] font-semibold transition ${form.type === type ? "border-brand bg-brand-light text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <SectionTitle title="Thông tin cơ bản" />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Tên sản phẩm/dịch vụ">
          <TextInput value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="VD: Baby Tee Bướm Pink" />
        </FormField>
        <FormField label="SKU / Mã">
          <TextInput value={form.sku} onChange={(e) => onChange("sku", e.target.value)} placeholder="VD: BT-BUOM-PINK" />
        </FormField>
        <FormField label="Danh mục">
          <select value={form.categoryId} onChange={(e) => onChange("categoryId", e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
            <option value="">Chưa chọn</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Trạng thái">
          <select value={form.status} onChange={(e) => onChange("status", e.target.value as CatalogStatus)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
            {(Object.keys(STATUS_LABEL) as CatalogStatus[]).map((status) => (
              <option key={status} value={status}>{STATUS_LABEL[status]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Mô tả ngắn">
          <TextInput value={form.shortDescription} onChange={(e) => onChange("shortDescription", e.target.value)} placeholder="Một câu sale dễ đọc" />
        </FormField>
        <FormField label="Tags" hint="Mỗi dòng hoặc dấu phẩy một tag">
          <TextInput value={form.tags} onChange={(e) => onChange("tags", e.target.value)} placeholder="baby tee, nữ 18-27" />
        </FormField>
      </div>
      <div className="mt-3">
        <FormField label="Mô tả chi tiết">
          <TextArea value={form.description} onChange={(e) => onChange("description", e.target.value)} rows={4} />
        </FormField>
      </div>

      <SectionTitle title="Media" />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Cover image URL">
          <TextInput value={form.coverImageUrl} onChange={(e) => onChange("coverImageUrl", e.target.value)} placeholder="https://..." />
        </FormField>
        <FormField label="Alt text">
          <TextInput value={form.coverImageAltText} onChange={(e) => onChange("coverImageAltText", e.target.value)} placeholder="Mô tả ảnh cho sale/AI" />
        </FormField>
      </div>

      <SectionTitle title="Giá" />
      <div className="grid gap-3 md:grid-cols-3">
        <FormField label="Giá bán VND">
          <TextInput value={form.basePriceVnd} onChange={(e) => onChange("basePriceVnd", e.target.value)} inputMode="numeric" placeholder="159000" />
        </FormField>
        <FormField label="Giá so sánh VND">
          <TextInput value={form.compareAtPriceVnd} onChange={(e) => onChange("compareAtPriceVnd", e.target.value)} inputMode="numeric" placeholder="199000" />
        </FormField>
        <FormField label="Giá vốn VND">
          <TextInput value={form.costVnd} onChange={(e) => onChange("costVnd", e.target.value)} inputMode="numeric" placeholder="75000" />
        </FormField>
      </div>

      <SectionTitle title="Dữ liệu AI bán hàng" />
      <div className="grid gap-3 lg:grid-cols-2">
        <FormField label="Phân khúc khách hàng">
          <TextArea value={form.targetSegment} onChange={(e) => onChange("targetSegment", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Pain point" hint="Mỗi dòng một ý">
          <TextArea value={form.painPoints} onChange={(e) => onChange("painPoints", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Benefit / USP" hint="Mỗi dòng một ý">
          <TextArea value={form.benefits} onChange={(e) => onChange("benefits", e.target.value)} rows={3} />
        </FormField>
        <FormField label="FAQ" hint="Mỗi dòng một câu">
          <TextArea value={form.faqs} onChange={(e) => onChange("faqs", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Phản đối thường gặp">
          <TextArea value={form.objections} onChange={(e) => onChange("objections", e.target.value)} rows={3} />
        </FormField>
        <FormField label="Ý tưởng offer">
          <TextArea value={form.offerIdeas} onChange={(e) => onChange("offerIdeas", e.target.value)} rows={3} />
        </FormField>
      </div>
      <div className="mt-3">
        <FormField label="Kịch bản tư vấn">
          <TextArea value={form.salesScript} onChange={(e) => onChange("salesScript", e.target.value)} rows={4} />
        </FormField>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3 text-[12px] text-gray-500">
        {form.type === "PHYSICAL_PRODUCT" && "Phase 2 sẽ bổ sung variant, tồn kho, cân nặng/kích thước."}
        {form.type === "DIGITAL_PRODUCT" && "Phase 2/3 sẽ bổ sung file delivery và quyền truy cập số."}
        {form.type === "BOOKABLE_SERVICE" && "Phase 3 sẽ bổ sung duration, booking, staff và đặt cọc."}
        {form.type === "PACKAGE" && "Phase 4 sẽ bổ sung bundle/package component builder."}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <Icon name="products" className="h-4 w-4" />
          {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo catalog item"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h4 className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-gray-500">{title}</h4>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-50 py-2 last:border-b-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-gray-700">{children || <span className="italic text-gray-300">Chưa có</span>}</div>
    </div>
  );
}

function CatalogDetail({ item, onEdit }: { item: CatalogItem; onEdit: () => void }) {
  return (
    <div className="scroll-thin min-h-0 overflow-y-auto border-b border-gray-100 p-4 2xl:border-b-0 2xl:border-r">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(item.status)}`}>{STATUS_LABEL[item.status]}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{TYPE_LABEL[item.type]}</span>
            {scoreChip(item.aiAuditScore)}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
          <p className="text-[12px] text-gray-500">{item.sku || "Chưa có SKU"} · {item.category?.name || "Chưa chọn danh mục"}</p>
        </div>
        <button type="button" onClick={onEdit} className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
          Sửa
        </button>
      </div>

      {item.coverImage?.url ? (
        <img src={item.coverImage.url} alt={item.coverImage.altText ?? item.name} className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-gray-100" />
      ) : (
        <div className="mb-4 flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-gray-100 text-[13px] text-gray-400">
          Chưa có cover image URL
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Giá bán</div>
          <div className="mt-1 font-bold text-gray-900">{formatVnd(item.basePriceVnd)}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Giá vốn</div>
          <div className="mt-1 font-bold text-gray-900">{item.costVnd == null ? "—" : formatVnd(item.costVnd)}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-400">Margin</div>
          <div className="mt-1 font-bold text-gray-900">{item.marginVnd == null ? "—" : formatVnd(item.marginVnd)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 p-3">
        <InfoRow label="Mô tả ngắn">{item.shortDescription}</InfoRow>
        <InfoRow label="Mô tả chi tiết">{item.description}</InfoRow>
        <InfoRow label="Tags"><ListPreview items={asList(item.tagsJson)} /></InfoRow>
        <InfoRow label="Phân khúc khách hàng">{item.targetSegment}</InfoRow>
        <InfoRow label="Pain point"><ListPreview items={asList(item.painPointsJson)} /></InfoRow>
        <InfoRow label="Benefit / USP"><ListPreview items={asList(item.benefitsJson)} /></InfoRow>
        <InfoRow label="FAQ"><ListPreview items={asList(item.faqsJson)} /></InfoRow>
        <InfoRow label="Xử lý phản đối"><ListPreview items={asList(item.objectionsJson)} /></InfoRow>
        <InfoRow label="Ý tưởng offer"><ListPreview items={asList(item.offerIdeasJson)} /></InfoRow>
        <InfoRow label="Kịch bản tư vấn">{item.salesScript}</InfoRow>
      </div>
    </div>
  );
}
