import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/inbox", label: "Inbox", key: "inbox" },
  { href: "/offers", label: "Offers", key: "offers" },
  { href: "/flows", label: "Flows", key: "flows" },
  { href: "/email", label: "Email", key: "email" },
  { href: "/tasks", label: "Tasks", key: "tasks" },
  { href: "/settings/brand", label: "Settings", key: "settings" },
];

const SETTINGS_NAV = [
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
        <div className="border-b px-4 py-4">
          <div className="font-bold text-brand">D.C Funnel Bot</div>
          <div className="text-xs text-gray-500">Chatbot phễu Facebook</div>
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
