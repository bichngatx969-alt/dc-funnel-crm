"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { formatVnd } from "@/components/money";
import { Icon } from "@/components/layout/icons";
import { uploadMedia, type MediaAsset } from "./media-upload";

export type CatalogOption = {
  id: string;
  name: string;
  valuesJson: string[];
  position: number;
};

export type CatalogVariant = {
  id: string;
  catalogItemId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  optionValuesJson: Record<string, string> | null;
  priceVnd: number;
  compareAtPriceVnd: number | null;
  costVnd: number | null;
  marginVnd: number | null;
  inventoryTracked: boolean;
  inventoryQuantity: number;
  lowStockThreshold: number | null;
  weightGram: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  imageId: string | null;
  image: MediaAsset | null;
  status: string;
  lowStock: boolean;
};

const VARIANT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang bán",
  DRAFT: "Bản nháp",
  ARCHIVED: "Đã ẩn",
};

function digits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function optionSummary(values: Record<string, string> | null): string {
  if (!values) return "";
  return Object.entries(values)
    .map(([key, val]) => `${key}: ${val}`)
    .join(" · ");
}

export function VariantManager({
  catalogItemId,
  onVariantsChanged,
}: {
  catalogItemId: string;
  onVariantsChanged?: () => void;
}) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [optionResp, variantResp] = await Promise.all([
        apiGet<{ items: CatalogOption[] }>(`/api/catalog/items/${catalogItemId}/options`),
        apiGet<{ items: CatalogVariant[] }>(`/api/catalog/items/${catalogItemId}/variants?pageSize=200`),
      ]);
      setOptions(optionResp.items ?? []);
      setVariants(variantResp.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được biến thể.");
    } finally {
      setLoading(false);
    }
  }, [catalogItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiSend<{ createdCount: number; skippedExisting: number; variants: CatalogVariant[] }>(
        `/api/catalog/items/${catalogItemId}/variants/generate`,
        "POST"
      );
      setVariants(res.variants ?? []);
      setNotice(`Đã sinh ${res.createdCount} biến thể mới${res.skippedExisting ? `, bỏ qua ${res.skippedExisting} đã có` : ""}.`);
      onVariantsChanged?.();
    } catch (e: any) {
      setError(e?.message ?? "Không sinh được biến thể.");
    } finally {
      setGenerating(false);
    }
  }

  function applyVariant(updated: CatalogVariant) {
    setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    onVariantsChanged?.();
  }

  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    onVariantsChanged?.();
  }

  const totalStock = variants
    .filter((v) => v.inventoryTracked)
    .reduce((sum, v) => sum + v.inventoryQuantity, 0);
  const lowStockCount = variants.filter((v) => v.lowStock).length;

  return (
    <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <OptionsEditor
        catalogItemId={catalogItemId}
        options={options}
        onChange={setOptions}
        onError={setError}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
        <div className="text-[12px] text-gray-500">
          {variants.length} biến thể · tổng tồn <span className="font-semibold text-gray-800">{totalStock}</span>
          {lowStockCount > 0 && <span className="ml-1 text-amber-600">· {lowStockCount} sắp hết</span>}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating || options.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          title={options.length === 0 ? "Cần tạo option trước" : "Sinh biến thể từ các option"}
        >
          <Icon name="sparkles" className="h-4 w-4" />
          {generating ? "Đang sinh..." : "Sinh biến thể"}
        </button>
      </div>

      {error && <p className="text-[12px] text-rose-500">{error}</p>}
      {notice && <p className="text-[12px] text-emerald-600">{notice}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : variants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
            <Icon name="products" className="h-6 w-6" />
          </span>
          <p className="text-[13px] font-medium text-gray-600">Chưa có biến thể</p>
          <p className="max-w-[20rem] text-[12px] text-gray-400">
            {options.length === 0
              ? "Tạo option (Size, Màu...) ở trên rồi bấm “Sinh biến thể”."
              : "Bấm “Sinh biến thể” để tạo tổ hợp từ các option đã có."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              catalogItemId={catalogItemId}
              variant={variant}
              onApply={applyVariant}
              onRemove={removeVariant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({
  catalogItemId,
  options,
  onChange,
  onError,
}: {
  catalogItemId: string;
  options: CatalogOption[];
  onChange: (options: CatalogOption[]) => void;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function addOption() {
    if (!name.trim() || values.length === 0) return;
    setSaving(true);
    onError(null);
    try {
      const res = await apiSend<{ option: CatalogOption }>(`/api/catalog/items/${catalogItemId}/options`, "POST", {
        name: name.trim(),
        values,
      });
      onChange([...options, res.option]);
      setName("");
      setValues([]);
    } catch (e: any) {
      onError(e?.message ?? "Không tạo được option.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(id: string) {
    onError(null);
    try {
      await apiSend(`/api/catalog/items/${catalogItemId}/options/${id}`, "PATCH", { deleted: true });
      onChange(options.filter((o) => o.id !== id));
    } catch (e: any) {
      onError(e?.message ?? "Không xóa được option.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 p-3">
      <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">Option (thuộc tính)</h4>

      {options.length > 0 ? (
        <div className="mb-3 space-y-2">
          {options.map((option) => (
            <div key={option.id} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-gray-800">{option.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {option.valuesJson.map((value) => (
                    <span key={value} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteOption(option.id)}
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-[12px] text-gray-400">Chưa có option. Thêm Size, Màu, Chất liệu... rồi nhập các giá trị.</p>
      )}

      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-start">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên option (VD: Size)"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
        <ChipInput values={values} onChange={setValues} placeholder="Nhập giá trị, Enter để thêm (S, M, L...)" />
        <button
          type="button"
          onClick={addOption}
          disabled={saving || !name.trim() || values.length === 0}
          className="rounded-full bg-gray-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-black disabled:opacity-40"
        >
          {saving ? "..." : "Thêm option"}
        </button>
      </div>
    </div>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = Array.from(new Set([...values, ...parts]));
    onChange(next);
    setDraft("");
  }

  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
      {values.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand">
          {value}
          <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="text-brand/70 hover:text-brand">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-[13px] outline-none"
      />
    </div>
  );
}

type VariantDraft = {
  sku: string;
  priceVnd: string;
  costVnd: string;
  inventoryQuantity: string;
  lowStockThreshold: string;
  weightGram: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  status: string;
  inventoryTracked: boolean;
};

function draftFromVariant(v: CatalogVariant): VariantDraft {
  return {
    sku: v.sku ?? "",
    priceVnd: v.priceVnd ? String(v.priceVnd) : "",
    costVnd: v.costVnd != null ? String(v.costVnd) : "",
    inventoryQuantity: String(v.inventoryQuantity),
    lowStockThreshold: v.lowStockThreshold != null ? String(v.lowStockThreshold) : "",
    weightGram: v.weightGram != null ? String(v.weightGram) : "",
    lengthCm: v.lengthCm != null ? String(v.lengthCm) : "",
    widthCm: v.widthCm != null ? String(v.widthCm) : "",
    heightCm: v.heightCm != null ? String(v.heightCm) : "",
    status: v.status,
    inventoryTracked: v.inventoryTracked,
  };
}

function VariantRow({
  catalogItemId,
  variant,
  onApply,
  onRemove,
}: {
  catalogItemId: string;
  variant: CatalogVariant;
  onApply: (variant: CatalogVariant) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VariantDraft>(() => draftFromVariant(variant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiSend<{ variant: CatalogVariant }>(
        `/api/catalog/items/${catalogItemId}/variants/${variant.id}`,
        "PATCH",
        {
          sku: draft.sku.trim() || null,
          priceVnd: digits(draft.priceVnd) ? Number(digits(draft.priceVnd)) : 0,
          costVnd: draft.costVnd.trim() ? Number(digits(draft.costVnd)) : null,
          inventoryQuantity: digits(draft.inventoryQuantity) ? Number(digits(draft.inventoryQuantity)) : 0,
          lowStockThreshold: draft.lowStockThreshold.trim() ? Number(digits(draft.lowStockThreshold)) : null,
          weightGram: draft.weightGram.trim() ? Number(digits(draft.weightGram)) : null,
          lengthCm: draft.lengthCm.trim() ? Number(draft.lengthCm) : null,
          widthCm: draft.widthCm.trim() ? Number(draft.widthCm) : null,
          heightCm: draft.heightCm.trim() ? Number(draft.heightCm) : null,
          status: draft.status,
          inventoryTracked: draft.inventoryTracked,
        }
      );
      onApply(res.variant);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Không lưu được biến thể.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await apiSend(`/api/catalog/items/${catalogItemId}/variants/${variant.id}`, "PATCH", { deleted: true });
      onRemove(variant.id);
    } catch (e: any) {
      setError(e?.message ?? "Không xóa được biến thể.");
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    setUploadingImage(true);
    setError(null);
    try {
      const media = await uploadMedia(file, variant.name);
      const res = await apiSend<{ variant: CatalogVariant }>(
        `/api/catalog/items/${catalogItemId}/variants/${variant.id}`,
        "PATCH",
        { imageId: media.id }
      );
      onApply(res.variant);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được ảnh biến thể.");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className={`rounded-xl border ${variant.lowStock ? "border-amber-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-3 p-2.5">
        {variant.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={variant.image.url} alt={variant.name} className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-gray-100" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
            <Icon name="products" className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-gray-800">{optionSummary(variant.optionValuesJson) || variant.name}</span>
            {variant.lowStock && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Sắp hết</span>
            )}
            {variant.status !== "ACTIVE" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{VARIANT_STATUS_LABEL[variant.status] ?? variant.status}</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
            <span>{variant.sku || "Chưa có SKU"}</span>
            <span className="font-medium text-gray-700">{formatVnd(variant.priceVnd)}</span>
            <span>
              Tồn: <span className={`font-semibold ${variant.lowStock ? "text-amber-600" : "text-gray-700"}`}>{variant.inventoryTracked ? variant.inventoryQuantity : "—"}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(draftFromVariant(variant));
            setOpen((v) => !v);
          }}
          className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
        >
          {open ? "Đóng" : "Sửa"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          <div className="flex items-center gap-3">
            {variant.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={variant.image.url} alt={variant.name} className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-100" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                <Icon name="products" className="h-5 w-5" />
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImage}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {uploadingImage ? "Đang tải..." : variant.image ? "Đổi ảnh" : "Thêm ảnh"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void uploadImage(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="SKU">
              <Input value={draft.sku} onChange={(v) => set("sku", v)} placeholder="BT-M-DEN" />
            </Field>
            <Field label="Giá bán (VND)">
              <Input value={draft.priceVnd} onChange={(v) => set("priceVnd", v)} inputMode="numeric" />
            </Field>
            <Field label="Giá vốn (VND)">
              <Input value={draft.costVnd} onChange={(v) => set("costVnd", v)} inputMode="numeric" />
            </Field>
            <Field label="Tồn kho">
              <Input value={draft.inventoryQuantity} onChange={(v) => set("inventoryQuantity", v)} inputMode="numeric" />
            </Field>
            <Field label="Ngưỡng cảnh báo">
              <Input value={draft.lowStockThreshold} onChange={(v) => set("lowStockThreshold", v)} inputMode="numeric" placeholder="VD: 5" />
            </Field>
            <Field label="Trạng thái">
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                {Object.entries(VARIANT_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Khối lượng (g)">
              <Input value={draft.weightGram} onChange={(v) => set("weightGram", v)} inputMode="numeric" />
            </Field>
            <Field label="Dài (cm)">
              <Input value={draft.lengthCm} onChange={(v) => set("lengthCm", v)} inputMode="decimal" />
            </Field>
            <Field label="Rộng × Cao (cm)">
              <div className="flex gap-2">
                <Input value={draft.widthCm} onChange={(v) => set("widthCm", v)} inputMode="decimal" placeholder="R" />
                <Input value={draft.heightCm} onChange={(v) => set("heightCm", v)} inputMode="decimal" placeholder="C" />
              </div>
            </Field>
          </div>

          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
            <input type="checkbox" checked={draft.inventoryTracked} onChange={(e) => set("inventoryTracked", e.target.checked)} />
            Theo dõi tồn kho
          </label>

          {error && <p className="text-[12px] text-rose-500">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={remove} disabled={saving} className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-50">
              Xóa biến thể
            </button>
            <button type="button" onClick={save} disabled={saving} className="rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu biến thể"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input({
  value,
  onChange,
  ...props
}: { value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
    />
  );
}
