import type { CatalogItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CatalogContextVariant = {
  id: string;
  catalogItemId: string;
  name: string;
  sku: string | null;
  optionValues: string[];
  priceVnd: number;
  inventoryTracked: boolean;
  inventoryQuantity: number;
  lowStockThreshold: number | null;
  available: boolean;
  lowStock: boolean;
};

export type CatalogContextServiceVariation = {
  id: string;
  catalogItemId: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string | null;
  bookingEnabled: boolean;
};

export type CatalogContextPackageComponent = {
  id: string;
  componentItemId: string;
  componentVariantId: string | null;
  quantity: number;
  pricingMode: string;
  itemName: string;
  itemType: CatalogItemType;
  itemPriceVnd: number;
  variantName: string | null;
  variantPriceVnd: number | null;
  available: boolean;
};

export type CatalogContextItem = {
  id: string;
  type: CatalogItemType;
  name: string;
  sku: string | null;
  priceVnd: number;
  compareAtPriceVnd: number | null;
  costVnd: number | null;
  marginVnd: number | null;
  shortDescription: string | null;
  description: string | null;
  targetSegment: string | null;
  tags: string[];
  benefits: string[];
  faqs: string[];
  objections: string[];
  offerIdeas: string[];
  salesScript: string | null;
  aiAuditScore: number | null;
  hasCoverImage: boolean;
  variants: CatalogContextVariant[];
  serviceProfile: {
    bookingEnabled: boolean;
    defaultDurationMinutes: number | null;
    depositRequired: boolean;
    depositVnd: number | null;
    locationMode: string;
  } | null;
  serviceVariations: CatalogContextServiceVariation[];
  packageComponents: CatalogContextPackageComponent[];
  available: boolean;
  warnings: string[];
};

export type CatalogConversationContext = {
  conversation: {
    id: string;
    pageId: string | null;
    pageName: string | null;
  } | null;
  customer: {
    id: string;
    name: string | null;
    currentStage: string;
    leadScore: number;
    tags: string[];
  } | null;
  recentMessages: Array<{
    direction: string;
    senderType: string;
    text: string | null;
    createdAt: Date;
  }>;
  recentOrders: Array<{
    code: string;
    status: string;
    totalVnd: number;
  }>;
};

export type CatalogContext = {
  workspaceId: string;
  items: CatalogContextItem[];
  conversationContext: CatalogConversationContext;
};

export async function buildCatalogContextForConversation(params: {
  workspaceId: string;
  conversationId?: string;
  itemLimit?: number;
}): Promise<CatalogContext> {
  const [conversation, items] = await Promise.all([
    params.conversationId
      ? prisma.conversation.findFirst({
          where: { id: params.conversationId, workspaceId: params.workspaceId },
          include: {
            customer: true,
            facebookPage: { select: { pageName: true } },
          },
        })
      : null,
    prisma.catalogItem.findMany({
      where: { workspaceId: params.workspaceId, status: "ACTIVE", deletedAt: null },
      orderBy: [{ aiAuditScore: "desc" }, { updatedAt: "desc" }],
      take: params.itemLimit ?? 80,
      select: {
        id: true,
        type: true,
        name: true,
        sku: true,
        basePriceVnd: true,
        compareAtPriceVnd: true,
        costVnd: true,
        marginVnd: true,
        shortDescription: true,
        description: true,
        targetSegment: true,
        tagsJson: true,
        benefitsJson: true,
        faqsJson: true,
        objectionsJson: true,
        offerIdeasJson: true,
        salesScript: true,
        aiAuditScore: true,
        coverImageId: true,
      },
    }),
  ]);

  const itemIds = items.map((item) => item.id);
  const [variants, serviceProfiles, serviceVariations, packageComponents, messages, orders] = await Promise.all([
    itemIds.length
      ? prisma.catalogVariant.findMany({
          where: { workspaceId: params.workspaceId, catalogItemId: { in: itemIds }, deletedAt: null },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            catalogItemId: true,
            name: true,
            sku: true,
            optionValuesJson: true,
            priceVnd: true,
            inventoryTracked: true,
            inventoryQuantity: true,
            lowStockThreshold: true,
            status: true,
          },
        })
      : [],
    itemIds.length
      ? prisma.serviceProfile.findMany({
          where: { workspaceId: params.workspaceId, catalogItemId: { in: itemIds } },
          select: {
            catalogItemId: true,
            bookingEnabled: true,
            defaultDurationMinutes: true,
            depositRequired: true,
            depositVnd: true,
            locationMode: true,
          },
        })
      : [],
    itemIds.length
      ? prisma.serviceVariation.findMany({
          where: { workspaceId: params.workspaceId, catalogItemId: { in: itemIds }, deletedAt: null },
          orderBy: [{ bookingEnabled: "desc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            catalogItemId: true,
            name: true,
            durationMinutes: true,
            priceVnd: true,
            description: true,
            bookingEnabled: true,
          },
        })
      : [],
    itemIds.length
      ? prisma.packageComponent.findMany({
          where: { workspaceId: params.workspaceId, packageItemId: { in: itemIds }, deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            packageItemId: true,
            componentItemId: true,
            componentVariantId: true,
            quantity: true,
            pricingMode: true,
            componentItem: {
              select: {
                name: true,
                type: true,
                basePriceVnd: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        })
      : [],
    conversation
      ? prisma.message.findMany({
          where: { workspaceId: params.workspaceId, conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { direction: true, senderType: true, text: true, createdAt: true },
        })
      : [],
    conversation
      ? prisma.order.findMany({
          where: { workspaceId: params.workspaceId, customerId: conversation.customerId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { code: true, status: true, totalVnd: true },
        })
      : [],
  ]);

  const variantsByItemId = groupBy(variants.map(toContextVariant), (variant) => variant.catalogItemId);
  const variantById = new Map(
    Array.from(variantsByItemId.values()).flatMap((rows) => rows.map((variant) => [variant.id, variant] as const))
  );
  const serviceProfileByItemId = new Map(serviceProfiles.map((profile) => [profile.catalogItemId, profile]));
  const serviceVariationByItemId = groupBy(serviceVariations, (variation) => variation.catalogItemId);
  const componentsByPackageId = groupBy(
    packageComponents.map((component) => {
      const variant = component.componentVariantId ? variantById.get(component.componentVariantId) ?? null : null;
      const available =
        component.componentItem.status === "ACTIVE" &&
        component.componentItem.deletedAt === null &&
        (!variant || variant.available);
      return {
        id: component.id,
        packageItemId: component.packageItemId,
        componentItemId: component.componentItemId,
        componentVariantId: component.componentVariantId,
        quantity: component.quantity,
        pricingMode: component.pricingMode,
        itemName: component.componentItem.name,
        itemType: component.componentItem.type,
        itemPriceVnd: component.componentItem.basePriceVnd,
        variantName: variant?.name ?? null,
        variantPriceVnd: variant?.priceVnd ?? null,
        available,
      };
    }),
    (component) => component.packageItemId
  );

  return {
    workspaceId: params.workspaceId,
    items: items.map((item) => {
      const itemVariants = variantsByItemId.get(item.id) ?? [];
      const profile = serviceProfileByItemId.get(item.id) ?? null;
      const serviceRows = serviceVariationByItemId.get(item.id) ?? [];
      const componentRows = componentsByPackageId.get(item.id) ?? [];
      const warnings = buildWarnings(item.type, itemVariants, profile, serviceRows, componentRows);
      return {
        id: item.id,
        type: item.type,
        name: item.name,
        sku: item.sku,
        priceVnd: item.basePriceVnd,
        compareAtPriceVnd: item.compareAtPriceVnd,
        costVnd: item.costVnd,
        marginVnd: item.marginVnd,
        shortDescription: item.shortDescription,
        description: item.description,
        targetSegment: item.targetSegment,
        tags: asTextArray(item.tagsJson),
        benefits: asTextArray(item.benefitsJson),
        faqs: asTextArray(item.faqsJson),
        objections: asTextArray(item.objectionsJson),
        offerIdeas: asTextArray(item.offerIdeasJson),
        salesScript: item.salesScript,
        aiAuditScore: item.aiAuditScore,
        hasCoverImage: Boolean(item.coverImageId),
        variants: itemVariants,
        serviceProfile: profile
          ? {
              bookingEnabled: profile.bookingEnabled,
              defaultDurationMinutes: profile.defaultDurationMinutes,
              depositRequired: profile.depositRequired,
              depositVnd: profile.depositVnd,
              locationMode: profile.locationMode,
            }
          : null,
        serviceVariations: serviceRows,
        packageComponents: componentRows,
        available: warnings.every((warning) => !warning.startsWith("UNAVAILABLE")),
        warnings,
      };
    }),
    conversationContext: {
      conversation: conversation
        ? {
            id: conversation.id,
            pageId: conversation.pageId,
            pageName: conversation.facebookPage?.pageName ?? null,
          }
        : null,
      customer: conversation
        ? {
            id: conversation.customer.id,
            name: conversation.customer.name,
            currentStage: conversation.customer.currentStage,
            leadScore: conversation.customer.leadScore,
            tags: conversation.customer.tags,
          }
        : null,
      recentMessages: messages.reverse(),
      recentOrders: orders,
    },
  };
}

function toContextVariant(variant: {
  id: string;
  catalogItemId: string;
  name: string;
  sku: string | null;
  optionValuesJson: unknown;
  priceVnd: number;
  inventoryTracked: boolean;
  inventoryQuantity: number;
  lowStockThreshold: number | null;
  status: string;
}): CatalogContextVariant {
  const available = variant.status === "ACTIVE" && (!variant.inventoryTracked || variant.inventoryQuantity > 0);
  return {
    id: variant.id,
    catalogItemId: variant.catalogItemId,
    name: variant.name,
    sku: variant.sku,
    optionValues: optionValuesToText(variant.optionValuesJson),
    priceVnd: variant.priceVnd,
    inventoryTracked: variant.inventoryTracked,
    inventoryQuantity: variant.inventoryQuantity,
    lowStockThreshold: variant.lowStockThreshold,
    available,
    lowStock:
      variant.status === "ACTIVE" &&
      variant.inventoryTracked &&
      variant.lowStockThreshold !== null &&
      variant.inventoryQuantity <= variant.lowStockThreshold,
  };
}

function buildWarnings(
  type: CatalogItemType,
  variants: CatalogContextVariant[],
  profile: { bookingEnabled: boolean } | null,
  serviceVariations: CatalogContextServiceVariation[],
  components: CatalogContextPackageComponent[]
) {
  const warnings: string[] = [];
  if (type === "PHYSICAL_PRODUCT") {
    if (!variants.length) warnings.push("MISSING_VARIANTS");
    if (variants.length && !variants.some((variant) => variant.available)) warnings.push("UNAVAILABLE_OUT_OF_STOCK");
    if (variants.some((variant) => variant.lowStock)) warnings.push("LOW_STOCK");
  }
  if (type === "BOOKABLE_SERVICE") {
    if (!profile?.bookingEnabled && !serviceVariations.some((variation) => variation.bookingEnabled)) warnings.push("UNAVAILABLE_BOOKING_DISABLED");
    if (!serviceVariations.length) warnings.push("MISSING_SERVICE_VARIATIONS");
  }
  if (type === "PACKAGE") {
    if (!components.length) warnings.push("UNAVAILABLE_MISSING_COMPONENTS");
    if (components.some((component) => !component.available)) warnings.push("UNAVAILABLE_COMPONENT");
  }
  return warnings;
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 40);
}

function optionValuesToText(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([key, val]) => `${key}: ${String(val ?? "").trim()}`)
    .filter((item) => !item.endsWith(":"))
    .slice(0, 12);
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}
