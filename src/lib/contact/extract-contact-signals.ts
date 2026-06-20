// Nhận diện & chuẩn hoá SĐT Việt Nam + email từ text tự do (tin nhắn/comment).
// Pure function, không phụ thuộc DB → dễ test bằng node/tsx.

export type ContactSignals = {
  phones: string[];
  emails: string[];
};

// SĐT di động VN hợp lệ: 10 số, bắt đầu 0, đầu số 03/05/07/08/09.
// Cho phép dấu cách/chấm/gạch và dạng +84 / 84 / 0084.
const PHONE_CANDIDATE = /(?<!\d)(?:\+?84|0084|0)(?:[\s.\-]?\d){8,10}(?!\d)/g;
const EMAIL_REGEX = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi;
const MOBILE_PREFIX = /^0[35789]\d{8}$/;

// Chuẩn hoá 1 chuỗi ứng viên về dạng 0xxxxxxxxx, hoặc null nếu không hợp lệ.
export function normalizeVietnamesePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, ""); // bỏ +, khoảng trắng, dấu...
  if (digits.startsWith("0084")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("84")) digits = "0" + digits.slice(2);
  if (!MOBILE_PREFIX.test(digits)) return null;
  return digits;
}

export function extractContactSignals(text: string | null | undefined): ContactSignals {
  const phones: string[] = [];
  const emails: string[] = [];
  if (!text || typeof text !== "string") return { phones, emails };

  for (const m of text.matchAll(PHONE_CANDIDATE)) {
    const norm = normalizeVietnamesePhone(m[0]);
    if (norm && !phones.includes(norm)) phones.push(norm);
  }

  for (const m of text.matchAll(EMAIL_REGEX)) {
    const email = m[0].toLowerCase().replace(/[.,;]+$/, ""); // bỏ dấu câu cuối
    if (email.length <= 5) continue;
    if (!emails.includes(email)) emails.push(email);
  }

  return { phones, emails };
}

// Tiện ích che thông tin khi log (không lộ số/email đầy đủ).
export function maskPhone(phone: string): string {
  if (phone.length < 7) return "***";
  return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const head = user.slice(0, 1);
  return `${head}***@${domain}`;
}
