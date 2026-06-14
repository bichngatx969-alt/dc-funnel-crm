"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "@/lib/client";
import { ScoreBadge, StageBadge, StatusBadge, Tag } from "@/components/ui";
import { EmptyState } from "@/components/EmptyState";
import { formatVnd } from "@/components/money";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import {
  contactName,
  fmtDate,
  fmtDateTime,
  type ContactDetail,
  type ContactNote,
  type TimelineItem,
} from "@/components/contacts/types";
import { OrderFormModal } from "@/components/orders/OrderFormModal";
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_CLASS,
  PAYMENT_STATUS_LABEL,
  type Order,
} from "@/components/orders/types";

type Tab = "timeline" | "conversations" | "opportunities" | "tasks" | "notes" | "orders";

const TASK_STATUS_LABEL: Record<string, string> = { TODO: "Cần làm", DONE: "Xong", CANCELLED: "Huỷ" };
const OPP_STATUS_LABEL: Record<string, string> = { OPEN: "Đang mở", WON: "Đã chốt", LOST: "Thất bại" };
const TIMELINE_ICON: Record<TimelineItem["type"], string> = {
  "note.created": "📝",
  "conversation.activity": "💬",
  "task.activity": "✓",
  "opportunity.activity": "🎯",
};

export function ContactDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("timeline");
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [showOrder, setShowOrder] = useState(false);

  const loadDetail = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<{ contact: ContactDetail }>(`/api/contacts/${id}`);
      setDetail(data.contact);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được khách hàng");
    }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    try {
      const data = await apiGet<{ items: TimelineItem[] }>(`/api/contacts/${id}/timeline`);
      setTimeline(data.items ?? []);
    } catch {
      // timeline lỗi không chặn trang
    }
  }, [id]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await apiGet<{ items: Order[] }>(`/api/orders?customerId=${id}&pageSize=100`);
      setOrders(data.items ?? []);
    } catch {
      setOrders([]);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDetail(), loadTimeline(), loadOrders()]);
      setLoading(false);
    })();
  }, [loadDetail, loadTimeline, loadOrders]);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    const body = noteText.trim();
    if (!body) return;
    setNoteBusy(true);
    try {
      const res = await apiSend<{ note: ContactNote }>(`/api/contacts/${id}/notes`, "POST", { body });
      setNoteText("");
      setDetail((d) => (d ? { ...d, notes: [res.note, ...d.notes] } : d));
      loadTimeline();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thêm được ghi chú");
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-xl border bg-white" />
        <div className="h-64 animate-pulse rounded-xl border bg-white" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <EmptyState
        title="Không tải được khách hàng"
        description={error}
        action={
          <div className="flex gap-2">
            <button onClick={loadDetail} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Thử lại
            </button>
            <Link href="/contacts" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
              Về danh sách
            </Link>
          </div>
        }
      />
    );
  }

  if (!detail) return null;

  const c = detail;
  const counts = c._count;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/contacts" className="text-sm text-gray-500 hover:text-gray-800">
          ‹ Danh sách khách
        </Link>
        <div className="flex gap-2">
          <button onClick={() => setShowOrder(true)} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Tạo đơn
          </button>
          <button onClick={() => setEditing(true)} className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            Sửa thông tin
          </button>
        </div>
      </div>

      {/* Header + thông tin */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={c.leadScore} />
          <h1 className="text-xl font-bold">{contactName(c)}</h1>
          <StageBadge stage={c.currentStage} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Info label="SĐT" value={c.phone} />
          <Info label="Email" value={c.email} />
          <Info label="Giới tính" value={c.gender} />
          <Info label="Ngày sinh" value={fmtDate(c.birthday) || null} />
          <Info label="Địa chỉ" value={c.address} />
          <Info label="Nguồn" value={c.source} />
          <Info label="Phụ trách" value={c.owner?.name ?? c.owner?.email ?? null} />
          <Info label="Fanpage" value={c.facebookPage?.pageName ?? null} />
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-gray-500">Tags</span>
          {c.tags.length === 0 ? (
            <span className="text-xs text-gray-400">Chưa có tag</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {c.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b text-sm">
        <TabBtn active={tab === "timeline"} onClick={() => setTab("timeline")} label="Tổng quan" />
        <TabBtn active={tab === "conversations"} onClick={() => setTab("conversations")} label={`Hội thoại (${counts.conversations})`} />
        <TabBtn active={tab === "opportunities"} onClick={() => setTab("opportunities")} label={`Cơ hội (${counts.opportunities})`} />
        <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")} label={`Việc cần làm (${counts.tasks})`} />
        <TabBtn active={tab === "notes"} onClick={() => setTab("notes")} label={`Ghi chú (${counts.notes})`} />
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} label={`Đơn hàng (${orders?.length ?? 0})`} />
      </div>

      {tab === "timeline" && (
        <Section>
          {timeline.length === 0 ? (
            <EmptyState title="Chưa có hoạt động" description="Hội thoại, cơ hội, việc cần làm và ghi chú của khách sẽ hiện theo dòng thời gian ở đây." />
          ) : (
            <ol className="space-y-3">
              {timeline.map((it) => (
                <li key={`${it.type}-${it.id}`} className="flex gap-3">
                  <div className="mt-0.5 text-lg" aria-hidden>
                    {TIMELINE_ICON[it.type]}
                  </div>
                  <div className="min-w-0 flex-1 border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{it.title}</span>
                      <span className="shrink-0 text-xs text-gray-400">{fmtDateTime(it.occurredAt)}</span>
                    </div>
                    {it.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-600">{it.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {tab === "conversations" && (
        <Section>
          {c.conversations.length === 0 ? (
            <EmptyState title="Chưa có hội thoại" description="Khi khách nhắn tin vào Fanpage, hội thoại sẽ hiện ở đây." />
          ) : (
            <ul className="space-y-2">
              {c.conversations.map((conv) => (
                <li key={conv.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={conv.status} />
                    <span className="text-xs text-gray-400">{fmtDateTime(conv.lastMessageAt)}</span>
                  </div>
                  {conv.messages[0] && (
                    <p className="mt-1 truncate text-sm text-gray-600">
                      <span className="text-gray-400">{conv.messages[0].direction === "INBOUND" ? "Khách: " : "Mình: "}</span>
                      {conv.messages[0].text || "(không có nội dung)"}
                    </p>
                  )}
                  <Link href="/inbox" className="mt-1 inline-block text-xs text-brand hover:underline">
                    Mở Inbox →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "opportunities" && (
        <Section>
          {c.opportunities.length === 0 ? (
            <EmptyState
              title="Chưa có cơ hội"
              description="Tạo cơ hội trong Pipeline để theo dõi tiến độ chốt đơn của khách này."
              action={
                <Link href="/pipeline" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Mở Pipeline
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {c.opportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{o.title}</div>
                    <div className="text-xs text-gray-500">
                      {o.pipeline?.name ? `${o.pipeline.name} · ` : ""}
                      {o.stage?.name ?? ""} · {OPP_STATUS_LABEL[o.status] ?? o.status}
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-brand-dark">{formatVnd(o.valueVnd)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "tasks" && (
        <Section>
          {c.tasks.length === 0 ? (
            <EmptyState title="Chưa có việc cần làm" description="Tạo task follow-up từ Inbox hoặc Pipeline để không bỏ lỡ khách." />
          ) : (
            <ul className="space-y-2">
              {c.tasks.map((t) => {
                const overdue = t.status === "TODO" && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className={`truncate text-sm ${t.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {TASK_STATUS_LABEL[t.status] ?? t.status}
                        {t.dueAt ? ` · hạn ${fmtDate(t.dueAt)}` : ""}
                        {t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ""}
                      </div>
                    </div>
                    {overdue && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        Quá hạn
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}

      {tab === "notes" && (
        <Section>
          <form onSubmit={addNote} className="mb-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Thêm ghi chú nội bộ về khách này…"
              className="w-full resize-none rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={noteBusy || !noteText.trim()}
                className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {noteBusy ? "Đang lưu…" : "Lưu ghi chú"}
              </button>
            </div>
          </form>
          {c.notes.length === 0 ? (
            <EmptyState title="Chưa có ghi chú" description="Ghi chú nội bộ giúp cả đội nắm tình hình khách." />
          ) : (
            <ul className="space-y-2">
              {c.notes.map((n) => (
                <li key={n.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{n.body}</p>
                  <div className="mt-1 text-xs text-gray-400">
                    {n.author?.name ?? n.author?.email ?? "Ẩn danh"} · {fmtDateTime(n.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "orders" && (
        <Section>
          <div className="mb-3 flex justify-end">
            <button onClick={() => setShowOrder(true)} className="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
              + Tạo đơn
            </button>
          </div>
          {orders === null ? (
            <p className="text-sm text-gray-400">Đang tải…</p>
          ) : orders.length === 0 ? (
            <EmptyState title="Chưa có đơn hàng" description="Khi khách chốt, bấm “Tạo đơn” để lên đơn nhanh cho khách này." />
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-gray-600">{o.code}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ORDER_STATUS_CLASS[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_CLASS[o.paymentStatus] ?? "bg-gray-100 text-gray-700"}`}>
                          {PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}
                        </span>
                        <span className="text-[11px] text-gray-400">{fmtDate(o.createdAt)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-brand-dark">{formatVnd(o.totalVnd)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {editing && (
        <ContactFormModal
          mode="edit"
          contact={c}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setDetail(saved);
            loadTimeline();
          }}
        />
      )}

      {showOrder && (
        <OrderFormModal
          lockedCustomer={{ id: c.id, name: c.name, phone: c.phone }}
          onClose={() => setShowOrder(false)}
          onCreated={() => {
            setShowOrder(false);
            loadOrders();
            loadTimeline();
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-gray-800">{value || "—"}</span>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 font-medium ${
        active ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-4">{children}</div>;
}
