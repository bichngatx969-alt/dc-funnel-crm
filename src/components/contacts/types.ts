// Kiểu UI-local cho Contact 360, theo API contract mục 16.3 (Codex sở hữu shape backend).

export type Stage = "COLD" | "WARM" | "HOT" | "CUSTOMER" | "LOST";

export type ContactOwner = { id: string; name: string | null; email: string } | null;
export type ContactPage = { pageId: string; pageName: string; pagePictureUrl: string | null } | null;
export type ContactCounts = { conversations: number; tasks: number; opportunities: number; notes: number };

export type ContactListItem = {
  id: string;
  psid?: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthday: string | null;
  address: string | null;
  source: string | null;
  currentStage: Stage;
  leadScore: number;
  tags: string[];
  lastActivityAt: string | null;
  createdAt: string;
  owner: ContactOwner;
  facebookPage: ContactPage;
  _count: ContactCounts;
};

export type Pagination = { page: number; pageSize: number; total: number; pageCount: number };

export type ContactMessage = {
  id: string;
  direction: string;
  senderType: string;
  text: string | null;
  createdAt: string;
};
export type ContactConversation = {
  id: string;
  status: string;
  lastMessageAt: string;
  assignedTo: ContactOwner;
  messages: ContactMessage[];
};
export type ContactTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  dueAt: string | null;
  assignedTo: ContactOwner;
};
export type ContactOpportunity = {
  id: string;
  title: string;
  valueVnd: number;
  status: string;
  pipeline: { id: string; name: string } | null;
  stage: { id: string; name: string; position: number; color: string | null } | null;
  owner: ContactOwner;
};
export type ContactNote = { id: string; body: string; createdAt: string; author: ContactOwner };

export type ContactDetail = ContactListItem & {
  psid: string;
  emailConsent: boolean;
  emailStatus: string;
  conversations: ContactConversation[];
  tasks: ContactTask[];
  opportunities: ContactOpportunity[];
  notes: ContactNote[];
};

export type TimelineItem = {
  id: string;
  type: "note.created" | "conversation.activity" | "task.activity" | "opportunity.activity";
  occurredAt: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
};

export const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: "COLD", label: "Lạnh" },
  { value: "WARM", label: "Ấm" },
  { value: "HOT", label: "Nóng" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "LOST", label: "Đã mất" },
];

export const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];

export function contactName(c: { name: string | null; phone?: string | null; psid?: string }): string {
  return c.name || c.phone || (c.psid ? `Khách ${c.psid.slice(-6)}` : "Khách");
}

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
