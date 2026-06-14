import { apiSend } from "@/lib/client";
import type { Comment } from "@/components/comments/types";

// PATCH trạng thái nội bộ (không gọi Graph API) — trả về comment đã cập nhật (kèm include).
export async function patchComment(id: string, body: Record<string, unknown>): Promise<Comment> {
  const res = await apiSend<{ comment: Comment }>(`/api/comments/${id}`, "PATCH", body);
  return res.comment;
}

// Reply qua Graph API (cần page token + pages_manage_engagement). Lỗi quyền sẽ ném Error.
export async function replyComment(id: string, message: string): Promise<void> {
  await apiSend<{ externalReplyId: string | null }>(`/api/comments/${id}/reply`, "POST", { message });
}

// Hide/unhide qua Graph API. Lỗi quyền sẽ ném Error.
export async function hideComment(id: string, hide: boolean): Promise<void> {
  await apiSend<{ hidden: boolean }>(`/api/comments/${id}/hide`, "POST", { hide });
}

// Thông báo lỗi cho thao tác Meta (reply/hide): hiển thị nguyên văn + gợi ý quyền, KHÔNG fake success.
export function metaActionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Không thực hiện được thao tác trên Facebook";
  return `${msg}. Nếu do quyền: Fanpage cần cấp pages_manage_engagement hoặc reconnect ở Cài đặt › Facebook Fanpage.`;
}
