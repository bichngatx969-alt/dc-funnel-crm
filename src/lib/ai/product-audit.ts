import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogItemSelect } from "@/lib/catalog";
import { getAIProviderStatus, generateStructuredAIResponse } from "@/lib/ai/provider";

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
  sourceType: "PRODUCT_LITE" | "CATALOG_ITEM";
  product: Awaited<ReturnType<typeof prisma.productLite.update>> | Awaited<ReturnType<typeof prisma.catalogItem.update>>;
  audit: ProductAuditPayload;
  error?: string;
};

type ProductLiteRecord = NonNullable<Awaited<ReturnType<typeof prisma.productLite.findFirst>>>;
type CatalogItemRecord = NonNullable<Awaited<ReturnType<typeof prisma.catalogItem.findFirst>>>;
type AuditSubject =
  | { sourceType: "PRODUCT_LITE"; record: ProductLiteRecord }
  | { sourceType: "CATALOG_ITEM"; record: CatalogItemRecord };

type CatalogAuditSignals = {
  variantCount: number;
  activeVariantCount: number;
  availableVariantCount: number;
  lowStockVariantCount: number;
  hasBookableProfile: boolean;
  serviceVariationCount: number;
  bookableServiceVariationCount: number;
  packageComponentCount: number;
  unavailablePackageComponentCount: number;
};

const SYSTEM_PROMPT = `Bạn là AI Product/Service Auditor cho CRM bán hàng.
Nhiệm vụ: kiểm tra thông tin sản phẩm/dịch vụ còn thiếu để sale tư vấn tốt hơn.
Không bịa chính sách, không ghi đè dữ liệu gốc. Trả về JSON hợp lệ bằng tiếng Việt.`;

export async function auditProductService(params: {
  workspaceId: string;
  productId: string;
}): Promise<ProductAuditResult | null> {
  const subject = await findAuditSubject(params.workspaceId, params.productId);
  if (!subject) return null;

  let audit: ProductAuditPayload;
  let status: ProductAuditResult["status"] = "SUCCESS";
  let error: string | undefined;
  const aiConfigured = getAIProviderStatus().configured;
  const signals = subject.sourceType === "CATALOG_ITEM" ? await loadCatalogAuditSignals(params.workspaceId, subject.record.id) : null;

  if (aiConfigured) {
    try {
      audit = normalizeAudit(await auditWithOpenAI(subject, signals));
    } catch (err) {
      status = "FAILED";
      error = err instanceof Error ? err.message : String(err);
      audit = buildRuleBasedAudit(subject, signals);
    }
  } else {
    status = "SKIPPED";
    error = "AI_NOT_CONFIGURED";
    audit = buildRuleBasedAudit(subject, signals);
  }

  const updated = await updateAuditCache(subject, audit, { aiConfigured, status, error });
  return { aiConfigured, status, sourceType: subject.sourceType, product: updated, audit, error };
}

async function findAuditSubject(workspaceId: string, id: string): Promise<AuditSubject | null> {
  const product = await prisma.productLite.findFirst({
    where: { id, workspaceId, deletedAt: null },
  });
  if (product) return { sourceType: "PRODUCT_LITE", record: product };
  const catalogItem = await prisma.catalogItem.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: catalogItemSelect,
  });
  if (catalogItem) return { sourceType: "CATALOG_ITEM", record: catalogItem };
  return null;
}

async function updateAuditCache(
  subject: AuditSubject,
  audit: ProductAuditPayload,
  meta: { aiConfigured: boolean; status: ProductAuditResult["status"]; error?: string }
) {
  const data = {
    aiAuditScore: audit.completenessScore,
    aiAuditJson: {
      ...audit,
      aiConfigured: meta.aiConfigured,
      status: meta.status,
      fallback: !meta.aiConfigured || meta.status === "FAILED",
      error: meta.error,
      sourceType: subject.sourceType,
    } as Prisma.InputJsonValue,
    aiAuditedAt: new Date(),
  };
  if (subject.sourceType === "CATALOG_ITEM") {
    return prisma.catalogItem.update({
      where: { id: subject.record.id },
      data,
      select: catalogItemSelect,
    });
  }
  return prisma.productLite.update({
    where: { id: subject.record.id },
    data,
  });
}

async function auditWithOpenAI(subject: AuditSubject, signals: CatalogAuditSignals | null) {
  const product = subject.record;
  return generateStructuredAIResponse({
    task: "product-audit",
    system: SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 900,
    prompt: `Hãy audit sản phẩm/dịch vụ sau và trả JSON đúng schema:
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
- Nguồn dữ liệu: ${subject.sourceType}
- Loại catalog: ${getSubjectTypeLabel(subject)}
- Trạng thái: ${getSubjectStatusLabel(subject)}
- Giá VND: ${getPriceVnd(subject)}
- Giá so sánh VND: ${getCompareAtPriceLabel(subject)}
- Giá vốn VND: ${product.costVnd ?? "chưa có"}
- Margin VND: ${product.marginVnd ?? "chưa có"}
- Category: ${getCategoryLabel(subject)}
- Cover image: ${getCoverImageLabel(subject)}
- Mô tả: ${product.description ?? "chưa có"}
- Target segment hiện có: ${product.targetSegment ?? "chưa có"}
- Script sale hiện có: ${product.salesScript ?? "chưa có"}
- Pain points hiện có: ${JSON.stringify(product.painPointsJson ?? null)}
- Benefits hiện có: ${JSON.stringify(product.benefitsJson ?? null)}
- FAQ hiện có: ${JSON.stringify(product.faqsJson ?? null)}
- Objections hiện có: ${JSON.stringify(product.objectionsJson ?? null)}
- Offer ideas hiện có: ${JSON.stringify(product.offerIdeasJson ?? null)}
- Variant/tồn kho: ${signals ? `${signals.activeVariantCount}/${signals.variantCount} variant active, ${signals.availableVariantCount} còn hàng, ${signals.lowStockVariantCount} sắp hết` : "n/a"}
- Booking: ${signals ? `profile bookable=${signals.hasBookableProfile}, variations=${signals.bookableServiceVariationCount}/${signals.serviceVariationCount}` : "n/a"}
- Package components: ${signals ? `${signals.packageComponentCount} components, unavailable=${signals.unavailablePackageComponentCount}` : "n/a"}

Chỉ gợi ý phần thiếu. Không tự sửa field gốc.`,
  });
}

function buildRuleBasedAudit(subject: AuditSubject, signals: CatalogAuditSignals | null): ProductAuditPayload {
  const product = subject.record;
  const missingFields: string[] = [];
  if (!product.description || product.description.trim().length < 30) missingFields.push("Mô tả sản phẩm/dịch vụ đủ rõ");
  if (!getPriceVnd(subject) || getPriceVnd(subject) <= 0) missingFields.push("Giá bán VND");
  if (!product.targetSegment) missingFields.push("Chân dung khách hàng mục tiêu");
  if (!product.painPointsJson) missingFields.push("Pain point khách hàng");
  if (!product.benefitsJson) missingFields.push("Lợi ích/USP");
  if (!product.faqsJson) missingFields.push("FAQ tư vấn");
  if (!product.objectionsJson) missingFields.push("Xử lý phản đối");
  if (!product.offerIdeasJson) missingFields.push("Ý tưởng offer/combo");
  if (!product.salesScript) missingFields.push("Sales script ngắn cho inbox");
  if (subject.sourceType === "CATALOG_ITEM") {
    const catalogItem = subject.record;
    if (!catalogItem.coverImageId) missingFields.push("Ảnh cover");
    if (!catalogItem.galleryJson) missingFields.push("Gallery ảnh");
    if (!catalogItem.categoryId) missingFields.push("Danh mục catalog");
    if (catalogItem.costVnd === null) missingFields.push("Giá vốn để tính margin");
    if (catalogItem.type === "PHYSICAL_PRODUCT") {
      if (!signals?.variantCount) missingFields.push("Variant size/màu/chất liệu");
      else if (!signals.availableVariantCount) missingFields.push("Variant còn hàng để AI/sale gợi ý");
      if (signals?.lowStockVariantCount) missingFields.push("Kế hoạch xử lý variant sắp hết hàng");
    }
    if (catalogItem.type === "BOOKABLE_SERVICE") {
      if (!signals?.hasBookableProfile) missingFields.push("Cấu hình bật booking cho dịch vụ");
      if (!signals?.bookableServiceVariationCount) missingFields.push("Service variation có thời lượng/giá và đang nhận lịch");
    }
    if (catalogItem.type === "PACKAGE") {
      if (!signals?.packageComponentCount) missingFields.push("Package components");
      if (signals?.unavailablePackageComponentCount) missingFields.push("Component/variant trong package đang không khả dụng");
    }
  }

  const totalFields = subject.sourceType === "CATALOG_ITEM" ? 15 : 9;
  const completenessScore = Math.max(0, Math.min(100, Math.round(((totalFields - missingFields.length) / totalFields) * 100)));
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

async function loadCatalogAuditSignals(workspaceId: string, catalogItemId: string): Promise<CatalogAuditSignals> {
  const [variants, serviceProfile, serviceVariations, packageComponents] = await Promise.all([
    prisma.catalogVariant.findMany({
      where: { workspaceId, catalogItemId, deletedAt: null },
      select: {
        status: true,
        inventoryTracked: true,
        inventoryQuantity: true,
        lowStockThreshold: true,
      },
    }),
    prisma.serviceProfile.findFirst({
      where: { workspaceId, catalogItemId },
      select: { bookingEnabled: true },
    }),
    prisma.serviceVariation.findMany({
      where: { workspaceId, catalogItemId, deletedAt: null },
      select: { bookingEnabled: true },
    }),
    prisma.packageComponent.findMany({
      where: { workspaceId, packageItemId: catalogItemId, deletedAt: null },
      select: {
        componentVariantId: true,
        componentItem: { select: { status: true, deletedAt: true } },
      },
    }),
  ]);
  const activeVariants = variants.filter((variant) => variant.status === "ACTIVE");
  const availableVariants = activeVariants.filter((variant) => !variant.inventoryTracked || variant.inventoryQuantity > 0);
  const lowStockVariants = activeVariants.filter(
    (variant) =>
      variant.inventoryTracked &&
      variant.lowStockThreshold !== null &&
      variant.inventoryQuantity <= variant.lowStockThreshold
  );
  const unavailablePackageComponents = packageComponents.filter(
    (component) => component.componentItem.status !== "ACTIVE" || component.componentItem.deletedAt !== null
  );
  return {
    variantCount: variants.length,
    activeVariantCount: activeVariants.length,
    availableVariantCount: availableVariants.length,
    lowStockVariantCount: lowStockVariants.length,
    hasBookableProfile: Boolean(serviceProfile?.bookingEnabled),
    serviceVariationCount: serviceVariations.length,
    bookableServiceVariationCount: serviceVariations.filter((variation) => variation.bookingEnabled).length,
    packageComponentCount: packageComponents.length,
    unavailablePackageComponentCount: unavailablePackageComponents.length,
  };
}

function getPriceVnd(subject: AuditSubject): number {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.basePriceVnd : subject.record.priceVnd;
}

function getSubjectTypeLabel(subject: AuditSubject): string {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.type : "ProductLite cũ";
}

function getSubjectStatusLabel(subject: AuditSubject): string {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.status : subject.record.isActive ? "ACTIVE" : "ARCHIVED";
}

function getCompareAtPriceLabel(subject: AuditSubject): string | number {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.compareAtPriceVnd ?? "chưa có" : "không có";
}

function getCategoryLabel(subject: AuditSubject): string {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.categoryId ?? "chưa có" : "không có";
}

function getCoverImageLabel(subject: AuditSubject): string {
  return subject.sourceType === "CATALOG_ITEM" ? subject.record.coverImageId ?? "chưa có" : "không có";
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
