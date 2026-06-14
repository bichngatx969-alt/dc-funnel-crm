// Kiểu & nhãn UI-local cho Comment-to-Inbox, theo API contract mục 16.5 (Codex sở hữu shape backend).

export type CommentStatus = "OPEN" | "REPLIED" | "HIDDEN" | "ARCHIVED";

export const COMMENT_STATUS_OPTIONS: { value: CommentStatus; label: string }[] = [
  { value: "OPEN", label: "Mới" },
  { value: "REPLIED", label: "Đã phản hồi" },
  { value: "HIDDEN", label: "Đã ẩn" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

export const COMMENT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  COMMENT_STATUS_OPTIONS.map((o) => [o.value, o.label])
);

export const COMMENT_STATUS_CLASS: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700",
  REPLIED: "bg-emerald-100 text-emerald-700",
  HIDDEN: "bg-slate-200 text-slate-600",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export type CommentPage = { pageId: string; pageName: string; pagePictureUrl: string | null } | null;
export type CommentPost = { id: string; externalPostId: string; permalink: string | null; message: string | null } | null;
export type CommentCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  tags: string[];
} | null;
export type CommentConversation = { id: string; status: string; lastMessageAt: string } | null;

export type Comment = {
  id: string;
  pageId: string | null;
  postId: string | null;
  customerId: string | null;
  conversationId: string | null;
  externalPostId: string | null;
  externalCommentId: string;
  message: string | null;
  fromName: string | null;
  fromId: string | null;
  permalink: string | null;
  status: CommentStatus;
  hasPhone: boolean;
  needsFollowUp: boolean;
  isHidden: boolean;
  repliedAt: string | null;
  hiddenAt: string | null;
  externalCreatedAt: string | null;
  createdAt: string;
  facebookPage: CommentPage;
  post: CommentPost;
  customer: CommentCustomer;
  conversation: CommentConversation;
};

export type Pagination = { page: number; pageSize: number; total: number; pageCount: number };

// Bộ lọc nhanh cho sale.
export type QuickFilter = "all" | "hasPhone" | "needsFollowUp" | "replied" | "hidden";

export const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "hasPhone", label: "Có SĐT" },
  { key: "needsFollowUp", label: "Cần xử lý" },
  { key: "replied", label: "Đã phản hồi" },
  { key: "hidden", label: "Đã ẩn" },
];

export function quickFilterParams(key: QuickFilter): Record<string, string> {
  switch (key) {
    case "hasPhone":
      return { hasPhone: "true" };
    case "needsFollowUp":
      return { needsFollowUp: "true" };
    case "replied":
      return { status: "REPLIED" };
    case "hidden":
      return { isHidden: "true" };
    default:
      return {};
  }
}

export function commenterName(c: Comment): string {
  return c.fromName || c.customer?.name || "Người dùng Facebook";
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
