// Tiện ích hiển thị cho Inbox: tên, initials, thời gian tương đối, nhãn ngày.

export function displayName(c: { name: string | null; psid: string }): string {
  return c.name?.trim() || `Khách ${c.psid.slice(-6)}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Màu avatar ổn định theo chuỗi (gradient nhẹ, không chói).
const AVATAR_GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-indigo-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-fuchsia-400 to-purple-500",
  "from-cyan-400 to-sky-500",
];

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

// "Vừa xong" / "5 phút" / "3 giờ" / "T2" / "12/06" — kiểu Messenger.
export function relativeShort(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút`;
  const hr = Math.floor(min / 60);
  if (hr < 24 && isSameDay(d, new Date())) return `${hr} giờ`;
  const day = Math.floor(diff / 86400000);
  if (day < 7) {
    return d.toLocaleDateString("vi-VN", { weekday: "short" });
  }
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Giờ đầy đủ cho metadata bong bóng.
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Nhãn dải ngày trong thread: "Hôm nay" / "Hôm qua" / "Thứ 2, 12/06".
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return "Hôm nay";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (isSameDay(d, yest)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Loại "bucket" người gửi để gom nhóm bong bóng liền mạch.
export function senderBucket(m: { direction: string; senderType: string }): string {
  if (m.direction === "SYSTEM") return "system";
  if (m.direction === "INBOUND") return "in";
  return m.senderType === "HUMAN" ? "human" : "bot";
}
