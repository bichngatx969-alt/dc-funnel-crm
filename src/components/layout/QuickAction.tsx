import Link from "next/link";
import { Icon, type IconName } from "@/components/layout/icons";

// Nút thao tác nhanh trên topbar (dạng Link — không tạo backend mới).
export function QuickAction({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-brand/40 hover:text-brand"
    >
      <Icon name={icon} className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
