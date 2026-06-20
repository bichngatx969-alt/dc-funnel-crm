import { forwardRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { SkeletonBar } from "./primitives";
import { dayKey, dayLabel, senderBucket } from "./helpers";
import type { Msg } from "./types";

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-gray-400 shadow-sm ring-1 ring-gray-100">
        {dayLabel(iso)}
      </span>
    </div>
  );
}

export const MessageThread = forwardRef<HTMLDivElement, { messages: Msg[]; loading: boolean }>(
  function MessageThread({ messages, loading }, endRef) {
    if (loading) {
      return (
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {[60, 40, 72, 50, 64].map((w, i) => (
            <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
              <SkeletonBar className="h-9 rounded-[18px]" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-gray-400">
          <span className="text-sm">Chưa có tin nhắn trong hội thoại này.</span>
        </div>
      );
    }

    return (
      <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const bucket = senderBucket(m);
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          const firstInGroup = newDay || !prev || senderBucket(prev) !== bucket;
          const lastInGroup =
            !next || senderBucket(next) !== bucket || dayKey(next.createdAt) !== dayKey(m.createdAt);
          return (
            <div key={m.id}>
              {newDay && <DaySeparator iso={m.createdAt} />}
              <MessageBubble msg={m} bucket={bucket} firstInGroup={firstInGroup} lastInGroup={lastInGroup} />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    );
  }
);
