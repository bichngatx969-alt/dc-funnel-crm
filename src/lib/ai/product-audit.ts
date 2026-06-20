import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { env, isAiEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type ProductAuditPayload = {
  completenessScore: number;
  missingFields: string[];
  targetSegments: string[];
  painPoints: string[];
  benefits: string[];
  faqSuggestions: string[];
  objectionHandling: string[];
  offerIdeas: string[];
  contentAngles: string[];
  salesScriptSuggestions: string[];
  nextActions: string[];
};

type ProductAuditResult = {
  aiConfigured: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  product: Awaited<ReturnType<typeof prisma.productLite.update>>;
  audit: ProductAuditPayload;
  error?: string;
};

const SYSTEM_PROMPT = `Bạn là AI Product/Service Auditor cho CRM bán hàng.
Nhiệm vụ: kiểm tra thông tin sản phẩm/dịch vụ còn thiếu để sale tư vấn tốt hơn.
Không bịa chính sách, không ghi đè dữ liệu gốc. Trả về JSON hợp lệ bằng tiếng Việt.`;

export async function auditProductService(params: {
  workspaceId: string;
  productId: string;
}): Promise<ProductAuditResult | null> {
  const product = await prisma.productLite.findFirst({
    where: { id: params.productId, workspaceId: params.workspaceId, deletedAt: null },
  });
  if (!product) return null;

  let audit: ProductAuditPayload;
  let status: ProductAuditResult["status"] = "SUCCESS";
  let error: string | undefined;
  const aiConfigured = isAiEnabled();

  if (aiConfigured) {
    try {
      audit = normalizeAudit(await auditWithOpenAI(product));
    } catch (err) {
      status = "FAILED";
      error = err instanceof Error ? err.message : String(err);
      audit = buildRuleBasedAudit(product);
    }
  } else {
    status = "SKIPPED";
    error = "AI_NOT_CONFIGURED";
    audit = buildRuleBasedAudit(product);
  }

  const updated = await prisma.productLite.update({
    where: { id: product.id },
    data: {
      aiAuditScore: audit.completenessScore,
      aiAuditJson: {
        ...audit,
        aiConfigured,
        status,
        fallback: !aiConfigured || status === "FAILED",
        error,
      } as Prisma.InputJsonValue,
      aiAuditedAt: new Date(),
    },
  });

  return { aiConfigured, status, product: updated, audit, error };
}

async function auditWithOpenAI(product: Awaited<ReturnType<typeof prisma.productLite.findFirst>>) {
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  const client = new OpenAI({ apiKey: env.openaiApiKey });
  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Hãy audit sản phẩm/dịch vụ sau và trả JSON đúng schema:
{
  "completenessScore": 0,
  "missingFields": ["..."],
  "targetSegments": ["..."],
  "painPoints": ["..."],
  "benefits": ["..."],
  "faqSuggestions": ["..."],
  "objectionHandling": ["..."],
  "offerIdeas": ["..."],
  "contentAngles": ["..."],
  "salesScriptSuggestions": ["..."],
  "nextActions": ["..."]
}

Sản phẩm:
- Tên: ${product.name}
- SKU: ${product.sku ?? "chưa có"}
- Giá VND: ${product.priceVnd}
- Mô tả: ${product.description ?? "chưa có"}
- Target segment hiện có: ${product.targetSegment ?? "chưa có"}
- Script sale hiện có: ${product.salesScript ?? "chưa có"}
- Pain points hiện có: ${JSON.stringify(product.painPointsJson ?? null)}
- Benefits hiện có: ${JSON.stringify(product.benefitsJson ?? null)}
- FAQ hiện có: ${JSON.stringify(product.faqsJson ?? null)}
- Objections hiện có: ${JSON.stringify(product.objectionsJson ?? null)}
- Offer ideas hiện có: ${JSON.stringify(product.offerIdeasJson ?? null)}

Chỉ gợi ý phần thiếu. Không tự sửa field gốc.`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  return JSON.parse(content) as Record<string, unknown>;
}

function buildRuleBasedAudit(product: NonNullable<Awaited<ReturnType<typeof prisma.productLite.findFirst>>>): ProductAuditPayload {
  const missingFields: string[] = [];
  if (!product.description || product.description.trim().length < 30) missingFields.push("Mô tả sản phẩm/dịch vụ đủ rõ");
  if (!product.priceVnd || product.priceVnd <= 0) missingFields.push("Giá bán VND");
  if (!product.targetSegment) missingFields.push("Chân dung khách hàng mục tiêu");
  if (!product.painPointsJson) missingFields.push("Pain point khách hàng");
  if (!product.benefitsJson) missingFields.push("Lợi ích/USP");
  if (!product.faqsJson) missingFields.push("FAQ tư vấn");
  if (!product.objectionsJson) missingFields.push("Xử lý phản đối");
  if (!product.offerIdeasJson) missingFields.push("Ý tưởng offer/combo");
  if (!product.salesScript) missingFields.push("Sales script ngắn cho inbox");

  const completenessScore = Math.max(0, Math.min(100, Math.round(((9 - missingFields.length) / 9) * 100)));
  const productName = product.name;

  return {
    completenessScore,
    missingFields,
    targetSegments: product.targetSegment ? [product.targetSegment] : ["Khách từng hỏi sản phẩm tương tự trên inbox/comment"],
    painPoints: product.painPointsJson ? asStringArray(product.painPointsJson) : ["Chưa rõ lý do khách cần sản phẩm này"],
    benefits: product.benefitsJson ? asStringArray(product.benefitsJson) : [`Cần bổ sung 3-5 lợi ích cụ thể của ${productName}`],
    faqSuggestions: product.faqsJson
      ? asStringArray(product.faqsJson)
      : ["Giá bao nhiêu?", "Có size/mẫu/màu nào?", "Chính sách đổi trả thế nào?", "Giao hàng mất bao lâu?"],
    objectionHandling: product.objectionsJson
      ? asStringArray(product.objectionsJson)
      : ["Chuẩn bị câu trả lời cho phản đối về giá, niềm tin, size/chất lượng và thời gian giao hàng."],
    offerIdeas: product.offerIdeasJson
      ? asStringArray(product.offerIdeasJson)
      : [`Combo/ưu đãi thử nghiệm cho ${productName}`, "Freeship hoặc quà nhỏ cho khách chốt nhanh"],
    contentAngles: [
      "Before/After hoặc feedback khách thật",
      "So sánh lợi ích theo nhu cầu cụ thể",
      "Video/ảnh thật giúp giảm nghi ngờ",
    ],
    salesScriptSuggestions: product.salesScript
      ? [product.salesScript]
      : [`Dạ mẫu ${productName} hiện đang có ưu đãi. Chị muốn em tư vấn theo nhu cầu/size để chọn đúng mẫu nhất không ạ?`],
    nextActions: missingFields.length
      ? missingFields.slice(0, 5).map((field) => `Bổ sung: ${field}`)
      : ["Thông tin sản phẩm khá đầy đủ; có thể test offer và theo dõi tỷ lệ chốt."],
  };
}

function normalizeAudit(raw: Record<string, unknown>): ProductAuditPayload {
  return {
    completenessScore: clampScore(raw.completenessScore),
    missingFields: asStringArray(raw.missingFields),
    targetSegments: asStringArray(raw.targetSegments),
    painPoints: asStringArray(raw.painPoints),
    benefits: asStringArray(raw.benefits),
    faqSuggestions: asStringArray(raw.faqSuggestions),
    objectionHandling: asStringArray(raw.objectionHandling),
    offerIdeas: asStringArray(raw.offerIdeas),
    contentAngles: asStringArray(raw.contentAngles),
    salesScriptSuggestions: asStringArray(raw.salesScriptSuggestions),
    nextActions: asStringArray(raw.nextActions),
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function clampScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
