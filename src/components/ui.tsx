import React from "react";

const STAGE_STYLE: Record<string, string> = {
  COLD: "bg-gray-100 text-gray-700",
  WARM: "bg-amber-100 text-amber-800",
  HOT: "bg-rose-100 text-rose-700",
  CUSTOMER: "bg-emerald-100 text-emerald-700",
  LOST: "bg-slate-200 text-slate-600",
};

const STAGE_LABEL: Record<string, string> = {
  COLD: "COLD · lạnh",
  WARM: "WARM · ấm",
  HOT: "HOT · nóng",
  CUSTOMER: "Khách hàng",
  LOST: "Đã mất",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        STAGE_STYLE[stage] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STAGE_LABEL[stage] ?? stage}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  BOT_ACTIVE: "bg-sky-100 text-sky-700",
  HUMAN_TAKEOVER: "bg-amber-100 text-amber-800",
  CLOSED: "bg-gray-200 text-gray-600",
};

const STATUS_LABEL: Record<string, string> = {
  BOT_ACTIVE: "Bot",
  HUMAN_TAKEOVER: "Sale",
  CLOSED: "Đóng",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        STATUS_STYLE[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "bg-rose-600" : score >= 4 ? "bg-amber-500" : "bg-gray-400";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold text-white ${color}`}>
      {score}
    </span>
  );
}

export function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand-dark">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-brand-dark/60 hover:text-rose-600"
          aria-label={`Xóa tag ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
