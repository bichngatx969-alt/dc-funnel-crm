-- Additive migration: Product/Service AI Auditor fields.
-- Safety: nullable columns only; no destructive statements and no existing data rewrite.

ALTER TABLE "ProductLite" ADD COLUMN "costVnd" INTEGER;
ALTER TABLE "ProductLite" ADD COLUMN "marginVnd" INTEGER;
ALTER TABLE "ProductLite" ADD COLUMN "targetSegment" TEXT;
ALTER TABLE "ProductLite" ADD COLUMN "painPointsJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "benefitsJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "faqsJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "objectionsJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "offerIdeasJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "salesScript" TEXT;
ALTER TABLE "ProductLite" ADD COLUMN "aiAuditScore" INTEGER;
ALTER TABLE "ProductLite" ADD COLUMN "aiAuditJson" JSONB;
ALTER TABLE "ProductLite" ADD COLUMN "aiAuditedAt" TIMESTAMP(3);
