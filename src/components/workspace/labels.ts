// Kiểu & nhãn hiển thị cho Workspace (UI-local, theo API contract mục 16.1 của plan).
// Không phải nguồn contract — chỉ dùng để render UI. Codex sở hữu shape thật ở backend.

export type Workspace = {
  id: string;
  organizationId: string;
  name: string;
  industry: string;
  role: string;
  assignedOnly: boolean;
  timezone: string;
  currency: string;
  locale: string;
};

const INDUSTRY_LABELS: Record<string, string> = {
  fashion: "Thời trang",
  studio: "Studio ảnh",
  salon: "Salon/Spa",
  spa: "Salon/Spa",
  agency: "Agency",
  service: "Dịch vụ",
  wedding: "Cưới",
  other: "Khác",
};

export function industryLabel(industry?: string | null): string {
  if (!industry) return "Chưa đặt ngành";
  return INDUSTRY_LABELS[industry.toLowerCase()] ?? industry;
}

const ROLE_LABELS: Record<string, string> = {
  AGENCY_ADMIN: "Quản trị agency",
  OWNER: "Chủ brand",
  MANAGER: "Quản lý",
  SALE: "Sale",
  MARKETER: "Marketer",
  ADMIN: "Quản trị",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "";
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}

// Lựa chọn ngành khi tạo Space mới (value gửi lên API, backend tự normalize).
export const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "fashion", label: "Thời trang" },
  { value: "studio", label: "Studio ảnh" },
  { value: "salon", label: "Salon/Spa" },
  { value: "agency", label: "Agency" },
  { value: "service", label: "Dịch vụ" },
  { value: "other", label: "Khác" },
];
