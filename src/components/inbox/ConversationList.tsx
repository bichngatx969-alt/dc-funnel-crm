import { InboxIcon } from "./icons";
import { SkeletonBar } from "./primitives";
import { ConversationListItem } from "./ConversationListItem";
import type { ConvItem } from "./types";

const TABS = [
  { k: "all", l: "Tất cả" },
  { k: "BOT_ACTIVE", l: "Bot" },
  { k: "HUMAN_TAKEOVER", l: "Sale" },
  { k: "CLOSED", l: "Đóng" },
];

export function ConversationList({
  conversations,
  loading,
  selectedId,
  filter,
  search,
  pages,
  pageFilter,
  onSelect,
  onFilter,
  onSearch,
  onPageFilter,
}: {
  conversations: ConvItem[];
  loading: boolean;
  selectedId: string | null;
  filter: string;
  search: string;
  pages: { pageId: string; pageName: string }[];
  pageFilter: string;
  onSelect: (id: string) => void;
  onFilter: (k: string) => void;
  onSearch: (v: string) => void;
  onPageFilter: (v: string) => void;
}) {
  const showPage = pages.length > 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header: tiêu đề + search + tabs */}
      <div className="space-y-3 px-3 pb-2 pt-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[17px] font-bold tracking-tight text-gray-900">Hộp thư</h2>
          {pages.length > 1 && (
            <select
              value={pageFilter}
              onChange={(e) => onPageFilter(e.target.value)}
              className="max-w-[44%] truncate rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 focus:border-brand focus:outline-none"
            >
              <option value="all">Tất cả Fanpage</option>
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>
                  {p.pageName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 transition focus-within:border-brand focus-within:bg-white">
          <InboxIcon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm tên, SĐT, PSID…"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Xóa tìm kiếm"
            >
              <InboxIcon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => onFilter(t.k)}
              className={`flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                filter === t.k
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      <div className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
              <SkeletonBar className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBar className="h-3 w-1/2" />
                <SkeletonBar className="h-3 w-3/4" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
              <InboxIcon name="search" className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-gray-500">Không có hội thoại</p>
            <p className="text-xs text-gray-400">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationListItem
              key={c.id}
              conv={c}
              selected={selectedId === c.id}
              showPage={showPage}
              onSelect={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
