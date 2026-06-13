// Phát hiện và chuẩn hóa số điện thoại di động Việt Nam trong một đoạn text.
// Hỗ trợ định dạng có khoảng trắng, dấu chấm, gạch ngang, +84 / 84 / 0.
// Đầu số di động hợp lệ: 3, 5, 7, 8, 9 (10 số khi bắt đầu bằng 0).
export function extractVietnamPhone(text: string | null | undefined): string | null {
  if (!text) return null;

  // Bỏ các ký tự phân tách phổ biến giữa các chữ số.
  const normalized = text.replace(/[()\s.\-_]/g, "");

  // Không cho phép liền kề chữ số khác để tránh bắt nhầm chuỗi số dài.
  const match = normalized.match(/(?<!\d)(?:\+?84|0)(3|5|7|8|9)\d{8}(?!\d)/);
  if (!match) return null;

  let num = match[0];
  if (num.startsWith("+84")) num = "0" + num.slice(3);
  else if (num.startsWith("84")) num = "0" + num.slice(2);
  return num;
}
