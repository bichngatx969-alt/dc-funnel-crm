import { InboxIcon } from "./icons";

export function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="relative">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-light to-indigo-100 text-brand shadow-soft">
          <InboxIcon name="bot" className="h-10 w-10" />
        </span>
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-violet-500 shadow-soft ring-1 ring-gray-100">
          <InboxIcon name="sparkles" className="h-4 w-4" />
        </span>
      </div>
      <div>
        <h3 className="text-[16px] font-bold text-gray-800">Chọn một hội thoại để bắt đầu</h3>
        <p className="mt-1 max-w-xs text-[13px] text-gray-400">
          Chọn khách ở danh sách bên trái để xem tin nhắn, tiếp nhận và chốt đơn ngay trong hộp thư.
        </p>
      </div>
    </div>
  );
}
