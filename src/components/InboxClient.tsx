"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatHeader } from "@/components/inbox/ChatHeader";
import { MessageThread } from "@/components/inbox/MessageThread";
import { ChatComposer } from "@/components/inbox/ChatComposer";
import { ContactProfilePanel } from "@/components/inbox/ContactProfilePanel";
import { AiSuggestionBar } from "@/components/inbox/AiSuggestionBar";
import { EmptyChat } from "@/components/inbox/EmptyChat";
import { SkeletonBar } from "@/components/inbox/primitives";
import { InboxIcon } from "@/components/inbox/icons";
import type { ConvItem, Detail, Msg } from "@/components/inbox/types";

const LIST_POLL_MS = 15000;
const ACTIVE_THREAD_POLL_MS = 10000;

export function InboxClient({ aiEnabled, emailEnabled }: { aiEnabled: boolean; emailEnabled: boolean }) {
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [pages, setPages] = useState<{ pageId: string; pageName: string }[]>([]);
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(true);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef(0);
  const listPollingRef = useRef(false);
  const messagePollingRef = useRef(false);
  const realtimeRefreshRef = useRef(false);

  // Panel hồ sơ: mặc định mở trên màn lớn (>= xl), ẩn trên màn nhỏ.
  useEffect(() => {
    if (typeof window !== "undefined") setShowProfile(window.innerWidth >= 1280);
  }, []);

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
    } finally {
      setListLoading(false);
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
    const poll = async () => {
      if (document.hidden || listPollingRef.current) return;
      listPollingRef.current = true;
      try {
        await loadConversations();
      } finally {
        listPollingRef.current = false;
      }
    };
    const t = setInterval(poll, LIST_POLL_MS);
    const refreshOnFocus = () => {
      if (!document.hidden) void poll();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const poll = async () => {
      if (document.hidden || messagePollingRef.current) return;
      messagePollingRef.current = true;
      try {
        await loadMessages(selectedId);
      } finally {
        messagePollingRef.current = false;
      }
    };
    const t = setInterval(poll, ACTIVE_THREAD_POLL_MS);
    const refreshOnFocus = () => {
      if (!document.hidden) void poll();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    params.set("pageId", pageFilter);
    if (selectedId) params.set("conversationId", selectedId);

    const source = new EventSource(`/api/conversations/stream?${params.toString()}`);

    const refreshInbox = async () => {
      if (document.hidden || realtimeRefreshRef.current) return;
      realtimeRefreshRef.current = true;
      try {
        await loadConversations();
        if (selectedId) await loadMessages(selectedId);
      } finally {
        realtimeRefreshRef.current = false;
      }
    };

    source.addEventListener("inbox-update", () => {
      void refreshInbox();
    });

    source.onerror = () => {
      // EventSource tự reconnect; polling phía trên vẫn là fallback khi stream gián đoạn.
    };

    return () => {
      source.close();
    };
  }, [loadConversations, loadMessages, pageFilter, selectedId]);

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
    setThreadLoading(true);
    lastMsgCountRef.current = 0;
    try {
      await Promise.all([loadDetail(id), loadMessages(id)]);
    } finally {
      setThreadLoading(false);
    }
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

  async function aiSuggest() {
    if (!selectedId) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setNotice(null);
    try {
      const res = await apiSend<{ enabled: boolean; aiConfigured?: boolean; status?: string; suggestion: string | null }>(
        `/api/ai/suggest`,
        "POST",
        { conversationId: selectedId }
      );
      if (!res.enabled) {
        setNotice("Chưa tạo được gợi ý trả lời.");
      } else {
        setAiSuggestion(res.suggestion);
        if (!res.aiConfigured || res.status === "AI_NOT_CONFIGURED" || res.status === "SKIPPED") {
          setNotice("Đang dùng gợi ý catalog cơ bản vì chưa cấu hình AI model.");
        }
      }
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const customer = detail?.conversation?.customer;
  const status = detail?.conversation?.status;
  const pageName = detail?.conversation?.facebookPage?.pageName ?? null;

  return (
    <div className="h-full p-3">
      <div className="dc-card relative flex h-full overflow-hidden rounded-[1.5rem]">
        {/* Cột 1: danh sách hội thoại */}
        <div
          className={`h-full w-full shrink-0 flex-col border-r border-gray-100 md:w-[340px] ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <ConversationList
            conversations={conversations}
            loading={listLoading}
            selectedId={selectedId}
            filter={filter}
            search={search}
            pages={pages}
            pageFilter={pageFilter}
            onSelect={selectConversation}
            onFilter={setFilter}
            onSearch={setSearch}
            onPageFilter={setPageFilter}
          />
        </div>

        {/* Cột 2: khung chat */}
        <div
          className={`min-w-0 flex-1 flex-col bg-gradient-to-b from-white to-gray-50/70 ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedId ? (
            <EmptyChat />
          ) : (
            <>
              {customer ? (
                <ChatHeader
                  customer={customer}
                  pageName={pageName}
                  status={status}
                  profileOpen={showProfile}
                  onBack={() => setSelectedId(null)}
                  onToggleProfile={() => setShowProfile((v) => !v)}
                  onTakeover={takeover}
                  onReturnToBot={returnToBot}
                />
              ) : (
                <div className="flex items-center gap-3 border-b border-gray-100 bg-white/80 px-3 py-2.5">
                  <SkeletonBar className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBar className="h-3 w-40" />
                    <SkeletonBar className="h-2.5 w-24" />
                  </div>
                </div>
              )}

              {notice && (
                <div className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-800">
                  <span>{notice}</span>
                  <button onClick={() => setNotice(null)} className="text-amber-500 hover:text-amber-700" aria-label="Đóng">
                    <InboxIcon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <MessageThread ref={messagesEndRef} messages={messages} loading={threadLoading} />

              {aiSuggestion && (
                <AiSuggestionBar
                  suggestion={aiSuggestion}
                  onCopy={() => navigator.clipboard.writeText(aiSuggestion)}
                  onInsert={() => setComposer(aiSuggestion)}
                  onSend={() => sendMessage(aiSuggestion)}
                  onDismiss={() => setAiSuggestion(null)}
                />
              )}

              <ChatComposer
                value={composer}
                onChange={setComposer}
                onSend={() => sendMessage()}
                sending={sending}
                aiEnabled={true}
                aiLoading={aiLoading}
                onAiSuggest={aiSuggest}
              />
            </>
          )}
        </div>

        {/* Cột 3: hồ sơ khách (in-flow trên xl, drawer overlay dưới xl) */}
        {customer && showProfile && (
          <>
            <div
              className="absolute inset-0 z-20 bg-gray-900/20 backdrop-blur-[1px] xl:hidden"
              onClick={() => setShowProfile(false)}
            />
            <aside className="absolute right-0 top-0 z-30 h-full w-[330px] max-w-[88%] overflow-hidden border-l border-gray-100 bg-white shadow-2xl xl:static xl:z-auto xl:w-[340px] xl:max-w-none xl:shadow-none">
              <ContactProfilePanel
                customerId={customer.id}
                conversationId={selectedId!}
                baseCustomer={customer}
                pageName={pageName}
                emailEnabled={emailEnabled}
                aiEnabled={aiEnabled}
                onClose={() => setShowProfile(false)}
                onMutated={() => {
                  void loadConversations();
                  if (selectedId) void loadDetail(selectedId);
                }}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
