import { useEffect, useRef } from "react";
import { InboxIcon } from "./icons";
import { IconButton } from "./primitives";

export function ChatComposer({
  value,
  onChange,
  onSend,
  sending,
  aiEnabled,
  aiLoading,
  onAiSuggest,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  aiEnabled: boolean;
  aiLoading: boolean;
  onAiSuggest: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow chiều cao theo nội dung (tối đa ~6 dòng).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !sending;

  return (
    <div className="border-t border-gray-100 bg-white/80 px-3 py-3 backdrop-blur-sm sm:px-4">
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-0.5 pb-1">
          <IconButton icon="smile" label="Emoji (sắp có)" disabled />
          <IconButton icon="attach" label="Đính kèm (sắp có)" disabled />
          {aiEnabled && (
            <IconButton
              icon="sparkles"
              label="Gợi ý trả lời (AI)"
              onClick={onAiSuggest}
              disabled={aiLoading}
              className={aiLoading ? "animate-pulse text-violet-500" : "text-violet-500 hover:bg-violet-50"}
            />
          )}
        </div>

        <div className="flex flex-1 items-end rounded-[22px] border border-gray-200 bg-gray-50 px-3.5 py-2 transition focus-within:border-brand focus-within:bg-white">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            rows={1}
            placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
            className="scroll-thin max-h-[140px] min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Gửi tin nhắn"
          className={`mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
            canSend
              ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md hover:shadow-lg active:scale-95"
              : "bg-gray-100 text-gray-300"
          }`}
        >
          <InboxIcon name="send" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
