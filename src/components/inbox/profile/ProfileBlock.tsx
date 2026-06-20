"use client";

import { useState, type ReactNode } from "react";
import { InboxIcon, type InboxIconName } from "../icons";

// Card/section cho Customer 360. Có thể collapse cho block phụ.
export function ProfileBlock({
  id,
  title,
  icon,
  action,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  id?: string;
  title: string;
  icon?: InboxIconName;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-2 border-b border-gray-100 px-4 py-3.5 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
            collapsible ? "hover:text-gray-600" : "cursor-default"
          }`}
        >
          {icon && <InboxIcon name={icon} className="h-3.5 w-3.5" />}
          {title}
          {collapsible && (
            <InboxIcon
              name="chevron"
              className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          )}
        </button>
        {action}
      </div>
      {open && children}
    </section>
  );
}

// Hàng label - value gọn cho block thông tin.
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="shrink-0 text-[12px] text-gray-400">{label}</span>
      <span
        className={`min-w-0 break-words text-right text-[13px] ${
          empty ? "italic text-gray-300" : "font-medium text-gray-700"
        }`}
      >
        {empty ? "Chưa có thông tin" : value}
      </span>
    </div>
  );
}

// Empty state nhỏ gọn trong từng block + CTA tuỳ chọn.
export function BlockEmpty({ text, cta }: { text: string; cta?: ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
      <p className="text-[12.5px] text-gray-400">{text}</p>
      {cta && <div className="mt-2 flex justify-center">{cta}</div>}
    </div>
  );
}

// Nút CTA nhỏ dùng trong block.
export function BlockCta({
  icon,
  label,
  onClick,
  href,
}: {
  icon?: InboxIconName;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand/15";
  const inner = (
    <>
      {icon && <InboxIcon name={icon} className="h-3.5 w-3.5" />}
      {label}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
