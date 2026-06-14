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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-10 text-center">
      {icon && (
        <div className="mb-3 text-3xl" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
      {children}
    </div>
  );
}
