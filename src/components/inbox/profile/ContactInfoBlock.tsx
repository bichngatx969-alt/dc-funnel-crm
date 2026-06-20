"use client";

import { useState } from "react";
import { ProfileBlock, InfoRow } from "./ProfileBlock";
import { InboxIcon } from "../icons";
import { fmtDate, type ContactDetail } from "@/components/contacts/types";

function CopyableRow({ label, value }: { label: string; value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <InfoRow label={label} value={null} />;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-[12px] text-gray-400">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 break-all text-right text-[13px] font-semibold text-gray-800">{value}</span>
        <button
          onClick={copy}
          className="shrink-0 text-gray-300 transition-colors hover:text-brand"
          aria-label={`Sao chép ${label}`}
          title={copied ? "Đã chép" : "Sao chép"}
        >
          <InboxIcon name={copied ? "takeover" : "copy"} className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

export function ContactInfoBlock({
  contact,
  pageName,
}: {
  contact: ContactDetail | null;
  pageName: string | null;
}) {
  return (
    <ProfileBlock id="block-info" title="Thông tin chung" icon="person" collapsible defaultOpen>
      <div className="divide-y divide-gray-50">
        <InfoRow label="Họ tên" value={contact?.name} />
        <InfoRow label="Giới tính" value={contact?.gender} />
        <CopyableRow label="Số điện thoại" value={contact?.phone} />
        <CopyableRow label="Email" value={contact?.email} />
        <InfoRow label="Địa chỉ" value={contact?.address} />
        <InfoRow label="Nguồn khách" value={contact?.source} />
        <InfoRow label="Fanpage" value={contact?.facebookPage?.pageName ?? pageName} />
        <InfoRow label="Ngày tạo" value={contact?.createdAt ? fmtDate(contact.createdAt) : null} />
      </div>
    </ProfileBlock>
  );
}
