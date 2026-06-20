"use client";

import { useState } from "react";
import { ProfileBlock, BlockEmpty } from "./ProfileBlock";
import { fmtDateTime, type ContactNote } from "@/components/contacts/types";

export function InternalNotesBlock({
  notes,
  onAddNote,
}: {
  notes: ContactNote[];
  onAddNote: (body: string) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const b = value.trim();
    if (!b) return;
    setBusy(true);
    try {
      await onAddNote(b);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileBlock id="block-notes" title="Ghi chú nội bộ" icon="note" collapsible defaultOpen>
      <div className="mb-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder="Thêm ghi chú nội bộ về khách…"
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
        />
        <div className="mt-1.5 flex justify-end">
          <button
            onClick={submit}
            disabled={busy || !value.trim()}
            className="rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Đang lưu…" : "Lưu ghi chú"}
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <BlockEmpty text="Chưa có ghi chú." />
      ) : (
        <ul className="space-y-1.5">
          {notes.slice(0, 3).map((n) => (
            <li key={n.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="whitespace-pre-wrap text-[13px] text-gray-700">{n.body}</p>
              <div className="mt-1 text-[10.5px] text-gray-400">
                {n.author?.name ?? n.author?.email ?? "Ẩn danh"} · {fmtDateTime(n.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProfileBlock>
  );
}
