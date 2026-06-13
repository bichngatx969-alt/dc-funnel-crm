import type { Stage } from "@prisma/client";
import type { Vertical } from "../types";

export type QR = { title: string; payload: string };

export type StepDef = {
  key: string;
  messageText: string;
  quickReplies?: QR[];
  scoreDelta?: number;
  tagsToAdd?: string[];
  stageToSet?: Stage | null;
};

export type FlowDef = {
  vertical: Vertical;
  name: string;
  welcomeKey: string;
  steps: StepDef[];
};

// ----------------------------------------------------------------
// FASHION (HICHAOS, Nam Nguyên Store)
// ----------------------------------------------------------------
const FASHION_PRODUCT_QR: QR[] = [
  { title: "Tư vấn size", payload: "NEED_SIZE" },
  { title: "Xem combo", payload: "NEED_COMBO" },
  { title: "Xem ảnh thật", payload: "NEED_REAL_IMAGE" },
];

function fashionProductStep(key: string, tag: string): StepDef {
  return {
    key,
    messageText:
      "Dạ mẫu này đang được hỏi nhiều hôm nay ạ. Chị muốn em tư vấn theo size hay xem combo ưu đãi trước ạ?",
    quickReplies: FASHION_PRODUCT_QR,
    scoreDelta: 2,
    tagsToAdd: [tag, "da_chon_san_pham"],
  };
}

const fashionFlow: FlowDef = {
  vertical: "fashion",
  name: "Flow Thời trang (mặc định)",
  welcomeKey: "welcome",
  steps: [
    {
      key: "welcome",
      messageText: "Dạ shop chào chị 💗 Chị đang quan tâm mẫu nào ạ?",
      quickReplies: [
        { title: "Baby Tee Bướm Pink", payload: "PRODUCT_BABY_TEE_BUTTERFLY" },
        { title: "Baby Tee Basic", payload: "PRODUCT_BABY_TEE_BASIC" },
        { title: "Áo Unisex", payload: "PRODUCT_UNISEX" },
        { title: "Xem mẫu đang sale", payload: "PRODUCT_SALE" },
      ],
    },
    fashionProductStep("PRODUCT_BABY_TEE_BUTTERFLY", "sp_baby_tee_buom_pink"),
    fashionProductStep("PRODUCT_BABY_TEE_BASIC", "sp_baby_tee_basic"),
    fashionProductStep("PRODUCT_UNISEX", "sp_ao_unisex"),
    fashionProductStep("PRODUCT_SALE", "sp_dang_sale"),
    {
      key: "NEED_SIZE",
      messageText:
        "Chị cho em xin chiều cao/cân nặng để em tư vấn size mặc đẹp nhất nha.",
      scoreDelta: 2,
      tagsToAdd: ["hoi_size"],
    },
    {
      key: "NEED_COMBO",
      messageText: "Dạ em gửi chị combo ưu đãi đang chạy hôm nay ạ:",
      scoreDelta: 2,
      tagsToAdd: ["hoi_combo", "hoi_gia"],
    },
    {
      key: "NEED_REAL_IMAGE",
      messageText:
        "Dạ có ạ. Em gửi chị ảnh thật/mẫu mặc để chị dễ chọn hơn nha. Chị thích form ôm nhẹ hay rộng thoải mái ạ?",
      scoreDelta: 1,
      tagsToAdd: ["hoi_anh_that"],
    },
  ],
};

// ----------------------------------------------------------------
// STUDIO (D.C Studio)
// ----------------------------------------------------------------
const studioFlow: FlowDef = {
  vertical: "studio",
  name: "Flow Studio ảnh (mặc định)",
  welcomeKey: "welcome",
  steps: [
    {
      key: "welcome",
      messageText:
        "D.C Studio chào anh/chị. Anh/chị đang muốn chụp ảnh cho mục đích nào ạ?",
      quickReplies: [
        { title: "Profile cá nhân", payload: "PROFILE" },
        { title: "Beauty/Fashion", payload: "BEAUTY" },
        { title: "Gia đình/Couple", payload: "FAMILY" },
        { title: "Tư vấn concept", payload: "CONCEPT" },
      ],
    },
    {
      key: "PROFILE",
      messageText:
        "Anh/chị dùng ảnh profile cho CV, thương hiệu cá nhân, MC/nghệ sĩ hay kinh doanh ạ?",
      quickReplies: [
        { title: "CV", payload: "PROFILE_CV" },
        { title: "Thương hiệu cá nhân", payload: "PROFILE_PERSONAL_BRANDING" },
        { title: "MC/Nghệ sĩ", payload: "PROFILE_MC" },
        { title: "Kinh doanh", payload: "PROFILE_BUSINESS" },
      ],
      scoreDelta: 2,
      tagsToAdd: ["chup_profile"],
    },
    {
      key: "BEAUTY",
      messageText:
        "Dạ mảng Beauty/Fashion bên em có nhiều concept đẹp ạ. Anh/chị muốn chụp phong cách nào, hay để em tư vấn concept đang hot nhất ạ?",
      scoreDelta: 2,
      tagsToAdd: ["chup_beauty"],
    },
    {
      key: "FAMILY",
      messageText:
        "Dạ chụp Gia đình/Couple đang rất được yêu thích ạ. Anh/chị dự định chụp cho mấy người và vào dịp nào ạ?",
      scoreDelta: 2,
      tagsToAdd: ["chup_family"],
    },
    {
      key: "CONCEPT",
      messageText:
        "Dạ em tư vấn concept theo nhu cầu ạ. Anh/chị cho em xin mục đích sử dụng ảnh và ngân sách dự kiến để em gợi ý concept phù hợp nha.",
      scoreDelta: 1,
      tagsToAdd: ["tu_van_concept"],
    },
    profileSubStep("PROFILE_CV", "profile_cv"),
    profileSubStep("PROFILE_PERSONAL_BRANDING", "profile_personal_branding"),
    profileSubStep("PROFILE_MC", "profile_mc"),
    profileSubStep("PROFILE_BUSINESS", "profile_business"),
  ],
};

function profileSubStep(key: string, tag: string): StepDef {
  return {
    key,
    messageText:
      "Dạ em note nhu cầu của anh/chị rồi ạ. Anh/chị muốn chụp vào khoảng thời gian nào để em tư vấn gói phù hợp nhất ạ?",
    scoreDelta: 2,
    tagsToAdd: [tag],
  };
}

// ----------------------------------------------------------------
// SALON (Kaho Hair Salon)
// ----------------------------------------------------------------
const salonFlow: FlowDef = {
  vertical: "salon",
  name: "Flow Salon (mặc định)",
  welcomeKey: "welcome",
  steps: [
    {
      key: "welcome",
      messageText: "Kaho Hair Salon chào chị. Chị đang quan tâm dịch vụ nào ạ?",
      quickReplies: [
        { title: "Nhuộm tóc", payload: "HAIR_COLOR" },
        { title: "Phục hồi tóc", payload: "HAIR_TREATMENT" },
        { title: "Cắt/gội/dưỡng sinh", payload: "HAIR_CUT_WASH" },
        { title: "Đặt lịch", payload: "BOOKING" },
      ],
    },
    {
      key: "HAIR_COLOR",
      messageText:
        "Dạ bên em có nhiều màu nhuộm hot đang được ưa chuộng ạ. Tóc chị hiện đang để màu gì và dài tới đâu để em tư vấn màu lên chuẩn nhất ạ?",
      scoreDelta: 2,
      tagsToAdd: ["nhuom_toc"],
    },
    {
      key: "HAIR_TREATMENT",
      messageText:
        "Dạ phục hồi tóc bên em giúp tóc mềm mượt rõ rệt ạ. Tóc chị đang gặp tình trạng gì (khô, xơ, gãy rụng) để em tư vấn liệu trình phù hợp ạ?",
      scoreDelta: 2,
      tagsToAdd: ["phuc_hoi_toc"],
    },
    {
      key: "HAIR_CUT_WASH",
      messageText:
        "Dạ chị muốn cắt tạo kiểu hay gội dưỡng sinh thư giãn ạ? Em tư vấn giúp chị nha.",
      scoreDelta: 1,
      tagsToAdd: ["cat_goi_duong"],
    },
    {
      key: "BOOKING",
      messageText:
        "Chị muốn đặt lịch ngày nào và khung giờ nào để em kiểm tra giúp chị ạ?",
      scoreDelta: 3,
      tagsToAdd: ["dat_lich"],
    },
  ],
};

// ----------------------------------------------------------------
// Registry + helpers
// ----------------------------------------------------------------
export const FLOW_DEFS: Record<Vertical, FlowDef> = {
  fashion: fashionFlow,
  studio: studioFlow,
  salon: salonFlow,
};

export function getFlowDef(vertical: Vertical): FlowDef {
  return FLOW_DEFS[vertical];
}

export function getDefaultStep(vertical: Vertical, key: string): StepDef | null {
  return FLOW_DEFS[vertical].steps.find((s) => s.key === key) ?? null;
}

export function getWelcomeStep(vertical: Vertical): StepDef {
  const def = FLOW_DEFS[vertical];
  return def.steps.find((s) => s.key === def.welcomeKey) ?? def.steps[0];
}
