"use client";

import { useState } from "react";
import { formatVnd } from "@/components/money";
import type { Opportunity, OppStatus, PipelineDetail } from "@/components/pipeline/types";

const STATUS_LABEL: Record<OppStatus, string> = {
  OPEN: "Đang mở",
  WON: "Đã chốt",
  LOST: "Thất bại",
};
const STATUS_CLASS: Record<OppStatus, string> = {
  OPEN: "bg-sky-100 text-sky-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-gray-200 text-gray-600",
};

function customerName(o: Opportunity): string {
  const c = o.customer;
  if (!c) return "Khách";
  return c.name || `Khách ${c.psid?.slice(-6) ?? ""}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Kanban: cột = stage (sắp theo position), thẻ = opportunity.
// Đổi stage: kéo-thả (desktop) HOẶC dropdown "chuyển" trên thẻ (fallback + mobile).
export function PipelineBoard({
  detail,
  onMoveStage,
  onSetStatus,
  onAddInStage,
}: {
  detail: PipelineDetail;
  onMoveStage: (oppId: string, stageId: string) => void;
  onSetStatus: (oppId: string, status: OppStatus) => void;
  onAddInStage: (stageId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const stages = [...detail.stages].sort((a, b) => a.position - b.position);

  function handleDrop(stageId: string) {
    if (draggingId) onMoveStage(draggingId, stageId);
    setDraggingId(null);
    setOverStageId(null);
  }

  return (
    <div className="flex-1 overflow-x-auto pb-3">
      <div className="flex h-full w-max gap-3">
        {stages.map((stage) => {
          const opps = detail.opportunities.filter((o) => o.stageId === stage.id);
          const total = opps.reduce((s, o) => s + (o.valueVnd || 0), 0);
          const isOver = overStageId === stage.id;
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStageId(stage.id);
              }}
              onDragLeave={() => setOverStageId((cur) => (cur === stage.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage.id);
              }}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50 ${
                isOver ? "ring-2 ring-brand" : ""
              }`}
            >
              <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stage.color ?? "#cbd5e1" }}
                  />
                  <span className="truncate text-sm font-semibold">{stage.name}</span>
                  <span className="shrink-0 rounded-full bg-gray-200 px-1.5 text-[11px] text-gray-600">
                    {opps.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddInStage(stage.id)}
                  title="Thêm cơ hội vào giai đoạn này"
                  className="shrink-0 rounded px-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  +
                </button>
              </header>

              <div className="px-3 py-1 text-[11px] font-medium text-gray-500">{formatVnd(total)}</div>

              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {opps.length === 0 && (
                  <p className="px-1 py-6 text-center text-[11px] text-gray-400">
                    Chưa có cơ hội. Kéo thẻ vào đây hoặc bấm “+”.
                  </p>
                )}
                {opps.map((o) => (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(o.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", o.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverStageId(null);
                    }}
                    className={`cursor-grab rounded-lg border bg-white p-2.5 shadow-sm active:cursor-grabbing ${
                      draggingId === o.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-gray-900">{o.title}</div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[o.status]}`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-500">
                      {customerName(o)}
                      {o.customer?.phone ? ` · ${o.customer.phone}` : ""}
                    </div>
                    <div className="mt-1 text-sm font-bold text-brand-dark">{formatVnd(o.valueVnd)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                      {o.source && <span className="rounded bg-gray-100 px-1.5 py-0.5">{o.source}</span>}
                      {o.owner?.name && <span>{o.owner.name}</span>}
                      {o.lastActivityAt && <span>· {fmtDate(o.lastActivityAt)}</span>}
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <select
                        value={o.stageId}
                        onChange={(e) => onMoveStage(o.id, e.target.value)}
                        title="Chuyển giai đoạn"
                        className="min-w-0 flex-1 rounded border px-1.5 py-1 text-[11px] focus:border-brand focus:outline-none"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={o.status}
                        onChange={(e) => onSetStatus(o.id, e.target.value as OppStatus)}
                        title="Trạng thái"
                        className="shrink-0 rounded border px-1 py-1 text-[11px] focus:border-brand focus:outline-none"
                      >
                        <option value="OPEN">Đang mở</option>
                        <option value="WON">Đã chốt</option>
                        <option value="LOST">Thất bại</option>
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
