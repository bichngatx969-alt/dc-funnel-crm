-- DCOS Daily Intelligence — additive only (CREATE TABLE + CREATE INDEX).
-- Không sửa bảng hiện có, không DROP/ALTER/TRUNCATE/FK lên bảng khác.

-- CreateTable
CREATE TABLE "DailyIntelligenceReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'rule_based',
    "aiConfigured" BOOLEAN NOT NULL DEFAULT false,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "mainBottleneck" TEXT,
    "headline" TEXT,
    "organicSummaryJson" JSONB,
    "adsSummaryJson" JSONB,
    "inboxSummaryJson" JSONB,
    "salesSummaryJson" JSONB,
    "catalogSummaryJson" JSONB,
    "conversionFunnelJson" JSONB,
    "strengthsJson" JSONB,
    "weaknessesJson" JSONB,
    "bottlenecksJson" JSONB,
    "actionItemsJson" JSONB,
    "contentRecommendationsJson" JSONB,
    "adsRecommendationsJson" JSONB,
    "lessonsJson" JSONB,
    "rawReportJson" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyIntelligenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFinding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reportId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceJson" JSONB,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILesson" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidenceJson" JSONB,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "lastAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AILesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIActionItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reportId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyIntelligenceReport_workspaceId_idx" ON "DailyIntelligenceReport"("workspaceId");

-- CreateIndex
CREATE INDEX "DailyIntelligenceReport_workspaceId_reportDate_idx" ON "DailyIntelligenceReport"("workspaceId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyIntelligenceReport_workspaceId_reportDate_key" ON "DailyIntelligenceReport"("workspaceId", "reportDate");

-- CreateIndex
CREATE INDEX "AIFinding_workspaceId_idx" ON "AIFinding"("workspaceId");

-- CreateIndex
CREATE INDEX "AIFinding_workspaceId_reportId_idx" ON "AIFinding"("workspaceId", "reportId");

-- CreateIndex
CREATE INDEX "AIFinding_workspaceId_source_idx" ON "AIFinding"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "AIFinding_workspaceId_status_idx" ON "AIFinding"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AILesson_workspaceId_idx" ON "AILesson"("workspaceId");

-- CreateIndex
CREATE INDEX "AILesson_workspaceId_source_idx" ON "AILesson"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "AIActionItem_workspaceId_idx" ON "AIActionItem"("workspaceId");

-- CreateIndex
CREATE INDEX "AIActionItem_workspaceId_reportId_idx" ON "AIActionItem"("workspaceId", "reportId");

-- CreateIndex
CREATE INDEX "AIActionItem_workspaceId_status_idx" ON "AIActionItem"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AIActionItem_workspaceId_dueAt_idx" ON "AIActionItem"("workspaceId", "dueAt");
