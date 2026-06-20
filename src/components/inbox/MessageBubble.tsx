import { InboxIcon } from "./icons";
import { fmtTime } from "./helpers";
import type { Msg } from "./types";

export function MessageBubble({
  msg,
  bucket,
  firstInGroup,
  lastInGroup,
}: {
  msg: Msg;
  bucket: string;
  firstInGroup: boolean;
  lastInGroup: boolean;
}) {
  const quickReplies: any[] | undefined = msg.payloadJson?.quick_replies;

  // System: pill căn giữa.
  if (bucket === "system") {
    return (
      <div className="my-1 flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-500">
          {msg.text || "(thông báo hệ thống)"}
        </span>
      </div>
    );
  }

  const incoming = bucket === "in";
  const bot = bucket === "bot";

  const tone = incoming
    ? "bg-white text-gray-800 border border-gray-200/80"
    : bot
    ? "bg-indigo-50 text-indigo-900 border border-indigo-100"
    : "bg-gradient-to-br from-brand to-brand-dark text-white";

  // Bo góc kiểu nhóm: góc sát phía người gửi thu nhỏ khi liền mạch.
  const corner = incoming
    ? `${firstInGroup ? "" : "rounded-tl-md"} ${lastInGroup ? "" : "rounded-bl-md"}`
    : `${firstInGroup ? "" : "rounded-tr-md"} ${lastInGroup ? "" : "rounded-br-md"}`;

  return (
    <div className={`flex flex-col ${incoming ? "items-start" : "items-end"} ${lastInGroup ? "mb-2" : "mb-0.5"}`}>
      <div
        className={`max-w-[78%] rounded-[18px] px-3.5 py-2 text-[14px] leading-relaxed shadow-sm ${tone} ${corner}`}
      >
        <div className="whitespace-pre-wrap break-words">{msg.text || "(không có nội dung)"}</div>
        {quickReplies && quickReplies.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {quickReplies.map((q: any, i: number) => (
              <span
                key={i}
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  incoming ? "bg-gray-100 text-gray-600" : bot ? "bg-white/70 text-indigo-700" : "bg-white/20 text-white"
                }`}
              >
                {q.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {lastInGroup && (
        <div className="mt-1 flex items-center gap-1 px-1 text-[10.5px] text-gray-400">
          {bot && <InboxIcon name="bot" className="h-3 w-3" />}
          {!incoming && (
            <span className="font-medium">{bot ? "Bot" : "Sale"}</span>
          )}
          <span>{fmtTime(msg.createdAt)}</span>
        </div>
      )}
    </div>
  );
}
