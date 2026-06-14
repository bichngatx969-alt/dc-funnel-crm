-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALE');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('COLD', 'WARM', 'HOT', 'CUSTOMER', 'LOST');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('BOT_ACTIVE', 'HUMAN_TAKEOVER', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CUSTOMER', 'BOT', 'HUMAN', 'AI');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('KEYWORD', 'POSTBACK', 'QUICK_REPLY', 'DEFAULT', 'STAGE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP', 'CALL', 'CHECK_ORDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('FASHION', 'STUDIO', 'SALON', 'WEDDING', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "FacebookPageStatus" AS ENUM ('CONNECTED', 'MISSING_PERMISSION', 'TOKEN_EXPIRED', 'WEBHOOK_NOT_SUBSCRIBED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "FacebookConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "IntegrationAuditStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "EmailSequenceTrigger" AS ENUM ('TAG_ADDED', 'STAGE_CHANGED', 'FORM_SUBMITTED', 'MANUAL', 'PURCHASED', 'BOOKING_CREATED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailProviderName" AS ENUM ('RESEND', 'SMTP', 'GMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALE',
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "industry" "Industry" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "defaultTone" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "productServices" TEXT,
    "salesPolicy" TEXT,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookConnection" (
    "id" TEXT NOT NULL,
    "facebookUserId" TEXT,
    "facebookUserName" TEXT,
    "accessTokenEncrypted" TEXT,
    "tokenType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "FacebookConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookPage" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageUsername" TEXT,
    "pagePictureUrl" TEXT,
    "pageAccessTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectionId" TEXT,
    "botEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "permissionsJson" JSONB,
    "status" "FacebookPageStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookWebhookLog" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "eventType" TEXT,
    "payloadJson" JSONB NOT NULL,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAuditLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetPageId" TEXT,
    "status" "IntegrationAuditStatus" NOT NULL,
    "message" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "psid" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "source" TEXT,
    "firstCampaign" TEXT,
    "firstPostId" TEXT,
    "currentStage" "Stage" NOT NULL DEFAULT 'COLD',
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" TEXT,
    "emailConsent" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "customerId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'BOT_ACTIVE',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "text" TEXT,
    "payloadJson" JSONB,
    "metaMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "customerId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventValue" TEXT,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "name" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "triggerValue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowStep" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "quickRepliesJson" JSONB,
    "nextLogicJson" JSONB,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "tagsToAdd" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stageToSet" "Stage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "pageId" TEXT,
    "product" TEXT NOT NULL,
    "customerStage" "Stage",
    "triggerTag" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceText" TEXT,
    "offerText" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variablesJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "EmailSequenceTrigger" NOT NULL,
    "triggerValue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSequenceStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "conditionsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAutomationEnrollment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAutomationEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "sequenceId" TEXT,
    "provider" "EmailProviderName" NOT NULL DEFAULT 'RESEND',
    "providerMessageId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "metadataJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnsubscribeToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnsubscribeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "FacebookConnection_status_idx" ON "FacebookConnection"("status");

-- CreateIndex
CREATE INDEX "FacebookConnection_facebookUserId_idx" ON "FacebookConnection"("facebookUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPage_pageId_key" ON "FacebookPage"("pageId");

-- CreateIndex
CREATE INDEX "FacebookPage_botEnabled_idx" ON "FacebookPage"("botEnabled");

-- CreateIndex
CREATE INDEX "FacebookPage_status_idx" ON "FacebookPage"("status");

-- CreateIndex
CREATE INDEX "FacebookPage_connectionId_idx" ON "FacebookPage"("connectionId");

-- CreateIndex
CREATE INDEX "FacebookWebhookLog_pageId_idx" ON "FacebookWebhookLog"("pageId");

-- CreateIndex
CREATE INDEX "FacebookWebhookLog_processingStatus_idx" ON "FacebookWebhookLog"("processingStatus");

-- CreateIndex
CREATE INDEX "FacebookWebhookLog_createdAt_idx" ON "FacebookWebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationAuditLog_provider_idx" ON "IntegrationAuditLog"("provider");

-- CreateIndex
CREATE INDEX "IntegrationAuditLog_targetPageId_idx" ON "IntegrationAuditLog"("targetPageId");

-- CreateIndex
CREATE INDEX "IntegrationAuditLog_createdAt_idx" ON "IntegrationAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_currentStage_idx" ON "Customer"("currentStage");

-- CreateIndex
CREATE INDEX "Customer_lastInteractionAt_idx" ON "Customer"("lastInteractionAt");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_pageId_idx" ON "Customer"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_pageId_psid_key" ON "Customer"("pageId", "psid");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_pageId_idx" ON "Conversation"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_metaMessageId_key" ON "Message"("metaMessageId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_pageId_idx" ON "Message"("pageId");

-- CreateIndex
CREATE INDEX "FunnelEvent_customerId_idx" ON "FunnelEvent"("customerId");

-- CreateIndex
CREATE INDEX "FunnelEvent_eventName_idx" ON "FunnelEvent"("eventName");

-- CreateIndex
CREATE INDEX "FunnelEvent_pageId_idx" ON "FunnelEvent"("pageId");

-- CreateIndex
CREATE INDEX "Flow_pageId_idx" ON "Flow"("pageId");

-- CreateIndex
CREATE INDEX "FlowStep_key_idx" ON "FlowStep"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FlowStep_flowId_key_key" ON "FlowStep"("flowId", "key");

-- CreateIndex
CREATE INDEX "Offer_isActive_idx" ON "Offer"("isActive");

-- CreateIndex
CREATE INDEX "Offer_triggerTag_idx" ON "Offer"("triggerTag");

-- CreateIndex
CREATE INDEX "Offer_pageId_idx" ON "Offer"("pageId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "EmailSequence_triggerType_idx" ON "EmailSequence"("triggerType");

-- CreateIndex
CREATE INDEX "EmailSequence_isActive_idx" ON "EmailSequence"("isActive");

-- CreateIndex
CREATE INDEX "EmailSequenceStep_sequenceId_idx" ON "EmailSequenceStep"("sequenceId");

-- CreateIndex
CREATE INDEX "EmailAutomationEnrollment_status_idx" ON "EmailAutomationEnrollment"("status");

-- CreateIndex
CREATE INDEX "EmailAutomationEnrollment_nextRunAt_idx" ON "EmailAutomationEnrollment"("nextRunAt");

-- CreateIndex
CREATE INDEX "EmailAutomationEnrollment_customerId_sequenceId_idx" ON "EmailAutomationEnrollment"("customerId", "sequenceId");

-- CreateIndex
CREATE INDEX "EmailLog_customerId_idx" ON "EmailLog"("customerId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UnsubscribeToken_tokenHash_key" ON "UnsubscribeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UnsubscribeToken_customerId_idx" ON "UnsubscribeToken"("customerId");

-- AddForeignKey
ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FacebookConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "FacebookPage"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSequenceStep" ADD CONSTRAINT "EmailSequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSequenceStep" ADD CONSTRAINT "EmailSequenceStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAutomationEnrollment" ADD CONSTRAINT "EmailAutomationEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAutomationEnrollment" ADD CONSTRAINT "EmailAutomationEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

