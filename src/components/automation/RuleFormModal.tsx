"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiSend } from "@/lib/client";
import {
  ACTION_OPTIONS,
  LOCKED_ACTION_WARNING,
  LOCKED_ACTIONS,
  TRIGGER_OPTIONS,
  parseJsonField,
  stringifyJson,
  type Rule,
} from "@/components/automation/types";

type Initial = {
  name?: string;
  description?: string | null;
  triggerType?: string;
  actionType?: string;
  conditionsJson?: unknown;
  actionConfigJson?: unknown;
  isActive?: boolean;
};

const inputCls = "w-full rounded border px-2 py-2 text-sm focus:border-brand focus:outline-none";

// Modal tạo/sửa rule. Dùng cho: tạo mới, tạo từ template (initial), và sửa (mode=edit + rule).
export function RuleFormModal({
  mode,
  rule,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  rule?: Rule | null;
  initial?: Initial | null;
  onClose: () => void;
  onSaved: (rule: Rule) => void;
}) {
  const base: Initial = mode === "edit" && rule ? rule : initial ?? {};
  const [name, setName] = useState(base.name ?? "");
  const [description, setDescription] = useState(base.description ?? "");
  const [triggerType, setTriggerType] = useState(base.triggerType ?? "CONTACT_CREATED");
  const [actionType, setActionType] = useState(base.actionType ?? "CREATE_TASK");
  const [conditionsText, setConditionsText] = useState(stringifyJson(base.conditionsJson));
  const [actionConfigText, setActionConfigText] = useState(stringifyJson(base.actionConfigJson));
  const [isActive, setIsActive] = useState(base.isActive ?? true);
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
    if (!name.trim()) {
      setError("Vui lòng nhập tên quy tắc");
      return;
    }
    let conditionsJson: unknown;
    let actionConfigJson: unknown;
    try {
      conditionsJson = parseJsonField(conditionsText, "Điều kiện (JSON)");
      actionConfigJson = parseJsonField(actionConfigText, "Cấu hình hành động (JSON)");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "JSON không hợp lệ");
      return;
    }

    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      triggerType,
      actionType,
      conditionsJson,
      actionConfigJson,
      isActive,
    };
    try {
      const res =
        mode === "edit" && rule
          ? await apiSend<{ rule: Rule }>(`/api/automation/rules/${rule.id}`, "PATCH", payload)
          : await apiSend<{ rule: Rule }>("/api/automation/rules", "POST", payload);
      onSaved(res.rule);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được quy tắc");
      setBusy(false);
    }
  }

  const locked = LOCKED_ACTIONS.includes(actionType);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">{mode === "edit" ? "Sửa quy tắc" : "Tạo quy tắc tự động"}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Tên quy tắc *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="VD: Khách mới → tạo việc follow-up" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Mô tả</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Mô tả ngắn (tuỳ chọn)" />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">Khi nào (kích hoạt)</span>
              <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={inputCls}>
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-500">Thì làm gì (hành động)</span>
              <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={inputCls}>
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {locked && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠️ {LOCKED_ACTION_WARNING}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Điều kiện (JSON, tuỳ chọn)</span>
            <textarea
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder='VD: {"status": "COMPLETED"}'
              className={`${inputCls} font-mono text-xs`}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-500">Cấu hình hành động (JSON, tuỳ chọn)</span>
            <textarea
              value={actionConfigText}
              onChange={(e) => setActionConfigText(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder='VD: {"title": "Gọi lại khách", "dueMinutes": 30}'
              className={`${inputCls} font-mono text-xs`}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
            <span>Bật quy tắc này</span>
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              Huỷ
            </button>
            <button type="submit" disabled={busy} className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {busy ? "Đang lưu…" : mode === "edit" ? "Lưu thay đổi" : "Tạo quy tắc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
