import { InboxIcon } from "./icons";

export function AiSuggestionBar({
  suggestion,
  onCopy,
  onInsert,
  onSend,
  onDismiss,
}: {
  suggestion: string;
  onCopy: () => void;
  onInsert: () => void;
  onSend: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-3 mb-1 rounded-2xl border border-violet-200 bg-violet-50/80 p-3 sm:mx-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          <InboxIcon name="sparkles" className="h-3.5 w-3.5" />
          Gợi ý từ AI
        </span>
        <button
          onClick={onDismiss}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-violet-400 hover:bg-violet-100"
          aria-label="Bỏ gợi ý"
        >
          <InboxIcon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-800">{suggestion}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          onClick={onSend}
          className="rounded-full bg-gradient-to-br from-brand to-brand-dark px-3 py-1 text-[12px] font-semibold text-white hover:shadow-sm"
        >
          Gửi ngay
        </button>
        <button
          onClick={onInsert}
          className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Đưa vào ô soạn
        </button>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          <InboxIcon name="copy" className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
    </div>
  );
}
