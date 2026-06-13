// Bỏ dấu tiếng Việt + lowercase để so khớp keyword không phụ thuộc dấu.
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ các dấu thanh (combining marks)
    .replace(/đ/g, "d")
    .trim();
}

// Kiểm tra text (đã bỏ dấu) có chứa bất kỳ từ khóa nào trong danh sách.
export function containsAny(normalized: string, keywords: string[]): boolean {
  return keywords.some((k) => normalized.includes(k));
}
