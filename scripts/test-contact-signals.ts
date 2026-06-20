// Smoke test cho extractContactSignals (pure, không cần DB).
// Chạy: npx tsx scripts/test-contact-signals.ts
import { extractContactSignals, normalizeVietnamesePhone } from "../src/lib/contact/extract-contact-signals";

let pass = 0;
let fail = 0;

function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.log(`✗ ${name}\n   got:  ${g}\n   want: ${w}`);
  }
}

// --- Phone: nhận diện & chuẩn hoá ---
eq("SĐT thường", extractContactSignals("SĐT em 0961279174").phones, ["0961279174"]);
eq("Khoảng trắng", extractContactSignals("096 127 9174").phones, ["0961279174"]);
eq("Dấu chấm", extractContactSignals("096.127.9174").phones, ["0961279174"]);
eq("Dấu gạch", extractContactSignals("096-127-9174").phones, ["0961279174"]);
eq("+84 có cách", extractContactSignals("+84 961 279 174").phones, ["0961279174"]);
eq("+84 dính liền", extractContactSignals("+84961279174").phones, ["0961279174"]);
eq("84 không dấu +", extractContactSignals("84961279174").phones, ["0961279174"]);
eq("Hai số", extractContactSignals("0961279174 và 0387654321").phones, ["0961279174", "0387654321"]);
eq("Trùng → dedup", extractContactSignals("0961279174, lại 0961279174").phones, ["0961279174"]);

// --- Phone: loại không hợp lệ ---
eq("Đầu số sai (01)", extractContactSignals("0123456789").phones, []);
eq("Quá ngắn (9 số)", extractContactSignals("012345678").phones, []);
eq("Tiền/không phải SĐT", extractContactSignals("giá 1500000 đồng").phones, []);
eq("Nằm trong số dài", extractContactSignals("mã 120961279174999").phones, []);

// --- normalizeVietnamesePhone trực tiếp ---
eq("normalize +84", normalizeVietnamesePhone("+84961279174"), "0961279174");
eq("normalize 0084", normalizeVietnamesePhone("0084961279174"), "0961279174");
eq("normalize invalid", normalizeVietnamesePhone("12345"), null);

// --- Email ---
eq("Email thường", extractContactSignals("email em là abc@gmail.com").emails, ["abc@gmail.com"]);
eq("Email hoa → lowercase", extractContactSignals("Mail: ABC@Gmail.Com").emails, ["abc@gmail.com"]);
eq("Email markdown mailto", extractContactSignals("[abc@gmail.com](mailto:abc@gmail.com)").emails, ["abc@gmail.com"]);
eq("Email + dấu câu cuối", extractContactSignals("liên hệ abc@gmail.com.").emails, ["abc@gmail.com"]);
eq("Không có email", extractContactSignals("chỉ có chữ").emails, []);

// --- Hỗn hợp ---
const mix = extractContactSignals("Em tên Hạnh, sđt 0961279174, mail hanh@shop.vn nhé");
eq("Mix phone", mix.phones, ["0961279174"]);
eq("Mix email", mix.emails, ["hanh@shop.vn"]);

// --- Mô phỏng quy tắc không ghi đè (PART H case 2) ---
function decide(existingPhone: string | null, text: string) {
  const { phones } = extractContactSignals(text);
  return !existingPhone && phones[0] ? phones[0] : existingPhone;
}
eq("Field trống → điền", decide(null, "Số em 0961279174"), "0961279174");
eq("Field đã có → giữ nguyên", decide("0900000000", "Số mới 0961279174"), "0900000000");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
