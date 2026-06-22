import type { IconName } from "@/components/layout/icons";

export type NavItem = { label: string; href: string; icon: IconName; soon?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

// IA mới — gom theo phòng ban. Mục chưa có backend = soon ("Sắp ra mắt").
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "DCOS",
    items: [
      { label: "Home", href: "/dashboard", icon: "dashboard" },
      { label: "App Center", href: "/apps", icon: "integrations" },
      { label: "Browser OS", href: "/browser", icon: "system" },
      { label: "AI Copilot", href: "/ai-copilot/daily", icon: "sparkles" },
    ],
  },
  {
    label: "Customer OS",
    items: [
      { label: "Hộp thư", href: "/inbox", icon: "inbox" },
      { label: "Khách hàng", href: "/contacts", icon: "contacts" },
      { label: "Pipeline", href: "/pipeline", icon: "pipeline" },
      { label: "Đơn hàng", href: "/orders", icon: "orders" },
      { label: "Bình luận", href: "/comments", icon: "comments" },
      { label: "Việc cần làm", href: "/tasks", icon: "tasks" },
    ],
  },
  {
    label: "Growth OS",
    items: [
      { label: "Tự động hóa", href: "/automation", icon: "automation" },
      { label: "Fanpage / Kênh", href: "/settings/integrations/facebook", icon: "fanpage" },
      { label: "Ưu đãi", href: "/offers", icon: "offers" },
      { label: "Kịch bản chat", href: "/flows", icon: "flows" },
      { label: "Email", href: "/email", icon: "email" },
    ],
  },
  {
    label: "Catalog OS",
    items: [
      { label: "Sản phẩm / Dịch vụ", href: "/products", icon: "products" },
      { label: "Lịch booking", href: "/bookings", icon: "services" },
      { label: "Bộ sưu tập / Dịch vụ", href: "#", icon: "services", soon: true },
    ],
  },
  {
    label: "Kế toán",
    items: [
      { label: "Doanh thu & thanh toán", href: "#", icon: "accounting", soon: true },
      { label: "Đối soát COD", href: "#", icon: "accounting", soon: true },
    ],
  },
  {
    label: "Nhân sự",
    items: [
      { label: "Thành viên", href: "#", icon: "team", soon: true },
      { label: "Phân quyền", href: "#", icon: "permissions", soon: true },
      { label: "Hiệu suất sale", href: "#", icon: "team", soon: true },
    ],
  },
  {
    label: "Cài đặt OS",
    items: [
      { label: "Spaces", href: "/settings/workspaces", icon: "brands" },
      { label: "Thông tin Space", href: "/settings/brand", icon: "settings" },
      { label: "Tích hợp", href: "/settings/integrations", icon: "integrations" },
      { label: "Bảo mật", href: "#", icon: "security", soon: true },
      { label: "Hệ thống", href: "#", icon: "system", soon: true },
    ],
  },
];

// Mọi href thật (không soon) — dùng để tính item active theo prefix dài nhất.
export const ALL_HREFS: string[] = NAV_GROUPS.flatMap((g) =>
  g.items.filter((i) => !i.soon && i.href !== "#").map((i) => i.href)
);

export function resolveActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}
