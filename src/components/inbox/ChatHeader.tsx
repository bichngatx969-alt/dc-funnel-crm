import { Avatar } from "./Avatar";
import { IconButton } from "./primitives";
import { InboxIcon } from "./icons";
import { displayName } from "./helpers";

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  BOT_ACTIVE: { label: "Bot đang trả lời", cls: "text-sky-600" },
  HUMAN_TAKEOVER: { label: "Sale đang phụ trách", cls: "text-amber-600" },
  CLOSED: { label: "Đã đóng", cls: "text-gray-400" },
};

export function ChatHeader({
  customer,
  pageName,
  status,
  profileOpen,
  onBack,
  onToggleProfile,
  onTakeover,
  onReturnToBot,
}: {
  customer: { name: string | null; psid: string; avatarUrl: string | null; id: string };
  pageName: string | null;
  status: string | undefined;
  profileOpen: boolean;
  onBack: () => void;
  onToggleProfile: () => void;
  onTakeover: () => void;
  onReturnToBot: () => void;
}) {
  const name = displayName(customer);
  const st = STATUS_TEXT[status ?? ""] ?? { label: "", cls: "text-gray-400" };

  return (
    <div className="flex items-center gap-3 border-b border-gray-100 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      <button
        onClick={onBack}
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 md:hidden"
        aria-label="Quay lại danh sách"
      >
        <InboxIcon name="back" className="h-5 w-5" />
      </button>

      <Avatar name={name} src={customer.avatarUrl} seed={customer.id} status={status} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-gray-900">{name}</div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className={`font-medium ${st.cls}`}>{st.label}</span>
          {pageName && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate text-gray-400">{pageName}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {status === "HUMAN_TAKEOVER" ? (
          <button
            onClick={onReturnToBot}
            className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[12.5px] font-semibold text-sky-700 transition-colors hover:bg-sky-100"
          >
            <InboxIcon name="returnBot" className="h-4 w-4" />
            <span className="hidden sm:inline">Trả về Bot</span>
          </button>
        ) : (
          <button
            onClick={onTakeover}
            className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <InboxIcon name="takeover" className="h-4 w-4" />
            <span className="hidden sm:inline">Tiếp nhận</span>
          </button>
        )}
        <IconButton icon="phone" label="Gọi (sắp có)" disabled />
        <IconButton icon="info" label="Thông tin khách" active={profileOpen} onClick={onToggleProfile} />
      </div>
    </div>
  );
}
