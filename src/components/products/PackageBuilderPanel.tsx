"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { formatVnd } from "@/components/money";

type CatalogType = "PHYSICAL_PRODUCT" | "DIGITAL_PRODUCT" | "BOOKABLE_SERVICE" | "PACKAGE";
type CatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type PricingMode = "INCLUDED" | "DISCOUNTED" | "ADD_ON";

type ComponentCatalogItem = {
  id: string;
  type: CatalogType;
  name: string;
  sku: string | null;
  status: CatalogStatus;
  basePriceVnd: number;
  shortDescription: string | null;
};

type ComponentVariant = {
  id: string;
  catalogItemId: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  inventoryTracked: boolean;
  inventoryQuantity: number;
  status: string;
};

type PackageComponent = {
  id: string;
  packageItemId: string;
  componentItemId: string;
  componentVariantId: string | null;
  quantity: number;
  pricingMode: PricingMode;
  componentItem: ComponentCatalogItem | null;
  componentVariant: ComponentVariant | null;
  retailValueVnd: number;
  available: boolean;
  warning: string | null;
};

type PackageSummary = {
  count: number;
  retailValueVnd: number;
  packagePriceVnd: number;
  savingsVnd: number;
};

type ComponentForm = {
  componentItemId: string;
  componentVariantId: string;
  quantity: string;
  pricingMode: PricingMode;
};

const PRICING_LABEL: Record<PricingMode, string> = {
  INCLUDED: "Bao gồm trong gói",
  DISCOUNTED: "Giảm giá theo gói",
  ADD_ON: "Bán kèm thêm",
};

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";

function emptyForm(): ComponentForm {
  return {
    componentItemId: "",
    componentVariantId: "",
    quantity: "1",
    pricingMode: "INCLUDED",
  };
}

function typeLabel(type: CatalogType) {
  if (type === "PHYSICAL_PRODUCT") return "Sản phẩm";
  if (type === "DIGITAL_PRODUCT") return "Digital";
  if (type === "BOOKABLE_SERVICE") return "Dịch vụ";
  return "Package";
}

export function PackageBuilderPanel({
  packageItemId,
  packageName,
  packagePriceVnd,
  onPackageChanged,
}: {
  packageItemId: string;
  packageName: string;
  packagePriceVnd: number;
  onPackageChanged?: () => void;
}) {
  const [components, setComponents] = useState<PackageComponent[]>([]);
  const [summary, setSummary] = useState<PackageSummary | null>(null);
  const [catalogItems, setCatalogItems] = useState<ComponentCatalogItem[]>([]);
  const [variants, setVariants] = useState<ComponentVariant[]>([]);
  const [form, setForm] = useState<ComponentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadComponents = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ items: PackageComponent[]; summary: PackageSummary }>(
        `/api/catalog/items/${packageItemId}/package-components?pageSize=100`
      );
      setComponents(data.items ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được bundle components");
    }
  }, [packageItemId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<{ items: ComponentCatalogItem[] }>("/api/catalog/items?status=ACTIVE&pageSize=200");
        if (!cancelled) {
          setCatalogItems((data.items ?? []).filter((item) => item.id !== packageItemId));
        }
      } catch {
        if (!cancelled) setCatalogItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    void loadComponents();
    return () => {
      cancelled = true;
    };
  }, [loadComponents, packageItemId]);

  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === form.componentItemId) ?? null,
    [catalogItems, form.componentItemId]
  );

  useEffect(() => {
    if (!selectedItem || selectedItem.type !== "PHYSICAL_PRODUCT") {
      setVariants([]);
      setForm((prev) => ({ ...prev, componentVariantId: "" }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ items: ComponentVariant[] }>(
          `/api/catalog/items/${selectedItem.id}/variants?status=ACTIVE&pageSize=100`
        );
        if (!cancelled) {
          setVariants(data.items ?? []);
          setForm((prev) => ({
            ...prev,
            componentVariantId: data.items?.some((variant) => variant.id === prev.componentVariantId)
              ? prev.componentVariantId
              : "",
          }));
        }
      } catch {
        if (!cancelled) setVariants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setVariants([]);
  }

  function startEdit(component: PackageComponent) {
    setEditingId(component.id);
    setForm({
      componentItemId: component.componentItemId,
      componentVariantId: component.componentVariantId ?? "",
      quantity: String(component.quantity),
      pricingMode: component.pricingMode,
    });
    setNotice(null);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.componentItemId) {
      setError("Vui lòng chọn item thành phần");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      componentItemId: form.componentItemId,
      componentVariantId: form.componentVariantId || null,
      quantity: Number(form.quantity) || 1,
      pricingMode: form.pricingMode,
    };
    try {
      if (editingId) {
        await apiSend<{ component: PackageComponent }>(
          `/api/catalog/items/${packageItemId}/package-components/${editingId}`,
          "PATCH",
          payload
        );
      } else {
        await apiSend<{ component: PackageComponent }>(
          `/api/catalog/items/${packageItemId}/package-components`,
          "POST",
          payload
        );
      }
      resetForm();
      setNotice(editingId ? "Đã lưu component." : "Đã thêm component.");
      await loadComponents();
      onPackageChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được component");
    } finally {
      setSaving(false);
    }
  }

  async function removeComponent(componentId: string) {
    setError(null);
    setNotice(null);
    try {
      await apiSend<{ deleted: boolean }>(
        `/api/catalog/items/${packageItemId}/package-components/${componentId}`,
        "DELETE"
      );
      setNotice("Đã ẩn component khỏi package.");
      await loadComponents();
      onPackageChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xoá được component");
    }
  }

  const retailValue = summary?.retailValueVnd ?? components.reduce((sum, c) => sum + c.retailValueVnd, 0);
  const savings = summary?.savingsVnd ?? Math.max(0, retailValue - packagePriceVnd);

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="h-32 animate-pulse rounded-2xl border bg-white" />
        <div className="mt-3 h-52 animate-pulse rounded-2xl border bg-white" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Bundle builder cho {packageName}</h3>
          <p className="text-xs text-gray-500">Ghép sản phẩm, dịch vụ hoặc variant thành combo/gói bán.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs">
          <Metric label="Giá gói" value={formatVnd(packagePriceVnd)} />
          <Metric label="Giá lẻ" value={formatVnd(retailValue)} />
          <Metric label="Tiết kiệm" value={formatVnd(savings)} tone={savings > 0 ? "good" : undefined} />
        </div>
      </div>

      {(error || notice) && (
        <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-bold text-gray-900">Thành phần package</h4>
            <p className="text-xs text-gray-500">Không hard delete; xóa khỏi builder là soft-hide component.</p>
          </div>
          {components.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Chưa có component. Thêm item bên phải để tạo combo/gói đầu tiên.</div>
          ) : (
            <div className="divide-y">
              {components.map((component) => (
                <div key={component.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {component.quantity} x {component.componentItem?.name ?? "Item đã mất"}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {component.componentItem ? typeLabel(component.componentItem.type) : "Unknown"}
                      </span>
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {PRICING_LABEL[component.pricingMode] ?? component.pricingMode}
                      </span>
                      {!component.available && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Cần kiểm tra
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {component.componentVariant ? `${component.componentVariant.name} · ` : ""}
                      Giá lẻ dòng: {formatVnd(component.retailValueVnd)}
                      {component.warning ? ` · ${component.warning}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => startEdit(component)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void removeComponent(component.id)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="rounded-2xl border bg-white p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900">{editingId ? "Sửa component" : "Thêm component"}</h4>
          <div className="mt-3 space-y-3">
            <Field label="Catalog item *">
              <select
                value={form.componentItemId}
                onChange={(e) => setForm((prev) => ({ ...prev, componentItemId: e.target.value, componentVariantId: "" }))}
                className={inputCls}
              >
                <option value="">— Chọn item —</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {typeLabel(item.type)} · {formatVnd(item.basePriceVnd)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Variant">
              <select
                value={form.componentVariantId}
                onChange={(e) => setForm((prev) => ({ ...prev, componentVariantId: e.target.value }))}
                disabled={!variants.length}
                className={inputCls}
              >
                <option value="">Không chọn variant</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} · {formatVnd(variant.priceVnd)}
                    {variant.inventoryTracked ? ` · tồn ${variant.inventoryQuantity}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số lượng">
                <input
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, "") }))}
                  inputMode="numeric"
                  className={inputCls}
                />
              </Field>
              <Field label="Pricing mode">
                <select
                  value={form.pricingMode}
                  onChange={(e) => setForm((prev) => ({ ...prev, pricingMode: e.target.value as PricingMode }))}
                  className={inputCls}
                >
                  {Object.entries(PRICING_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
                  Huỷ sửa
                </button>
              )}
              <button type="submit" disabled={saving || !form.componentItemId} className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                {saving ? "Đang lưu..." : editingId ? "Lưu component" : "Thêm vào gói"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${tone === "good" ? "text-emerald-600" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}
