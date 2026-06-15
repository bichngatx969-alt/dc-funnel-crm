import Link from "next/link";
import { Icon } from "@/components/layout/icons";
import type { NavGroup } from "@/components/layout/nav";

export function SidebarGroup({
  group,
  activeHref,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  activeHref: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="px-2">
      {collapsed ? (
        <div className="mx-3 my-2 border-t border-gray-200/70" />
      ) : (
        <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {group.label}
        </div>
      )}
      <div className="space-y-0.5">
        {group.items.map((item) => {
          if (item.soon) {
            return (
              <div
                key={item.label}
                title="Sắp ra mắt"
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-400 ${collapsed ? "justify-center" : ""}`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">Sắp ra mắt</span>
                )}
              </div>
            );
          }
          const active = item.href === activeHref;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${active ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
            >
              <Icon
                name={item.icon}
                className={`h-[18px] w-[18px] shrink-0 ${active ? "" : "text-gray-500 group-hover:text-brand"}`}
              />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
