import { PrismaClient, type Stage } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FLOW_DEFS } from "../src/lib/flows/defaults";

const prisma = new PrismaClient();

async function main() {
  // ----------------------------------------------------------------
  // 1) Admin user
  // ----------------------------------------------------------------
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@dcgroup.vn").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const adminName = process.env.ADMIN_NAME || "Admin D.C";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      name: adminName,
    },
  });
  console.log("✔ Admin:", adminEmail);

  // ----------------------------------------------------------------
  // 2) Brand profile mặc định cho instance MVP
  // ----------------------------------------------------------------
  const brandProfile = await prisma.brandProfile.findFirst();
  if (brandProfile) {
    await prisma.brandProfile.update({
      where: { id: brandProfile.id },
      data: {
        brandName: "HICHAOS",
        industry: "FASHION",
        defaultTone: "trẻ trung, nữ tính, thân thiện, tư vấn nhanh, có định hướng chốt đơn mềm",
      },
    });
  } else {
    await prisma.brandProfile.create({
      data: {
        brandName: "HICHAOS",
        industry: "FASHION",
        description: "Thương hiệu thời trang nữ trẻ trung, tập trung vào các sản phẩm dễ mặc và dễ chốt qua inbox.",
        defaultTone: "trẻ trung, nữ tính, thân thiện, tư vấn nhanh, có định hướng chốt đơn mềm",
        primaryColor: "#e11d6b",
        productServices: "Baby Tee, áo thun nữ, combo thời trang nữ theo chiến dịch Facebook Ads.",
        salesPolicy: "Tư vấn size nhanh, hỗ trợ đổi size trong 3 ngày, ưu tiên combo/freeship theo chiến dịch.",
        contactInfo: "Cấu hình thông tin liên hệ thật của HICHAOS trong /settings/brand.",
      },
    });
  }
  console.log("✔ BrandProfile: HICHAOS");

  // ----------------------------------------------------------------
  // 3) Offers mẫu theo industry FASHION
  // ----------------------------------------------------------------
  const offers = [
    {
      product: "Baby Tee",
      title: "Combo 2 Baby Tee freeship",
      description: "Combo bán chạy nhất cho chiến dịch FB Ads.",
      offerText: "Combo 2 áo Baby Tee chỉ 320K, FREESHIP toàn quốc, đổi size trong 3 ngày ạ.",
      priceText: "320K / 2 áo",
      triggerTag: "hoi_combo",
      customerStage: null as Stage | null,
      priority: 10,
      isActive: true,
    },
    {
      product: "Áo nữ",
      title: "Tư vấn size và màu nhanh",
      description: "Offer mềm cho khách hỏi size/màu nhưng chưa chốt.",
      offerText: "Mình gửi em chiều cao/cân nặng hoặc mẫu đang thích, em tư vấn size và màu hợp dáng cho mình ngay nha.",
      priceText: null,
      triggerTag: "hoi_size",
      customerStage: null as Stage | null,
      priority: 6,
      isActive: true,
    },
  ];

  for (const o of offers) {
    const existing = await prisma.offer.findFirst({
      where: { pageId: null, title: o.title },
    });
    if (!existing) await prisma.offer.create({ data: o });
  }
  console.log("✔ Offers:", offers.length);

  // ----------------------------------------------------------------
  // 4) Flow mặc định theo industry FASHION
  // ----------------------------------------------------------------
  for (const def of [FLOW_DEFS.fashion]) {
    let flow = await prisma.flow.findFirst({ where: { triggerValue: def.vertical } });
    if (!flow) {
      flow = await prisma.flow.create({
        data: {
          name: def.name,
          triggerType: "DEFAULT",
          triggerValue: def.vertical,
          isActive: true,
        },
      });
    }

    for (const s of def.steps) {
      await prisma.flowStep.upsert({
        where: { flowId_key: { flowId: flow.id, key: s.key } },
        update: {}, // không ghi đè để giữ chỉnh sửa của user ở các lần seed sau
        create: {
          flowId: flow.id,
          key: s.key,
          messageText: s.messageText,
          quickRepliesJson: s.quickReplies ?? undefined,
          scoreDelta: s.scoreDelta ?? 0,
          tagsToAdd: s.tagsToAdd ?? [],
          stageToSet: (s.stageToSet ?? null) as Stage | null,
        },
      });
    }
    console.log("✔ Flow:", def.name, `(${def.steps.length} steps)`);
  }

  await seedEmail();
}

function wrap(inner: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.6">${inner}<hr style="margin-top:24px;border:none;border-top:1px solid #eee"/><p style="font-size:12px;color:#999">{{appName}} · Nếu không muốn nhận email này nữa, <a href="{{unsubscribeUrl}}">bấm để hủy đăng ký</a>.</p></div>`;
}

async function seedEmail() {
  const templates = [
    {
      name: "Fashion - Lead follow-up",
      subject: "Mẫu chị hỏi vẫn còn ưu đãi hôm nay 💗",
      preheader: "Ưu đãi còn hiệu lực hôm nay",
      bodyHtml: wrap(
        `<p>Dạ chào {{customer.name}},</p><p>Mẫu chị đang quan tâm vẫn còn hàng và đang có ưu đãi ạ.</p><p><b>{{offer.title}}</b><br/>{{offer.offerText}}</p><p>Chị nhắn lại fanpage để em chốt size &amp; lên đơn giúp chị nha 💗</p>`
      ),
    },
    {
      name: "Studio - Chuẩn bị buổi chụp profile",
      subject: "Gợi ý chuẩn bị trước buổi chụp profile",
      preheader: "Checklist nhỏ để buổi chụp đẹp hơn",
      bodyHtml: wrap(
        `<p>Chào {{customer.name}},</p><p>Để buổi chụp profile lên hình đẹp nhất, anh/chị chuẩn bị giúp em:</p><ul><li>2-3 bộ trang phục theo phong cách mong muốn</li><li>Tinh thần thoải mái, ngủ đủ giấc</li><li>Hình tham khảo concept anh/chị thích</li></ul><p>Anh/chị nhắn fanpage để em chốt lịch tư vấn concept nha.</p>`
      ),
    },
    {
      name: "Salon - Nhắc lịch tư vấn tóc",
      subject: "Nhắc lịch tư vấn tóc tại Kaho Hair Salon",
      preheader: "Xác nhận khung giờ giúp em nha",
      bodyHtml: wrap(
        `<p>Chào {{customer.name}},</p><p>Em nhắc lịch dịch vụ chị đang quan tâm tại Kaho Hair Salon ạ.</p><p>Chị xác nhận giúp em ngày &amp; khung giờ phù hợp để em giữ chỗ nha.</p>`
      ),
    },
    {
      name: "Post-purchase - Cảm ơn",
      subject: "Cảm ơn anh/chị đã tin chọn",
      preheader: "Cảm ơn & hướng dẫn sử dụng",
      bodyHtml: wrap(
        `<p>Cảm ơn {{customer.name}} đã tin chọn {{appName}} 💗</p><p>Nếu cần hỗ trợ sử dụng/bảo quản sản phẩm, anh/chị cứ nhắn fanpage nha.</p><p>Anh/chị thấy ổn thì giới thiệu bạn bè giúp em nhé, em cảm ơn nhiều ạ!</p>`
      ),
    },
  ];

  const idByName: Record<string, string> = {};
  for (const t of templates) {
    let row = await prisma.emailTemplate.findFirst({ where: { name: t.name } });
    if (!row) row = await prisma.emailTemplate.create({ data: t });
    idByName[t.name] = row.id;
  }
  console.log("✔ Email templates:", templates.length);

  const sequences: {
    name: string;
    triggerType: "TAG_ADDED" | "STAGE_CHANGED" | "FORM_SUBMITTED";
    triggerValue: string | null;
    templateName: string;
  }[] = [
    { name: "Fashion - Khách hỏi combo", triggerType: "TAG_ADDED", triggerValue: "hoi_combo", templateName: "Fashion - Lead follow-up" },
    { name: "Chăm sóc khách HOT", triggerType: "STAGE_CHANGED", triggerValue: "HOT", templateName: "Fashion - Lead follow-up" },
    { name: "Welcome sau khi đồng ý email", triggerType: "FORM_SUBMITTED", triggerValue: null, templateName: "Fashion - Lead follow-up" },
  ];
  for (const s of sequences) {
    const existing = await prisma.emailSequence.findFirst({ where: { name: s.name } });
    if (existing) continue;
    await prisma.emailSequence.create({
      data: {
        name: s.name,
        triggerType: s.triggerType,
        triggerValue: s.triggerValue,
        isActive: true,
        steps: {
          create: [{ templateId: idByName[s.templateName], delayMinutes: 0, order: 0 }],
        },
      },
    });
  }
  console.log("✔ Email sequences:", sequences.length);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed hoàn tất.");
  })
  .catch(async (e) => {
    console.error("Seed lỗi:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
