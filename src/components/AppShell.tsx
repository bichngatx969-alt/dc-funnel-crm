import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

const NAV = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/inbox", label: "Inbox", key: "inbox" },
  { href: "/contacts", label: "Khách hàng", key: "contacts" },
  { href: "/pipeline", label: "Pipeline", key: "pipeline" },
  { href: "/offers", label: "Offers", key: "offers" },
  { href: "/flows", label: "Flows", key: "flows" },
  { href: "/email", label: "Email", key: "email" },
  { href: "/tasks", label: "Tasks", key: "tasks" },
  { href: "/settings/brand", label: "Settings", key: "settings" },
];

const SETTINGS_NAV = [
  { href: "/settings/workspaces", label: "Brands" },
  { href: "/settings/brand", label: "Brand" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/integrations/facebook", label: "Facebook Fanpage" },
];

export function AppShell({
  user,
  active,
  children,
}: {
  user: SessionUser;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-white">
        <div className="space-y-2 border-b p-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            D.C FUNNEL CRM
          </div>
          <WorkspaceSwitcher />
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              className={`block rounded px-3 py-2 text-sm font-medium ${
                active === n.key
                  ? "bg-brand text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {n.label}
            </Link>
          ))}
          {active === "settings" && (
            <div className="space-y-1 border-l border-gray-200 pl-3 pt-1">
              {SETTINGS_NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="block rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
        <div className="border-t p-3 text-sm">
          <div className="truncate font-medium">{user.name ?? user.email}</div>
          <div className="mb-2 text-xs text-gray-500">{user.role}</div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
