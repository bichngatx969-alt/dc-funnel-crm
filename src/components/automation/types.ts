// Kiểu & nhãn UI-local cho Automation, theo API contract mục 16.6 (Codex sở hữu shape backend).

export const TRIGGER_OPTIONS: { value: string; label: string }[] = [
  { value: "CONTACT_CREATED", label: "Khách mới được tạo" },
  { value: "CONTACT_STAGE_CHANGED", label: "Khách đổi giai đoạn" },
  { value: "OPPORTUNITY_CREATED", label: "Cơ hội mới" },
  { value: "OPPORTUNITY_STAGE_CHANGED", label: "Cơ hội đổi giai đoạn" },
  { value: "ORDER_CREATED", label: "Đơn mới được tạo" },
  { value: "ORDER_STATUS_CHANGED", label: "Đơn đổi trạng thái" },
  { value: "COMMENT_CREATED", label: "Có bình luận mới" },
  { value: "COMMENT_HAS_PHONE", label: "Bình luận có SĐT" },
  { value: "TASK_DUE_SOON", label: "Việc sắp đến hạn" },
  { value: "MANUAL_TEST", label: "Chạy thử thủ công" },
];

export const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "CREATE_TASK", label: "Tạo việc cần làm" },
  { value: "ADD_TAG", label: "Gắn tag khách" },
  { value: "UPDATE_CONTACT_STAGE", label: "Đổi giai đoạn khách" },
  { value: "CREATE_NOTE", label: "Ghi chú nội bộ" },
  { value: "MARK_COMMENT_FOLLOWUP", label: "Đánh dấu comment cần xử lý" },
  { value: "SEND_EMAIL", label: "Gửi email" },
  { value: "WEBHOOK", label: "Gọi webhook" },
  { value: "NOOP", label: "Không làm gì (test)" },
];

export const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TRIGGER_OPTIONS.map((o) => [o.value, o.label]));
export const ACTION_LABEL: Record<string, string> = Object.fromEntries(ACTION_OPTIONS.map((o) => [o.value, o.label]));

// Hành động bị khóa an toàn ở MVP (engine trả SKIPPED, không gửi thật).
export const LOCKED_ACTIONS = ["SEND_EMAIL", "WEBHOOK"];
export const LOCKED_ACTION_WARNING = "Hành động này hiện đang bị khóa an toàn, chưa gửi thật trong MVP.";

export const RUN_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Thành công",
  FAILED: "Lỗi",
  SKIPPED: "Bỏ qua",
};
export const RUN_STATUS_CLASS: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
  SKIPPED: "bg-amber-100 text-amber-800",
};

export const RUN_STATUS_OPTIONS = [
  { value: "SUCCESS", label: "Thành công" },
  { value: "FAILED", label: "Lỗi" },
  { value: "SKIPPED", label: "Bỏ qua" },
];

export type RuleUser = { id: string; name: string | null; email: string } | null;

export type Rule = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  actionType: string;
  conditionsJson: unknown;
  actionConfigJson: unknown;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: RuleUser;
  _count?: { runs: number };
};

export type Template = {
  name: string;
  triggerType: string;
  actionType: string;
  conditionsJson: unknown;
  actionConfigJson: unknown;
};

export type Run = {
  id: string;
  ruleId: string;
  triggerType: string;
  sourceType: string | null;
  sourceId: string | null;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  inputJson: unknown;
  outputJson: unknown;
  error: string | null;
  createdAt: string;
  rule?: { id: string; name: string; triggerType: string; actionType: string; isActive: boolean } | null;
};

export type Pagination = { page: number; pageSize: number; total: number; pageCount: number };

// Nhãn tiếng Việt dễ hiểu cho 4 template (key theo trigger:action). Fallback về tên API.
const TEMPLATE_LABELS: Record<string, string> = {
  "COMMENT_HAS_PHONE:CREATE_TASK": "Bình luận có SĐT → tạo việc gọi lại",
  "CONTACT_CREATED:CREATE_TASK": "Khách mới → tạo việc follow-up",
  "ORDER_STATUS_CHANGED:ADD_TAG": "Đơn hoàn tất → gắn tag khách hàng",
  "OPPORTUNITY_STAGE_CHANGED:CREATE_NOTE": "Cơ hội đổi giai đoạn → ghi chú",
};

export function templateLabel(t: Template): string {
  return TEMPLATE_LABELS[`${t.triggerType}:${t.actionType}`] ?? t.name;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

// Parse JSON từ textarea: rỗng -> null; lỗi -> ném Error để UI báo.
export function parseJsonField(text: string, fieldLabel: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${fieldLabel} không phải JSON hợp lệ`);
  }
}

export function stringifyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}
