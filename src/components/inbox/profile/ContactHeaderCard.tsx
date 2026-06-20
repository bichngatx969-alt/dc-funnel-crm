import { Avatar } from "../Avatar";
import { Chip } from "../primitives";
import { InboxIcon } from "../icons";
import { ScoreBadge, StageBadge } from "@/components/ui";
import { displayName } from "../helpers";

type Stat = { label: string; value: string; tone?: "default" | "brand" | "emerald" };

export function ContactHeaderCard({
  customer,
  pageName,
  source,
  stats,
  onClose,
  onCreateOrder,
  onCreateTask,
  onCreateNote,
}: {
  customer: { id: string; name: string | null; psid: string; avatarUrl: string | null; currentStage: string; leadScore: number };
  pageName: string | null;
  source: string | null;
  stats: Stat[];
  onClose: () => void;
  onCreateOrder: () => void;
  onCreateTask: () => void;
  onCreateNote: () => void;
}) {
  const name = displayName(customer);
  const toneCls: Record<string, string> = {
    default: "text-gray-800",
    brand: "text-brand-dark",
    emerald: "text-emerald-700",
  };

  return (
    <div className="border-b border-gray-100 px-4 pb-4 pt-5">
      <div className="relative flex flex-col items-center gap-2 text-center">
        <button
          onClick={onClose}
          className="absolute -right-1 -top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 xl:hidden"
          aria-label="Đóng"
        >
          <InboxIcon name="close" className="h-4 w-4" />
        </button>
        <Avatar name={name} src={customer.avatarUrl} seed={customer.id} size="lg" />
        <div>
          <div className="text-[16px] font-bold text-gray-900">{name}</div>
          <div className="text-[11px] text-gray-400">PSID {customer.psid}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <StageBadge stage={customer.currentStage} />
          <ScoreBadge score={customer.leadScore} />
          {pageName && <Chip icon="source">{pageName}</Chip>}
          {source && !pageName && <Chip>{source}</Chip>}
        </div>
      </div>

      {/* Stat band — số liệu quan trọng luôn ở trên cùng */}
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-gray-50 px-2 py-2 text-center">
            <div className={`truncate text-[13px] font-bold ${toneCls[s.tone ?? "default"]}`}>{s.value}</div>
            <div className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <QuickBtn icon="cart" label="Tạo đơn" onClick={onCreateOrder} primary />
        <QuickBtn icon="takeover" label="Tạo task" onClick={onCreateTask} />
        <QuickBtn icon="note" label="Ghi chú" onClick={onCreateNote} />
      </div>
    </div>
  );
}

function QuickBtn({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: "cart" | "takeover" | "note";
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-semibold transition-colors ${
        primary
          ? "bg-gradient-to-br from-brand to-brand-dark text-white hover:shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <InboxIcon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}
