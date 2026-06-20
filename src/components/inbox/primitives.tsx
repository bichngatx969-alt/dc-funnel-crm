import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { InboxIcon, type InboxIconName } from "./icons";

// Nút icon tròn, tinh tế (header chat, composer).
export function IconButton({
  icon,
  label,
  active = false,
  className = "",
  ...rest
}: {
  icon: InboxIconName;
  label: string;
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 ${
        active ? "bg-brand-light text-brand-dark hover:bg-brand-light" : ""
      } ${className}`}
      {...rest}
    >
      <InboxIcon name={icon} className="h-[18px] w-[18px]" />
    </button>
  );
}

// Chip nhỏ trung tính (page, source...).
export function Chip({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand";
  icon?: InboxIconName;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-600",
    brand: "bg-brand-light text-brand-dark",
  };
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {icon && <InboxIcon name={icon} className="h-3 w-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

// Section trong panel hồ sơ khách: title + nội dung, thoáng, dễ đọc.
export function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: InboxIconName;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {icon && <InboxIcon name={icon} className="h-3.5 w-3.5" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// Khối skeleton cơ bản.
export function SkeletonBar({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span style={style} className={`block animate-pulse rounded-md bg-gray-200/80 ${className}`} />;
}
