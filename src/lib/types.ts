// Các kiểu dùng chung nhỏ gọn cho single-brand app.

export type Vertical = "fashion" | "studio" | "salon";

export const VERTICALS: Vertical[] = ["fashion", "studio", "salon"];

export const VERTICAL_LABEL: Record<Vertical, string> = {
  fashion: "Thời trang",
  studio: "Studio ảnh",
  salon: "Salon",
};
