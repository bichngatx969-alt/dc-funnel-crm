// Backfill SĐT/email cho Customer từ các message inbound cũ.
// CHỈ điền field trống, KHÔNG ghi đè. Mặc định DRY-RUN; thêm --apply để ghi thật.
//
// Chạy:
//   npx tsx scripts/backfill-contact-signals.ts          # xem trước (dry-run)
//   npx tsx scripts/backfill-contact-signals.ts --apply  # ghi vào DB
//
// KHÔNG in nội dung tin nhắn khách; chỉ in summary + số masked.
import { PrismaClient } from "@prisma/client";
import {
  extractContactSignals,
  maskEmail,
  maskPhone,
} from "../src/lib/contact/extract-contact-signals";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null, OR: [{ phone: null }, { email: null }] },
    select: { id: true, phone: true, email: true },
  });

  let updatedPhones = 0;
  let updatedEmails = 0;
  let skippedExisting = 0;
  let noSignals = 0;

  for (const c of customers) {
    const convs = await prisma.conversation.findMany({
      where: { customerId: c.id },
      select: { id: true },
    });
    const convIds = convs.map((x) => x.id);
    let phone: string | null = null;
    let email: string | null = null;

    if (convIds.length > 0) {
      const msgs = await prisma.message.findMany({
        where: { conversationId: { in: convIds }, direction: "INBOUND", text: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { text: true },
      });
      for (const m of msgs) {
        const sig = extractContactSignals(m.text);
        if (!phone && sig.phones[0]) phone = sig.phones[0];
        if (!email && sig.emails[0]) email = sig.emails[0];
        if (phone && email) break;
      }
    }

    const data: { phone?: string; email?: string; lastActivityAt?: Date } = {};
    if (!c.phone && phone) data.phone = phone;
    if (!c.email && email) data.email = email;

    // Đếm trường hợp tìm thấy signal nhưng field đã có (tôn trọng dữ liệu cũ).
    if ((phone && c.phone) || (email && c.email)) skippedExisting++;

    if (data.phone || data.email) {
      const parts: string[] = [];
      if (data.phone) {
        updatedPhones++;
        parts.push(`phone=${maskPhone(data.phone)}`);
      }
      if (data.email) {
        updatedEmails++;
        parts.push(`email=${maskEmail(data.email)}`);
      }
      if (APPLY) {
        data.lastActivityAt = new Date();
        await prisma.customer.update({ where: { id: c.id }, data });
      }
      console.log(`${APPLY ? "[update]" : "[dry]"} customer=${c.id} ${parts.join(" ")}`);
    } else if (!phone && !email) {
      noSignals++;
    }
  }

  console.log("\n=== Backfill summary ===");
  console.log(JSON.stringify(
    {
      mode: APPLY ? "APPLY" : "DRY_RUN",
      scannedCustomers: customers.length,
      updatedPhones,
      updatedEmails,
      skippedExisting,
      noSignals,
    },
    null,
    2
  ));
  if (!APPLY) console.log("(dry-run — chưa ghi DB. Thêm --apply để cập nhật thật.)");
}

main()
  .catch((e) => {
    console.error("Backfill error:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
