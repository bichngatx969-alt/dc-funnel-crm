-- Additive performance indexes for workspace-scoped list and dashboard queries.
-- Safe to apply on existing data: no table/column drops, deletes, or NOT NULL changes.

CREATE INDEX IF NOT EXISTS "Conversation_ws_page_last_idx"
ON "Conversation" ("workspaceId", "pageId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_ws_status_last_idx"
ON "Conversation" ("workspaceId", "status", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Message_ws_conv_created_idx"
ON "Message" ("workspaceId", "conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "Customer_ws_activity_idx"
ON "Customer" ("workspaceId", "deletedAt", "lastActivityAt", "updatedAt");

CREATE INDEX IF NOT EXISTS "Customer_ws_stage_deleted_idx"
ON "Customer" ("workspaceId", "currentStage", "deletedAt");

CREATE INDEX IF NOT EXISTS "FacebookComment_ws_follow_created_idx"
ON "FacebookComment" ("workspaceId", "deletedAt", "needsFollowUp", "createdAt");

CREATE INDEX IF NOT EXISTS "FacebookComment_ws_status_created_idx"
ON "FacebookComment" ("workspaceId", "status", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Task_ws_status_due_idx"
ON "Task" ("workspaceId", "status", "dueAt");

CREATE INDEX IF NOT EXISTS "Opportunity_ws_status_updated_idx"
ON "Opportunity" ("workspaceId", "deletedAt", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "Opportunity_ws_stage_deleted_idx"
ON "Opportunity" ("workspaceId", "stageId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Order_ws_created_idx"
ON "Order" ("workspaceId", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_ws_status_created_idx"
ON "Order" ("workspaceId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_ws_payment_created_idx"
ON "Order" ("workspaceId", "paymentStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationRule_ws_active_updated_idx"
ON "AutomationRule" ("workspaceId", "deletedAt", "isActive", "updatedAt");

CREATE INDEX IF NOT EXISTS "AutomationRun_ws_status_created_idx"
ON "AutomationRun" ("workspaceId", "status", "createdAt");
