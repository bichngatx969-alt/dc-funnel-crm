"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { ScoreBadge, StageBadge, StatusBadge, Tag } from "@/components/ui";
import { CustomerEmailPanel } from "@/components/CustomerEmailPanel";

const STAGES = ["COLD", "WARM", "HOT", "CUSTOMER", "LOST"];
const POLL_MS = 5000;

type ConvItem = {
  id: string;
  pageId: string | null;
  facebookPage: { pageId: string; pageName: string } | null;
  status: string;
  lastMessageAt: string;
  customer: {
    id: string;
    name: string | null;
    psid: string;
    avatarUrl: string | null;
    currentStage: string;
    leadScore: number;
    tags: string[];
    phone: string | null;
  };
  assignedTo: { id: string; name: string | null } | null;
  lastMessage: { text: string | null; direction: string; createdAt: string } | null;
};

type Msg = {
  id: string;
  direction: string;
  senderType: string;
  text: string | null;
  createdAt: string;
  payloadJson: any;
};

type Detail = {
  conversation: any;
  tasks: any[];
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function InboxClient({ aiEnabled, emailEnabled }: { aiEnabled: boolean; emailEnabled: boolean }) {
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [pages, setPages] = useState<{ pageId: string; pageName: string }[]>([]);
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [newTag, setNewTag] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef(0);

  const loadConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (pageFilter !== "all") params.set("pageId", pageFilter);
    if (search.trim()) params.set("q", search.trim());
    try {
      const data = await apiGet<ConvItem[]>(`/api/conversations?${params.toString()}`);
      setConversations(data);
    } catch (e: any) {
      setNotice(e.message);
    }
  }, [filter, pageFilter, search]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await apiGet<Detail>(`/api/conversations/${id}`);
      setDetail(d);
    } catch (e: any) {
      setNotice(e.message);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const m = await apiGet<Msg[]>(`/api/conversations/${id}/messages`);
      setMessages(m);
    } catch (e: any) {
      setNotice(e.message);
    }
  }, []);

  // Tải lần đầu + polling danh sách.
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    apiGet<{ pageId: string; pageName: string }[]>("/api/facebook-pages")
      .then(setPages)
      .catch((e: any) => setNotice(e.message));
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      loadConversations();
      if (selectedId) {
        loadMessages(selectedId);
        loadDetail(selectedId);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [loadConversations, loadMessages, loadDetail, selectedId]);

  // Auto-scroll khi có tin mới.
  useEffect(() => {
    if (messages.length !== lastMsgCountRef.current) {
      lastMsgCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function selectConversation(id: string) {
    setSelectedId(id);
    setAiSuggestion(null);
    setDetail(null);
    setMessages([]);
    lastMsgCountRef.current = 0;
    await Promise.all([loadDetail(id), loadMessages(id)]);
  }

  async function sendMessage(text?: string) {
    const content = (text ?? composer).trim();
    if (!content || !selectedId) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await apiSend<any>(`/api/conversations/${selectedId}/send`, "POST", { text: content });
      setComposer("");
      setAiSuggestion(null);
      if (res?.error) setNotice(res.error);
      await loadMessages(selectedId);
      await loadConversations();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setSending(false);
    }
  }

  async function takeover() {
    if (!selectedId) return;
    await apiSend(`/api/conversations/${selectedId}/takeover`, "POST");
    await Promise.all([loadDetail(selectedId), loadConversations()]);
  }

  async function returnToBot() {
    if (!selectedId) return;
    await apiSend(`/api/conversations/${selectedId}/return-to-bot`, "POST");
    await Promise.all([loadDetail(selectedId), loadConversations()]);
  }

  async function addTag() {
    const cid = detail?.conversation?.customer?.id;
    if (!cid || !newTag.trim()) return;
    await apiSend(`/api/customers/${cid}/tags`, "POST", { add: newTag.trim() });
    setNewTag("");
    await Promise.all([loadDetail(selectedId!), loadConversations()]);
  }

  async function removeTag(tag: string) {
    const cid = detail?.conversation?.customer?.id;
    if (!cid) return;
    await apiSend(`/api/customers/${cid}/tags`, "POST", { remove: tag });
    await Promise.all([loadDetail(selectedId!), loadConversations()]);
  }

  async function changeStage(stage: string) {
    const cid = detail?.conversation?.customer?.id;
    if (!cid) return;
    await apiSend(`/api/customers/${cid}/stage`, "PATCH", { stage });
    await Promise.all([loadDetail(selectedId!), loadConversations()]);
  }

  async function createTask() {
    const cid = detail?.conversation?.customer?.id;
    if (!cid || !taskTitle.trim()) return;
    await apiSend(`/api/tasks`, "POST", { customerId: cid, title: taskTitle.trim(), type: "FOLLOW_UP" });
    setTaskTitle("");
    await loadDetail(selectedId!);
  }

  async function aiSuggest() {
    if (!selectedId) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setNotice(null);
    try {
      const res = await apiSend<{ enabled: boolean; suggestion: string | null }>(
        `/api/ai/suggest`,
        "POST",
        { conversationId: selectedId }
      );
      if (!res.enabled) setNotice("AI chưa bật (thiếu OPENAI_API_KEY).");
      else setAiSuggestion(res.suggestion);
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const customer = detail?.conversation?.customer;
  const status = detail?.conversation?.status;

  return (
    <div className="flex h-full">
      {/* Cột trái: danh sách hội thoại */}
      <div className="flex w-80 shrink-0 flex-col border-r bg-white">
        <div className="space-y-2 border-b p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên / SĐT / PSID..."
            className="w-full rounded border px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
          />
          <div className="flex gap-1 text-xs">
            {[
              { k: "all", l: "Tất cả" },
              { k: "BOT_ACTIVE", l: "Bot" },
              { k: "HUMAN_TAKEOVER", l: "Sale" },
              { k: "CLOSED", l: "Đóng" },
            ].map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`rounded px-2 py-1 ${
                  filter === f.k ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
          {pages.length > 0 && (
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-xs focus:border-brand focus:outline-none"
            >
              <option value="all">Tất cả Fanpage của brand</option>
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
              ))}
            </select>
          )}
        </div>
        <div className="scroll-thin flex-1 overflow-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-gray-400">Chưa có hội thoại nào.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`flex w-full flex-col gap-1 border-b px-3 py-2 text-left hover:bg-gray-50 ${
                selectedId === c.id ? "bg-brand-light/50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">
                  {c.customer.name ?? `Khách ${c.customer.psid.slice(-6)}`}
                </span>
                <div className="flex items-center gap-1">
                  <ScoreBadge score={c.customer.leadScore} />
                  <StatusBadge status={c.status} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="truncate text-xs text-gray-500">
                  {c.lastMessage?.text ?? "(chưa có tin)"}
                </span>
                <StageBadge stage={c.customer.currentStage} />
              </div>
              {c.facebookPage && (
                <div className="w-fit rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {c.facebookPage.pageName}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cột giữa: tin nhắn */}
      <div className="flex flex-1 flex-col bg-gray-50">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            Chọn một hội thoại để xem chi tiết
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b bg-white px-4 py-2">
              <div>
                <div className="font-semibold">
                  {customer?.name ?? `Khách ${customer?.psid?.slice(-6) ?? ""}`}
                </div>
                <div className="text-xs text-gray-500">PSID: {customer?.psid}</div>
                {detail?.conversation?.facebookPage && (
                  <div className="mt-1 w-fit rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    Page: {detail.conversation.facebookPage.pageName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status === "HUMAN_TAKEOVER" ? (
                  <button
                    onClick={returnToBot}
                    className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    Trả về Bot
                  </button>
                ) : (
                  <button
                    onClick={takeover}
                    className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    Take over
                  </button>
                )}
              </div>
            </div>

            {notice && (
              <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800">{notice}</div>
            )}

            <div className="scroll-thin flex-1 space-y-2 overflow-auto p-4">
              {messages.map((m) => {
                const inbound = m.direction === "INBOUND";
                const system = m.direction === "SYSTEM";
                return (
                  <div
                    key={m.id}
                    className={`flex ${inbound ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        inbound
                          ? "bg-white text-gray-900"
                          : system
                          ? "bg-gray-200 text-gray-600"
                          : m.senderType === "HUMAN"
                          ? "bg-emerald-600 text-white"
                          : "bg-brand text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.text || "(không có nội dung)"}</div>
                      {m.payloadJson?.quick_replies && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.payloadJson.quick_replies.map((q: any, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]"
                            >
                              {q.title}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={`mt-1 text-[10px] ${inbound ? "text-gray-400" : "text-white/70"}`}>
                        {m.senderType} · {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI suggestion */}
            {aiEnabled && (
              <div className="border-t bg-white px-4 py-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={aiSuggest}
                    disabled={aiLoading}
                    className="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {aiLoading ? "Đang nghĩ..." : "Gợi ý trả lời (AI)"}
                  </button>
                  <span className="text-[11px] text-gray-400">AI chỉ gợi ý, không tự gửi.</span>
                </div>
                {aiSuggestion && (
                  <div className="mt-2 rounded border border-violet-200 bg-violet-50 p-2 text-sm">
                    <div className="whitespace-pre-wrap text-gray-800">{aiSuggestion}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(aiSuggestion)}
                        className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setComposer(aiSuggestion)}
                        className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                      >
                        Đưa vào ô soạn
                      </button>
                      <button
                        onClick={() => sendMessage(aiSuggestion)}
                        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Composer */}
            <div className="flex items-end gap-2 border-t bg-white p-3">
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                placeholder="Nhập tin nhắn gửi khách... (Enter để gửi)"
                className="flex-1 resize-none rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending}
                className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                Gửi
              </button>
            </div>
          </>
        )}
      </div>

      {/* Cột phải: thông tin khách */}
      <div className="w-80 shrink-0 overflow-auto border-l bg-white p-4">
        {!customer ? (
          <p className="text-sm text-gray-400">Thông tin khách hiển thị ở đây.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-lg font-bold">
                {customer.name ?? `Khách ${customer.psid.slice(-6)}`}
              </div>
              <div className="text-xs text-gray-500">PSID: {customer.psid}</div>
              {detail?.conversation?.facebookPage && (
                <div className="mt-1 w-fit rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  Page: {detail.conversation.facebookPage.pageName}
                </div>
              )}
              {customer.phone && (
                <div className="mt-1 font-medium text-emerald-700">SĐT: {customer.phone}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Lead score:</span>
              <ScoreBadge score={customer.leadScore} />
              <span className="text-gray-500">Stage:</span>
              <StageBadge stage={customer.currentStage} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Đổi stage</label>
              <select
                value={customer.currentStage}
                onChange={(e) => changeStage(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Tags</label>
              <div className="mb-2 flex flex-wrap gap-1">
                {customer.tags.length === 0 && (
                  <span className="text-xs text-gray-400">Chưa có tag</span>
                )}
                {customer.tags.map((t: string) => (
                  <Tag key={t} label={t} onRemove={() => removeTag(t)} />
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Thêm tag..."
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <button
                  onClick={addTag}
                  className="rounded bg-gray-200 px-2 text-sm hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            {(customer.source || customer.firstCampaign) && (
              <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
                {customer.source && <div>Nguồn: {customer.source}</div>}
                {customer.firstCampaign && <div>Campaign: {customer.firstCampaign}</div>}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Task follow-up
              </label>
              <div className="mb-2 space-y-1">
                {detail?.tasks?.length === 0 && (
                  <span className="text-xs text-gray-400">Chưa có task</span>
                )}
                {detail?.tasks?.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                  >
                    <span className={t.status === "DONE" ? "text-gray-400 line-through" : ""}>
                      {t.title}
                    </span>
                    <span className="text-gray-400">{t.status}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTask()}
                  placeholder="Tạo task follow-up..."
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <button
                  onClick={createTask}
                  className="rounded bg-gray-200 px-2 text-sm hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            <CustomerEmailPanel
              customer={customer}
              emailEnabled={emailEnabled}
              onChange={() => selectedId && loadDetail(selectedId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
