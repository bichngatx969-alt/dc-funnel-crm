-- CreateEnum
CREATE TYPE "FacebookCommentStatus" AS ENUM ('OPEN', 'REPLIED', 'HIDDEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "FacebookPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "externalPostId" TEXT NOT NULL,
    "permalink" TEXT,
    "message" TEXT,
    "externalCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookComment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "postId" TEXT,
    "customerId" TEXT,
    "conversationId" TEXT,
    "externalPostId" TEXT NOT NULL,
    "externalCommentId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "message" TEXT,
    "fromName" TEXT,
    "fromId" TEXT,
    "permalink" TEXT,
    "status" "FacebookCommentStatus" NOT NULL DEFAULT 'OPEN',
    "hasPhone" BOOLEAN NOT NULL DEFAULT false,
    "needsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "externalCreatedAt" TIMESTAMP(3),
    "rawPayloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FacebookComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPost_workspaceId_pageId_externalPostId_key" ON "FacebookPost"("workspaceId", "pageId", "externalPostId");

-- CreateIndex
CREATE INDEX "FacebookPost_workspaceId_idx" ON "FacebookPost"("workspaceId");

-- CreateIndex
CREATE INDEX "FacebookPost_pageId_idx" ON "FacebookPost"("pageId");

-- CreateIndex
CREATE INDEX "FacebookPost_externalPostId_idx" ON "FacebookPost"("externalPostId");

-- CreateIndex
CREATE INDEX "FacebookPost_deletedAt_idx" ON "FacebookPost"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookComment_workspaceId_pageId_externalCommentId_key" ON "FacebookComment"("workspaceId", "pageId", "externalCommentId");

-- CreateIndex
CREATE INDEX "FacebookComment_workspaceId_idx" ON "FacebookComment"("workspaceId");

-- CreateIndex
CREATE INDEX "FacebookComment_pageId_idx" ON "FacebookComment"("pageId");

-- CreateIndex
CREATE INDEX "FacebookComment_postId_idx" ON "FacebookComment"("postId");

-- CreateIndex
CREATE INDEX "FacebookComment_customerId_idx" ON "FacebookComment"("customerId");

-- CreateIndex
CREATE INDEX "FacebookComment_conversationId_idx" ON "FacebookComment"("conversationId");

-- CreateIndex
CREATE INDEX "FacebookComment_externalPostId_idx" ON "FacebookComment"("externalPostId");

-- CreateIndex
CREATE INDEX "FacebookComment_parentCommentId_idx" ON "FacebookComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "FacebookComment_status_idx" ON "FacebookComment"("status");

-- CreateIndex
CREATE INDEX "FacebookComment_hasPhone_idx" ON "FacebookComment"("hasPhone");

-- CreateIndex
CREATE INDEX "FacebookComment_needsFollowUp_idx" ON "FacebookComment"("needsFollowUp");

-- CreateIndex
CREATE INDEX "FacebookComment_createdAt_idx" ON "FacebookComment"("createdAt");

-- CreateIndex
CREATE INDEX "FacebookComment_deletedAt_idx" ON "FacebookComment"("deletedAt");

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookComment" ADD CONSTRAINT "FacebookComment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookComment" ADD CONSTRAINT "FacebookComment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookComment" ADD CONSTRAINT "FacebookComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FacebookPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookComment" ADD CONSTRAINT "FacebookComment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookComment" ADD CONSTRAINT "FacebookComment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
