"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { SidebarGroup } from "@/components/layout/SidebarGroup";
import { QuickAction } from "@/components/layout/QuickAction";
import { Icon } from "@/components/layout/icons";
import { NAV_GROUPS, resolveActiveHref } from "@/components/layout/nav";

export function AppShell({
  user,
  // `active` giữ lại cho tương thích các trang cũ; active thực tế tính theo pathname.
  active: _active,
  children,
}: {
  user: SessionUser;
  active?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();

  function renderSidebar(isCollapsed: boolean) {
    return (
      <div className="flex h-full flex-col">
        {/* Brand + collapse */}
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          {isCollapsed ? (
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">DC</span>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">DC</span>
              <div className="leading-tight">
                <div className="text-sm font-bold text-gray-900">D.C FUNNEL</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">CRM</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
            className="hidden rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 lg:block"
          >
            <Icon name="chevron" className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Workspace switcher */}
        {!isCollapsed && (
          <div className="px-3 pt-3">
            <WorkspaceSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="scroll-thin mt-1 flex-1 overflow-y-auto pb-3">
          {NAV_GROUPS.map((g) => (
            <SidebarGroup
              key={g.label}
              group={g}
              activeHref={activeHref}
              collapsed={isCollapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200/70 p-3">
          <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-xs font-bold text-white">
              {initial}
            </span>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">{user.name ?? user.email}</div>
                <div className="text-[11px] text-gray-400">{user.role}</div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="mt-2">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop (panel kính nổi) */}
      <aside className={`hidden shrink-0 p-3 transition-[width] duration-200 lg:block ${collapsed ? "w-[88px]" : "w-64"}`}>
        <div className="dc-glass h-full rounded-3xl">{renderSidebar(collapsed)}</div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 p-3">
            <div className="dc-glass h-full rounded-3xl">{renderSidebar(false)}</div>
          </aside>
        </div>
      )}

      {/* Cột nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="dc-glass z-10 m-3 mb-0 flex items-center gap-2 rounded-2xl px-2 py-2 sm:px-3">
          <button
            onClick={() => setMobileOpen(true)}
            title="Menu"
            className="rounded-lg p-2 text-gray-600 hover:bg-white lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200/70 bg-white/60 px-3 py-2 text-sm text-gray-400 sm:flex">
            <Icon name="search" className="h-4 w-4 shrink-0" />
            <span className="truncate">Tìm khách, đơn, bình luận…</span>
          </div>
          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-1.5">
            <QuickAction href="/contacts?new=1" icon="contacts" label="Tạo khách" />
            <QuickAction href="/orders?new=1" icon="orders" label="Tạo đơn" />
            <QuickAction href="/comments?filter=hasPhone" icon="comments" label="Comment có SĐT" />
          </div>
        </header>

        {/* Nội dung trang — mỗi trang tự quản padding/max-width để không phá layout full-height */}
        <main className="scroll-thin flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
