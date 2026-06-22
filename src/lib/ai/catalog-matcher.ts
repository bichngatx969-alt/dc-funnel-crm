import type {
  CatalogContext,
  CatalogContextItem,
  CatalogContextPackageComponent,
  CatalogContextServiceVariation,
  CatalogContextVariant,
} from "@/lib/ai/catalog-context";

export type CatalogMatcherResult = {
  matchedItems: MatchedCatalogItem[];
  matchedVariants: MatchedCatalogVariant[];
  matchedServices: MatchedCatalogService[];
  matchedPackages: MatchedCatalogPackage[];
  missingCatalogData: string[];
};

export type MatchedCatalogItem = {
  id: string;
  type: string;
  name: string;
  priceVnd: number;
  score: number;
  reason: string;
  available: boolean;
  warnings: string[];
};

export type MatchedCatalogVariant = {
  id: string;
  itemId: string;
  itemName: string;
  name: string;
  sku: string | null;
  priceVnd: number;
  inventoryQuantity: number;
  score: number;
  reason: string;
};

export type MatchedCatalogService = {
  itemId: string;
  itemName: string;
  variationId: string | null;
  variationName: string | null;
  durationMinutes: number | null;
  priceVnd: number;
  score: number;
  reason: string;
};

export type MatchedCatalogPackage = {
  id: string;
  name: string;
  priceVnd: number;
  retailValueVnd: number;
  savingsVnd: number;
  components: Array<Pick<CatalogContextPackageComponent, "componentItemId" | "itemName" | "quantity" | "pricingMode">>;
  score: number;
  reason: string;
};

export function matchCatalogContext(input: {
  context: CatalogContext;
  query: string;
  limit?: number;
}): CatalogMatcherResult {
  const query = normalizeSearch(input.query);
  const words = query.split(/\s+/).filter((word) => word.length >= 2);
  const limit = input.limit ?? 6;

  const itemMatches = input.context.items
    .map((item) => scoreItem(item, query, words))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matchedVariants = input.context.items
    .flatMap((item) => item.variants.map((variant) => scoreVariant(item, variant, query, words)))
    .filter((variant) => variant.score > 0 && variant.available)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matchedServices = input.context.items
    .filter((item) => item.type === "BOOKABLE_SERVICE")
    .flatMap((item) => scoreService(item, query, words))
    .filter((service) => service.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matchedPackages = input.context.items
    .filter((item) => item.type === "PACKAGE" && item.packageComponents.length > 0)
    .map((item) => scorePackage(item, query, words))
    .filter((pkg) => pkg.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    matchedItems: itemMatches.map(({ item, score, reason }) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      priceVnd: item.priceVnd,
      score,
      reason,
      available: item.available,
      warnings: item.warnings,
    })),
    matchedVariants: matchedVariants.map(({ item, variant, score, reason }) => ({
      id: variant.id,
      itemId: item.id,
      itemName: item.name,
      name: variantLabel(variant),
      sku: variant.sku,
      priceVnd: variant.priceVnd,
      inventoryQuantity: variant.inventoryQuantity,
      score,
      reason,
    })),
    matchedServices,
    matchedPackages,
    missingCatalogData: buildMissingCatalogData(input.context.items, itemMatches.map((match) => match.item)),
  };
}

function scoreItem(item: CatalogContextItem, query: string, words: string[]) {
  let score = 0;
  const haystack = normalizeSearch([
    item.name,
    item.sku,
    item.shortDescription,
    item.description,
    item.targetSegment,
    item.tags.join(" "),
    item.benefits.join(" "),
    item.faqs.join(" "),
    item.objections.join(" "),
    item.offerIdeas.join(" "),
  ].filter(Boolean).join(" "));
  if (!query) score += item.aiAuditScore ?? 1;
  if (containsPhrase(haystack, normalizeSearch(item.name), query)) score += 36;
  score += wordScore(haystack, words, 4);
  if (item.type === "PACKAGE" && hasAny(query, ["combo", "goi", "bundle", "uu dai", "tiet kiem"])) score += 14;
  if (item.type === "BOOKABLE_SERVICE" && hasAny(query, ["lich", "dat", "booking", "tu van", "chup", "spa", "salon"])) score += 12;
  if (item.type === "PHYSICAL_PRODUCT" && hasAny(query, ["size", "mau", "con hang", "ao", "quan", "san pham"])) score += 8;
  if (!item.available) score -= 18;
  return {
    item,
    score,
    reason: score > 20 ? "Khớp mạnh với tên/mô tả/tags catalog." : "Có tín hiệu liên quan trong catalog.",
  };
}

function scoreVariant(item: CatalogContextItem, variant: CatalogContextVariant, query: string, words: string[]) {
  const haystack = normalizeSearch([item.name, variant.name, variant.sku, variant.optionValues.join(" ")].filter(Boolean).join(" "));
  let score = 0;
  if (containsPhrase(haystack, normalizeSearch(item.name), query)) score += 20;
  if (containsPhrase(haystack, normalizeSearch(variant.name), query)) score += 24;
  score += wordScore(haystack, words, 5);
  if (variant.lowStock) score -= 4;
  return {
    item,
    variant,
    available: variant.available,
    score,
    reason: variant.inventoryTracked
      ? `Variant còn ${variant.inventoryQuantity} sản phẩm.`
      : "Variant đang active và không track tồn kho.",
  };
}

function scoreService(item: CatalogContextItem, query: string, words: string[]): MatchedCatalogService[] {
  const baseScore = scoreItem(item, query, words).score;
  const rows = item.serviceVariations.filter((variation) => variation.bookingEnabled);
  if (!rows.length && item.available) {
    return [
      {
        itemId: item.id,
        itemName: item.name,
        variationId: null,
        variationName: null,
        durationMinutes: item.serviceProfile?.defaultDurationMinutes ?? null,
        priceVnd: item.priceVnd,
        score: baseScore,
        reason: "Dịch vụ đang bật booking ở cấu hình chính.",
      },
    ];
  }
  return rows.map((variation) => {
    const haystack = normalizeSearch([item.name, variation.name, variation.description].filter(Boolean).join(" "));
    return {
      itemId: item.id,
      itemName: item.name,
      variationId: variation.id,
      variationName: variation.name,
      durationMinutes: variation.durationMinutes,
      priceVnd: variation.priceVnd || item.priceVnd,
      score: baseScore + wordScore(haystack, words, 4),
      reason: `Dịch vụ có gói ${variation.durationMinutes} phút và đang nhận booking.`,
    };
  });
}

function scorePackage(item: CatalogContextItem, query: string, words: string[]): MatchedCatalogPackage {
  const baseScore = scoreItem(item, query, words).score;
  const componentText = item.packageComponents.map((component) => component.itemName).join(" ");
  const score = baseScore + wordScore(normalizeSearch(componentText), words, 3);
  const retailValueVnd = item.packageComponents.reduce(
    (sum, component) => sum + (component.variantPriceVnd ?? component.itemPriceVnd) * component.quantity,
    0
  );
  return {
    id: item.id,
    name: item.name,
    priceVnd: item.priceVnd,
    retailValueVnd,
    savingsVnd: Math.max(0, retailValueVnd - item.priceVnd),
    components: item.packageComponents.map((component) => ({
      componentItemId: component.componentItemId,
      itemName: component.variantName ? `${component.itemName} - ${component.variantName}` : component.itemName,
      quantity: component.quantity,
      pricingMode: component.pricingMode,
    })),
    score,
    reason: "Package/combo có component phù hợp để upsell hoặc xử lý phản đối giá.",
  };
}

function buildMissingCatalogData(allItems: CatalogContextItem[], matchedItems: CatalogContextItem[]) {
  const focusItems = matchedItems.length ? matchedItems : allItems.slice(0, 8);
  const missing = new Set<string>();
  for (const item of focusItems) {
    if (!item.hasCoverImage) missing.add(`${item.name}: thiếu ảnh cover.`);
    if (item.type === "PHYSICAL_PRODUCT") {
      if (!item.variants.length) missing.add(`${item.name}: chưa có variant size/màu.`);
      if (item.variants.length && !item.variants.some((variant) => variant.available)) missing.add(`${item.name}: variant đang hết hàng.`);
    }
    if (item.type === "BOOKABLE_SERVICE") {
      if (!item.serviceVariations.length) missing.add(`${item.name}: chưa có service variation/thời lượng.`);
      if (!item.available) missing.add(`${item.name}: booking chưa bật.`);
    }
    if (item.type === "PACKAGE") {
      if (!item.packageComponents.length) missing.add(`${item.name}: package chưa có component.`);
    }
    if (!item.faqs.length) missing.add(`${item.name}: thiếu FAQ tư vấn.`);
  }
  return Array.from(missing).slice(0, 10);
}

function variantLabel(variant: CatalogContextVariant) {
  return variant.optionValues.length ? variant.optionValues.join(" / ") : variant.name;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(haystack: string, phrase: string, query: string) {
  return Boolean(phrase && query && query.includes(phrase)) || Boolean(phrase && haystack.includes(phrase) && phrase.length > 3);
}

function wordScore(haystack: string, words: string[], weight: number) {
  return words.reduce((score, word) => score + (haystack.includes(word) ? weight : 0), 0);
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalizeSearch(word)));
}
