import type { ReactNode } from "react";

// Empty state dùng chung: không để màn trắng, luôn có thể kèm hành động (CTA).
// Component thuần trình bày (không hook) -> dùng được trong cả server & client component.
export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-12 text-center">
      {icon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-3xl text-brand-dark"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
      {children}
    </div>
  );
}
