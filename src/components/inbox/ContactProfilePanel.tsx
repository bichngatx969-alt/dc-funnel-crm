"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { ContactHeaderCard } from "./profile/ContactHeaderCard";
import { ContactInfoBlock } from "./profile/ContactInfoBlock";
import { SalesStageBlock } from "./profile/SalesStageBlock";
import { PurchaseHistoryBlock } from "./profile/PurchaseHistoryBlock";
import { OfferSuggestionBlock } from "./profile/OfferSuggestionBlock";
import { TagsBlock } from "./profile/TagsBlock";
import { FollowUpTaskBlock } from "./profile/FollowUpTaskBlock";
import { InternalNotesBlock } from "./profile/InternalNotesBlock";
import { ActivityTimelineBlock } from "./profile/ActivityTimelineBlock";
import { ProfileBlock } from "./profile/ProfileBlock";
import { CustomerEmailPanel } from "@/components/CustomerEmailPanel";
import { formatVnd } from "@/components/money";
import type { ContactDetail, TimelineItem } from "@/components/contacts/types";
import type { Order } from "@/components/orders/types";
import { OrderFormModal } from "@/components/orders/OrderFormModal";

const COUNTED_OUT = new Set(["CANCELLED", "REFUNDED"]);

export function ContactProfilePanel({
  customerId,
  baseCustomer,
  pageName,
  emailEnabled,
  onClose,
  onMutated,
}: {
  customerId: string;
  baseCustomer: any;
  pageName: string | null;
  emailEnabled: boolean;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);
  const [showOrder, setShowOrder] = useState(false);

  const reloadContact = useCallback(async () => {
    try {
      const d = await apiGet<{ contact: ContactDetail }>(`/api/contacts/${customerId}`);
      setContact(d.contact);
    } catch {
      /* giữ dữ liệu cũ nếu lỗi tạm thời */
    }
  }, [customerId]);

  const reloadOrders = useCallback(async () => {
    try {
      const d = await apiGet<{ items: Order[] }>(`/api/orders?customerId=${customerId}&pageSize=100`);
      setOrders(d.items ?? []);
    } catch {
      setOrders([]);
    }
  }, [customerId]);

  const reloadTimeline = useCallback(async () => {
    try {
      const d = await apiGet<{ items: TimelineItem[] }>(`/api/contacts/${customerId}/timeline`);
      setTimeline(d.items ?? []);
    } catch {
      setTimeline([]);
    }
  }, [customerId]);

  useEffect(() => {
    setContact(null);
    setOrders(null);
    setTimeline(null);
    void reloadContact();
    void reloadOrders();
    void reloadTimeline();
  }, [reloadContact, reloadOrders, reloadTimeline]);

  // Mutations
  const changeStage = async (stage: string) => {
    await apiSend(`/api/customers/${customerId}/stage`, "PATCH", { stage });
    await reloadContact();
    onMutated();
  };
  const addTag = async (tag: string) => {
    await apiSend(`/api/customers/${customerId}/tags`, "POST", { add: tag });
    await reloadContact();
    onMutated();
  };
  const removeTag = async (tag: string) => {
    await apiSend(`/api/customers/${customerId}/tags`, "POST", { remove: tag });
    await reloadContact();
    onMutated();
  };
  const createTask = async (title: string) => {
    await apiSend(`/api/tasks`, "POST", { customerId, title, type: "FOLLOW_UP" });
    await Promise.all([reloadContact(), reloadTimeline()]);
    onMutated();
  };
  const addNote = async (body: string) => {
    await apiSend(`/api/contacts/${customerId}/notes`, "POST", { body });
    await Promise.all([reloadContact(), reloadTimeline()]);
  };

  function scrollToBlock(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Header dùng baseCustomer (có avatar/psid) hợp nhất với contact (giai đoạn/score mới nhất).
  const headerCustomer = {
    id: baseCustomer.id,
    name: contact?.name ?? baseCustomer.name,
    psid: baseCustomer.psid,
    avatarUrl: baseCustomer.avatarUrl,
    currentStage: contact?.currentStage ?? baseCustomer.currentStage,
    leadScore: contact?.leadScore ?? baseCustomer.leadScore,
  };

  const phone = contact?.phone ?? baseCustomer.phone ?? null;
  const totalSpend =
    orders === null
      ? null
      : orders.filter((o) => !COUNTED_OUT.has(o.status)).reduce((s, o) => s + (o.totalVnd ?? 0), 0);
  const openTasks = contact ? contact.tasks.filter((t) => t.status === "TODO").length : null;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="scroll-thin flex-1 overflow-y-auto">
        <ContactHeaderCard
          customer={headerCustomer}
          pageName={pageName}
          source={contact?.source ?? null}
          stats={[
            { label: "Điện thoại", value: phone ?? "—", tone: phone ? "emerald" : "default" },
            { label: "Tổng chi tiêu", value: totalSpend === null ? "…" : formatVnd(totalSpend), tone: "brand" },
            { label: "Việc cần làm", value: openTasks === null ? "…" : String(openTasks) },
          ]}
          onClose={onClose}
          onCreateOrder={() => setShowOrder(true)}
          onCreateTask={() => scrollToBlock("block-tasks")}
          onCreateNote={() => scrollToBlock("block-notes")}
        />

        <SalesStageBlock contact={contact} onChangeStage={changeStage} />
        <PurchaseHistoryBlock orders={orders} onCreateOrder={() => setShowOrder(true)} />
        <FollowUpTaskBlock tasks={contact?.tasks ?? []} onCreateTask={createTask} />
        <OfferSuggestionBlock />
        <ContactInfoBlock contact={contact} pageName={pageName} />
        <TagsBlock tags={contact?.tags ?? baseCustomer.tags ?? []} onAddTag={addTag} onRemoveTag={removeTag} />
        <InternalNotesBlock notes={contact?.notes ?? []} onAddNote={addNote} />

        <ProfileBlock title="Email & chăm sóc" icon="source" collapsible defaultOpen={false}>
          <CustomerEmailPanel customer={baseCustomer} emailEnabled={emailEnabled} onChange={reloadContact} />
        </ProfileBlock>

        <ActivityTimelineBlock items={timeline} />
      </div>

      {showOrder && (
        <OrderFormModal
          lockedCustomer={{ id: customerId, name: headerCustomer.name, phone }}
          onClose={() => setShowOrder(false)}
          onCreated={() => {
            setShowOrder(false);
            void reloadOrders();
            void reloadContact();
            void reloadTimeline();
            onMutated();
          }}
        />
      )}
    </div>
  );
}
