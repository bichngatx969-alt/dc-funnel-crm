"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { formatVnd } from "@/components/money";

type ServiceLocationMode = "ONLINE" | "OFFLINE" | "CUSTOMER_LOCATION" | "HYBRID";

type ServiceProfile = {
  id: string;
  catalogItemId: string;
  bookingEnabled: boolean;
  defaultDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  depositRequired: boolean;
  depositVnd: number;
  cancellationPolicy: string | null;
  intakeFormJson: unknown;
  locationMode: ServiceLocationMode;
  location: string | null;
  updatedAt: string;
};

type ServiceVariation = {
  id: string;
  catalogItemId: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string | null;
  bookingEnabled: boolean;
  staffIdsJson: unknown;
  updatedAt: string;
};

type ProfileForm = {
  bookingEnabled: boolean;
  defaultDurationMinutes: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  depositRequired: boolean;
  depositVnd: string;
  cancellationPolicy: string;
  intakeFormJson: string;
  locationMode: ServiceLocationMode;
  location: string;
};

type VariationForm = {
  name: string;
  durationMinutes: string;
  priceVnd: string;
  description: string;
  bookingEnabled: boolean;
};

const LOCATION_OPTIONS: { value: ServiceLocationMode; label: string }[] = [
  { value: "OFFLINE", label: "Tại cửa hàng/studio" },
  { value: "ONLINE", label: "Online" },
  { value: "CUSTOMER_LOCATION", label: "Tại địa điểm khách" },
  { value: "HYBRID", label: "Linh hoạt" },
];

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";

function emptyProfile(defaultPriceVnd: number): ProfileForm {
  return {
    bookingEnabled: false,
    defaultDurationMinutes: "60",
    bufferBeforeMinutes: "0",
    bufferAfterMinutes: "0",
    depositRequired: false,
    depositVnd: defaultPriceVnd > 0 ? String(defaultPriceVnd) : "0",
    cancellationPolicy: "",
    intakeFormJson: "",
    locationMode: "OFFLINE",
    location: "",
  };
}

function profileToForm(profile: ServiceProfile | null, defaults: Partial<ServiceProfile>, defaultPriceVnd: number): ProfileForm {
  const fallback = emptyProfile(defaultPriceVnd);
  const source = profile ?? defaults;
  return {
    bookingEnabled: Boolean(source.bookingEnabled ?? fallback.bookingEnabled),
    defaultDurationMinutes: String(source.defaultDurationMinutes ?? fallback.defaultDurationMinutes),
    bufferBeforeMinutes: String(source.bufferBeforeMinutes ?? fallback.bufferBeforeMinutes),
    bufferAfterMinutes: String(source.bufferAfterMinutes ?? fallback.bufferAfterMinutes),
    depositRequired: Boolean(source.depositRequired ?? fallback.depositRequired),
    depositVnd: String(source.depositVnd ?? fallback.depositVnd),
    cancellationPolicy: source.cancellationPolicy ?? "",
    intakeFormJson: source.intakeFormJson ? JSON.stringify(source.intakeFormJson, null, 2) : "",
    locationMode: (source.locationMode ?? fallback.locationMode) as ServiceLocationMode,
    location: source.location ?? "",
  };
}

function newVariationForm(defaultPriceVnd: number): VariationForm {
  return {
    name: "",
    durationMinutes: "60",
    priceVnd: defaultPriceVnd > 0 ? String(defaultPriceVnd) : "0",
    description: "",
    bookingEnabled: true,
  };
}

function parseJsonField(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function ServiceBookingPanel({
  catalogItemId,
  catalogItemName,
  basePriceVnd,
  onBookingChanged,
}: {
  catalogItemId: string;
  catalogItemName: string;
  basePriceVnd: number;
  onBookingChanged?: () => void;
}) {
  const [profile, setProfile] = useState<ServiceProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => emptyProfile(basePriceVnd));
  const [variations, setVariations] = useState<ServiceVariation[]>([]);
  const [variationForm, setVariationForm] = useState<VariationForm>(() => newVariationForm(basePriceVnd));
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVariation, setSavingVariation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileResp, variationResp] = await Promise.all([
        apiGet<{ profile: ServiceProfile | null; defaults: Partial<ServiceProfile> }>(
          `/api/catalog/items/${catalogItemId}/service-profile`
        ),
        apiGet<{ items: ServiceVariation[] }>(
          `/api/catalog/items/${catalogItemId}/service-variations?includeInactive=true&pageSize=100`
        ),
      ]);
      setProfile(profileResp.profile ?? null);
      setProfileForm(profileToForm(profileResp.profile ?? null, profileResp.defaults ?? {}, basePriceVnd));
      setVariations(variationResp.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được cấu hình booking");
    } finally {
      setLoading(false);
    }
  }, [basePriceVnd, catalogItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setNotice(null);
    try {
      const parsedIntake = parseJsonField(profileForm.intakeFormJson);
      const res = await apiSend<{ profile: ServiceProfile }>(
        `/api/catalog/items/${catalogItemId}/service-profile`,
        "PATCH",
        {
          bookingEnabled: profileForm.bookingEnabled,
          defaultDurationMinutes: Number(profileForm.defaultDurationMinutes) || 60,
          bufferBeforeMinutes: Number(profileForm.bufferBeforeMinutes) || 0,
          bufferAfterMinutes: Number(profileForm.bufferAfterMinutes) || 0,
          depositRequired: profileForm.depositRequired,
          depositVnd: Number(profileForm.depositVnd) || 0,
          cancellationPolicy: profileForm.cancellationPolicy.trim() || null,
          intakeFormJson: parsedIntake,
          locationMode: profileForm.locationMode,
          location: profileForm.location.trim() || null,
        }
      );
      setProfile(res.profile);
      setProfileForm(profileToForm(res.profile, {}, basePriceVnd));
      setNotice("Đã lưu cấu hình booking.");
      onBookingChanged?.();
    } catch (e) {
      setError(e instanceof SyntaxError ? "JSON biểu mẫu intake không hợp lệ" : e instanceof Error ? e.message : "Không lưu được cấu hình");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditVariation(variation: ServiceVariation) {
    setEditingVariationId(variation.id);
    setVariationForm({
      name: variation.name,
      durationMinutes: String(variation.durationMinutes),
      priceVnd: String(variation.priceVnd),
      description: variation.description ?? "",
      bookingEnabled: variation.bookingEnabled,
    });
    setNotice(null);
    setError(null);
  }

  function resetVariationForm() {
    setEditingVariationId(null);
    setVariationForm(newVariationForm(basePriceVnd));
  }

  async function saveVariation(e: FormEvent) {
    e.preventDefault();
    if (!variationForm.name.trim()) return;
    setSavingVariation(true);
    setError(null);
    setNotice(null);
    const payload = {
      name: variationForm.name.trim(),
      durationMinutes: Number(variationForm.durationMinutes) || 60,
      priceVnd: Number(variationForm.priceVnd) || 0,
      description: variationForm.description.trim() || null,
      bookingEnabled: variationForm.bookingEnabled,
    };
    try {
      const res = editingVariationId
        ? await apiSend<{ variation: ServiceVariation }>(
            `/api/catalog/items/${catalogItemId}/service-variations/${editingVariationId}`,
            "PATCH",
            payload
          )
        : await apiSend<{ variation: ServiceVariation }>(
            `/api/catalog/items/${catalogItemId}/service-variations`,
            "POST",
            payload
          );
      setVariations((prev) => {
        const exists = prev.some((v) => v.id === res.variation.id);
        return exists ? prev.map((v) => (v.id === res.variation.id ? res.variation : v)) : [...prev, res.variation];
      });
      resetVariationForm();
      setNotice(editingVariationId ? "Đã lưu biến thể dịch vụ." : "Đã tạo biến thể dịch vụ.");
      onBookingChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được biến thể");
    } finally {
      setSavingVariation(false);
    }
  }

  async function toggleVariation(variation: ServiceVariation) {
    setError(null);
    setNotice(null);
    try {
      const res = await apiSend<{ variation: ServiceVariation }>(
        `/api/catalog/items/${catalogItemId}/service-variations/${variation.id}`,
        "PATCH",
        { bookingEnabled: !variation.bookingEnabled }
      );
      setVariations((prev) => prev.map((v) => (v.id === variation.id ? res.variation : v)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được biến thể");
    }
  }

  async function removeVariation(variation: ServiceVariation) {
    setError(null);
    setNotice(null);
    try {
      await apiSend<{ variation: ServiceVariation }>(
        `/api/catalog/items/${catalogItemId}/service-variations/${variation.id}`,
        "PATCH",
        { deleted: true }
      );
      setVariations((prev) => prev.filter((v) => v.id !== variation.id));
      if (editingVariationId === variation.id) resetVariationForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không ẩn được biến thể");
    }
  }

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="h-32 animate-pulse rounded-2xl border bg-white" />
        <div className="mt-3 h-48 animate-pulse rounded-2xl border bg-white" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">Booking cho {catalogItemName}</h3>
          <p className="text-xs text-gray-500">Cấu hình lịch hẹn, đặt cọc và gói dịch vụ có thể đặt.</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${profile?.bookingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {profile?.bookingEnabled ? "Đang bật booking" : "Chưa bật booking"}
        </span>
      </div>

      {(error || notice) && (
        <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error ?? notice}
        </div>
      )}

      <form onSubmit={saveProfile} className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={profileForm.bookingEnabled}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, bookingEnabled: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Cho phép đặt lịch dịch vụ này
          </label>
          <button type="submit" disabled={savingProfile} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {savingProfile ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <Field label="Thời lượng mặc định (phút)">
            <input value={profileForm.defaultDurationMinutes} onChange={(e) => setProfileForm((p) => ({ ...p, defaultDurationMinutes: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="Buffer trước (phút)">
            <input value={profileForm.bufferBeforeMinutes} onChange={(e) => setProfileForm((p) => ({ ...p, bufferBeforeMinutes: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="Buffer sau (phút)">
            <input value={profileForm.bufferAfterMinutes} onChange={(e) => setProfileForm((p) => ({ ...p, bufferAfterMinutes: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="Đặt cọc VND">
            <input value={profileForm.depositVnd} onChange={(e) => setProfileForm((p) => ({ ...p, depositVnd: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Field label="Yêu cầu đặt cọc">
            <select value={profileForm.depositRequired ? "true" : "false"} onChange={(e) => setProfileForm((p) => ({ ...p, depositRequired: e.target.value === "true" }))} className={inputCls}>
              <option value="false">Không bắt buộc</option>
              <option value="true">Bắt buộc đặt cọc</option>
            </select>
          </Field>
          <Field label="Hình thức phục vụ">
            <select value={profileForm.locationMode} onChange={(e) => setProfileForm((p) => ({ ...p, locationMode: e.target.value as ServiceLocationMode }))} className={inputCls}>
              {LOCATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Địa điểm mặc định">
            <input value={profileForm.location} onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))} placeholder="Studio, salon, Google Meet..." className={inputCls} />
          </Field>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Field label="Chính sách huỷ lịch">
            <textarea value={profileForm.cancellationPolicy} onChange={(e) => setProfileForm((p) => ({ ...p, cancellationPolicy: e.target.value }))} rows={4} className={`${inputCls} resize-none`} />
          </Field>
          <Field label="Intake form JSON">
            <textarea
              value={profileForm.intakeFormJson}
              onChange={(e) => setProfileForm((p) => ({ ...p, intakeFormJson: e.target.value }))}
              rows={4}
              placeholder='{"questions":["Bạn muốn concept nào?"]}'
              className={`${inputCls} resize-none font-mono text-xs`}
            />
          </Field>
        </div>
      </form>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-bold text-gray-900">Biến thể dịch vụ</h4>
            <p className="text-xs text-gray-500">Ví dụ: chụp 30 phút, gói 2 giờ, tư vấn online.</p>
          </div>
          {variations.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Chưa có biến thể. Booking sẽ dùng thời lượng mặc định của dịch vụ.</div>
          ) : (
            <div className="divide-y">
              {variations.map((variation) => (
                <div key={variation.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{variation.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${variation.bookingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {variation.bookingEnabled ? "Đang nhận lịch" : "Đang tắt"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {variation.durationMinutes} phút · {formatVnd(variation.priceVnd)}
                      {variation.description ? ` · ${variation.description}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void toggleVariation(variation)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                      {variation.bookingEnabled ? "Tắt" : "Bật"}
                    </button>
                    <button type="button" onClick={() => startEditVariation(variation)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void removeVariation(variation)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                      Ẩn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={saveVariation} className="rounded-2xl border bg-white p-4 shadow-sm">
          <h4 className="text-sm font-bold text-gray-900">{editingVariationId ? "Sửa biến thể" : "Thêm biến thể"}</h4>
          <div className="mt-3 space-y-3">
            <Field label="Tên biến thể *">
              <input value={variationForm.name} onChange={(e) => setVariationForm((p) => ({ ...p, name: e.target.value }))} placeholder="Gói tư vấn 60 phút" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thời lượng phút">
                <input value={variationForm.durationMinutes} onChange={(e) => setVariationForm((p) => ({ ...p, durationMinutes: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="Giá VND">
                <input value={variationForm.priceVnd} onChange={(e) => setVariationForm((p) => ({ ...p, priceVnd: digitsOnly(e.target.value) }))} inputMode="numeric" className={inputCls} />
              </Field>
            </div>
            <Field label="Mô tả">
              <textarea value={variationForm.description} onChange={(e) => setVariationForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={variationForm.bookingEnabled} onChange={(e) => setVariationForm((p) => ({ ...p, bookingEnabled: e.target.checked }))} className="h-4 w-4 accent-brand" />
              Cho phép đặt lịch biến thể này
            </label>
            <div className="flex justify-end gap-2">
              {editingVariationId && (
                <button type="button" onClick={resetVariationForm} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
                  Huỷ sửa
                </button>
              )}
              <button type="submit" disabled={savingVariation || !variationForm.name.trim()} className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                {savingVariation ? "Đang lưu..." : editingVariationId ? "Lưu biến thể" : "Thêm biến thể"}
              </button>
            </div>
          </div>
        </form>
      </div>
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
