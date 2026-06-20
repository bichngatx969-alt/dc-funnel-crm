-- Additive migration: AI conversation insight foundation.
-- Safety: creates new tables only; no destructive statements and no changes to existing table nullability.

CREATE TABLE "AIConversationInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "buyingIntent" TEXT,
    "funnelStage" TEXT,
    "communicationStyle" TEXT,
    "sentiment" TEXT,
    "customerSegment" TEXT,
    "mainNeed" TEXT,
    "objectionsJson" JSONB,
    "productsInterestedJson" JSONB,
    "missingDataJson" JSONB,
    "nextBestAction" TEXT,
    "recommendedOffer" TEXT,
    "suggestedReply" TEXT,
    "confidence" DOUBLE PRECISION,
    "rawJson" JSONB,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversationInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIAnalysisRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputHash" TEXT,
    "outputJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysisRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIConversationInsight_workspaceId_idx" ON "AIConversationInsight"("workspaceId");
CREATE INDEX "AIConversationInsight_customerId_idx" ON "AIConversationInsight"("customerId");
CREATE INDEX "AIConversationInsight_conversationId_idx" ON "AIConversationInsight"("conversationId");
CREATE INDEX "AIConversationInsight_ws_conv_updated_idx" ON "AIConversationInsight"("workspaceId", "conversationId", "updatedAt");

CREATE INDEX "AIAnalysisRun_workspaceId_idx" ON "AIAnalysisRun"("workspaceId");
CREATE INDEX "AIAnalysisRun_sourceType_sourceId_idx" ON "AIAnalysisRun"("sourceType", "sourceId");
CREATE INDEX "AIAnalysisRun_status_idx" ON "AIAnalysisRun"("status");
CREATE INDEX "AIAnalysisRun_createdAt_idx" ON "AIAnalysisRun"("createdAt");
CREATE INDEX "AIAnalysisRun_ws_source_created_idx" ON "AIAnalysisRun"("workspaceId", "sourceType", "sourceId", "createdAt");

ALTER TABLE "AIConversationInsight"
  ADD CONSTRAINT "AIConversationInsight_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIConversationInsight"
  ADD CONSTRAINT "AIConversationInsight_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIConversationInsight"
  ADD CONSTRAINT "AIConversationInsight_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIAnalysisRun"
  ADD CONSTRAINT "AIAnalysisRun_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
