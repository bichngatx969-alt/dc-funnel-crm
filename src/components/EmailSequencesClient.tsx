"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";

type TemplateLite = { id: string; name: string };
type Step = { templateId: string; delayMinutes: number; order: number };
type Sequence = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerValue: string | null;
  isActive: boolean;
  steps: { id: string; templateId: string; delayMinutes: number; order: number; template?: TemplateLite }[];
  _count?: { enrollments: number };
};

const TRIGGERS = [
  "TAG_ADDED",
  "STAGE_CHANGED",
  "FORM_SUBMITTED",
  "MANUAL",
  "PURCHASED",
  "BOOKING_CREATED",
];

const TRIGGER_HINT: Record<string, string> = {
  TAG_ADDED: "tag (vd: hoi_combo)",
  STAGE_CHANGED: "stage (vd: HOT)",
  FORM_SUBMITTED: "để trống = mọi form/consent",
  MANUAL: "để trống (enroll thủ công)",
  PURCHASED: "để trống hoặc giá trị",
  BOOKING_CREATED: "để trống hoặc giá trị",
};

export function EmailSequencesClient() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [templates, setTemplates] = useState<TemplateLite[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", description: "", triggerType: "TAG_ADDED", triggerValue: "", isActive: true });

  async function load() {
    try {
      const [seqs, tpls] = await Promise.all([
        apiGet<Sequence[]>("/api/email/sequences"),
        apiGet<TemplateLite[]>("/api/email/templates"),
      ]);
      setSequences(
        seqs.map((s) => ({ ...s, steps: s.steps.map((st) => ({ ...st })) }))
      );
      setTemplates(tpls);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function createSeq() {
    setErr(null);
    if (!form.name.trim()) return setErr("Nhập tên sequence");
    try {
      await apiSend("/api/email/sequences", "POST", {
        name: form.name,
        description: form.description,
        triggerType: form.triggerType,
        triggerValue: form.triggerValue || null,
        isActive: form.isActive,
        steps: [],
      });
      setForm({ name: "", description: "", triggerType: "TAG_ADDED", triggerValue: "", isActive: true });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function updateSeq(id: string, patch: Partial<Sequence>) {
    setSequences((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function addStep(seq: Sequence) {
    if (!templates.length) return setErr("Hãy tạo template trước");
    updateSeq(seq.id, {
      steps: [...seq.steps, { id: `new-${Date.now()}`, templateId: templates[0].id, delayMinutes: 0, order: seq.steps.length }],
    });
  }
  function updateStep(seq: Sequence, idx: number, patch: Partial<Step>) {
    const steps = seq.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateSeq(seq.id, { steps });
  }
  function removeStep(seq: Sequence, idx: number) {
    updateSeq(seq.id, { steps: seq.steps.filter((_, i) => i !== idx) });
  }

  async function saveSeq(seq: Sequence) {
    setErr(null);
    setSavedId(null);
    try {
      await apiSend(`/api/email/sequences/${seq.id}`, "PUT", {
        name: seq.name,
        description: seq.description,
        triggerType: seq.triggerType,
        triggerValue: seq.triggerValue || null,
        isActive: seq.isActive,
        steps: seq.steps.map((s, i) => ({ templateId: s.templateId, delayMinutes: Number(s.delayMinutes) || 0, order: i })),
      });
      setSavedId(seq.id);
      await load();
      setTimeout(() => setSavedId(null), 2500);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function removeSeq(seq: Sequence) {
    if (!confirm(`Xóa sequence "${seq.name}"?`)) return;
    try {
      await apiSend(`/api/email/sequences/${seq.id}`, "DELETE");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-2xl font-bold">Email Sequences</h1>
      <p className="mb-4 text-sm text-gray-500">
        Sequence tự enroll khách khi trigger khớp (TAG_ADDED, STAGE_CHANGED=HOT, FORM_SUBMITTED khi consent...). Cron sẽ gửi từng step theo delay.
      </p>

      {err && <div className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      {/* Create */}
      <div className="mb-6 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Tạo sequence</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="seqinp" placeholder="Tên *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="seqinp" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="seqinp" value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}>
            {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="seqinp" placeholder={`triggerValue — ${TRIGGER_HINT[form.triggerType]}`} value={form.triggerValue} onChange={(e) => setForm({ ...form, triggerValue: e.target.value })} />
        </div>
        <button onClick={createSeq} className="mt-3 rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Tạo sequence</button>
      </div>

      {/* List */}
      <div className="space-y-5">
        {sequences.length === 0 && <p className="text-sm text-gray-400">Chưa có sequence nào.</p>}
        {sequences.map((seq) => (
          <div key={seq.id} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1">
                <input className="seqinp max-w-xs font-semibold" value={seq.name} onChange={(e) => updateSeq(seq.id, { name: e.target.value })} />
                <div className="mt-1 text-xs text-gray-500">
                  <select className="rounded border px-1 py-0.5 text-xs" value={seq.triggerType} onChange={(e) => updateSeq(seq.id, { triggerType: e.target.value })}>
                    {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>{" "}
                  <input className="rounded border px-1 py-0.5 text-xs" placeholder={TRIGGER_HINT[seq.triggerType]} value={seq.triggerValue ?? ""} onChange={(e) => updateSeq(seq.id, { triggerValue: e.target.value })} />
                  {" · "}{seq._count?.enrollments ?? 0} enrollment
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={seq.isActive} onChange={(e) => updateSeq(seq.id, { isActive: e.target.checked })} /> Active</label>
                {savedId === seq.id && <span className="text-xs text-emerald-600">Đã lưu ✓</span>}
                <button onClick={() => saveSeq(seq)} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">Lưu</button>
                <button onClick={() => removeSeq(seq)} className="text-xs text-rose-600 hover:underline">Xóa</button>
              </div>
            </div>

            <div className="space-y-2">
              {seq.steps.map((s, idx) => (
                <div key={s.id ?? idx} className="flex flex-wrap items-center gap-2 rounded border bg-gray-50 p-2 text-sm">
                  <span className="font-mono text-xs text-gray-500">#{idx + 1}</span>
                  <select className="rounded border px-2 py-1 text-sm" value={s.templateId} onChange={(e) => updateStep(seq, idx, { templateId: e.target.value })}>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <label className="text-xs text-gray-500">delay (phút):</label>
                  <input type="number" className="w-24 rounded border px-2 py-1 text-sm" value={s.delayMinutes} onChange={(e) => updateStep(seq, idx, { delayMinutes: Number(e.target.value) })} />
                  <button onClick={() => removeStep(seq, idx)} className="text-xs text-rose-600 hover:underline">xóa step</button>
                </div>
              ))}
              <button onClick={() => addStep(seq)} className="rounded bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300">+ Thêm step</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .seqinp { width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.4rem 0.55rem; font-size: 0.875rem; }
        .seqinp:focus { outline: none; border-color: #e11d6b; }
      `}</style>
    </div>
  );
}
