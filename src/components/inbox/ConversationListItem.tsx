import { Avatar } from "./Avatar";
import { Chip } from "./primitives";
import { displayName, relativeShort } from "./helpers";
import type { ConvItem } from "./types";

const STAGE_DOT: Record<string, string> = {
  COLD: "bg-gray-300",
  WARM: "bg-amber-400",
  HOT: "bg-rose-500",
  CUSTOMER: "bg-emerald-500",
  LOST: "bg-slate-400",
};

const STAGE_LABEL: Record<string, string> = {
  COLD: "Lạnh",
  WARM: "Ấm",
  HOT: "Nóng",
  CUSTOMER: "Khách",
  LOST: "Mất",
};

export function ConversationListItem({
  conv,
  selected,
  showPage,
  onSelect,
}: {
  conv: ConvItem;
  selected: boolean;
  showPage: boolean;
  onSelect: () => void;
}) {
  const name = displayName(conv.customer);
  const last = conv.lastMessage;
  const outbound = last && last.direction !== "INBOUND";
  const unread = !selected && last?.direction === "INBOUND";
  const preview = last?.text?.trim() || "(chưa có tin nhắn)";

  return (
    <button
      onClick={onSelect}
      className={`group relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${
        selected ? "bg-brand-light/70" : "hover:bg-gray-100/70"
      }`}
    >
      {selected && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-brand" />
      )}
      <Avatar name={name} src={conv.customer.avatarUrl} seed={conv.customer.id} status={conv.status} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-[14px] ${
              unread ? "font-bold text-gray-900" : "font-semibold text-gray-800"
            }`}
          >
            {name}
          </span>
          <span className={`shrink-0 text-[11px] ${unread ? "font-semibold text-brand" : "text-gray-400"}`}>
            {relativeShort(conv.lastMessageAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={`truncate text-[12.5px] ${
              unread ? "font-medium text-gray-700" : "text-gray-500"
            }`}
          >
            {outbound && <span className="text-gray-400">Bạn: </span>}
            {preview}
          </span>
          {unread ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
          ) : (
            <span
              className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-gray-400"
              title={`Giai đoạn: ${STAGE_LABEL[conv.customer.currentStage] ?? conv.customer.currentStage}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[conv.customer.currentStage] ?? "bg-gray-300"}`} />
            </span>
          )}
        </span>

        {(showPage && conv.facebookPage) || conv.customer.phone ? (
          <span className="mt-1 flex items-center gap-1">
            {showPage && conv.facebookPage && <Chip>{conv.facebookPage.pageName}</Chip>}
            {conv.customer.phone && (
              <Chip tone="brand" icon="phone">
                {conv.customer.phone}
              </Chip>
            )}
          </span>
        ) : null}
      </span>
    </button>
  );
}
