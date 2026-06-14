"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiSend } from "@/lib/client";
import {
  GENDER_OPTIONS,
  STAGE_OPTIONS,
  toDateInput,
  type ContactDetail,
  type ContactListItem,
  type Stage,
} from "@/components/contacts/types";

type Mode = "create" | "edit";

// Modal dùng chung cho tạo mới (POST /api/contacts) và sửa (PATCH /api/contacts/:id).
export function ContactFormModal({
  mode,
  contact,
  onClose,
  onSaved,
}: {
  mode: Mode;
  contact?: ContactListItem | ContactDetail | null;
  onClose: () => void;
  onSaved: (saved: ContactDetail) => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [gender, setGender] = useState(contact?.gender ?? "");
  const [birthday, setBirthday] = useState(toDateInput(contact?.birthday ?? null));
  const [address, setAddress] = useState(contact?.address ?? "");
  const [source, setSource] = useState(contact?.source ?? "");
  const [currentStage, setCurrentStage] = useState<Stage>(contact?.currentStage ?? "COLD");
  const [leadScore, setLeadScore] = useState(String(contact?.leadScore ?? 0));
  const [tagsText, setTagsText] = useState((contact?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "create" && !name.trim() && !phone.trim() && !email.trim()) {
      setError("Cần ít nhất tên, số điện thoại hoặc email");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      name: name.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      gender: gender.trim() || null,
      birthday: birthday || null,
      address: address.trim() || null,
      source: source.trim() || null,
      currentStage,
      leadScore: Number(leadScore) || 0,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const res =
        mode === "create"
          ? await apiSend<{ contact: ContactDetail }>("/api/contacts", "POST", payload)
          : await apiSend<{ contact: ContactDetail }>(`/api/contacts/${contact!.id}`, "PATCH", payload);
      onSaved(res.contact);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được contact");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">{mode === "create" ? "Thêm khách hàng" : "Sửa thông tin khách"}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tên khách">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nguyễn Văn A" />
            </Field>
            <Field label="Số điện thoại">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} placeholder="09xxxxxxxx" />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={inputCls} placeholder="email@vidu.com" />
            </Field>
            <Field label="Giới tính">
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ngày sinh">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Giai đoạn">
              <select value={currentStage} onChange={(e) => setCurrentStage(e.target.value as Stage)} className={inputCls}>
                {STAGE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Địa chỉ">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Số nhà, đường, quận, tỉnh/thành" />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nguồn / kênh">
              <input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="facebook, comment, ads…" />
            </Field>
            <Field label="Lead score">
              <input
                value={leadScore}
                onChange={(e) => setLeadScore(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className={inputCls}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Tags (phân cách bằng dấu phẩy)">
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={inputCls} placeholder="vip, hoi_gia, can_goi_lai" />
          </Field>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Huỷ
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Đang lưu…" : mode === "create" ? "Tạo khách" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}
