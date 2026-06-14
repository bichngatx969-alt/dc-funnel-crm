// Kiểu UI-local cho Pipeline, theo API contract mục 16.2 (Codex sở hữu shape backend).
// Không phải nguồn contract — chỉ để render UI.

export type OppStatus = "OPEN" | "WON" | "LOST";

export type PipelineStage = {
  id: string;
  pipelineId?: string;
  name: string;
  position: number;
  color: string | null;
  showInReports?: boolean;
};

export type PipelineListItem = {
  id: string;
  workspaceId: string;
  name: string;
  industryTemplate: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
  _count?: { opportunities: number };
};

export type PipelineTemplate = {
  key: string;
  label: string;
  pipelineName: string;
  stages: { name: string; position: number; color: string; showInReports: boolean }[];
};

export type OppCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  psid: string;
  currentStage?: string;
  tags?: string[];
};

export type OppOwner = { id: string; name: string | null; email: string } | null;

export type Opportunity = {
  id: string;
  workspaceId: string;
  customerId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  valueVnd: number;
  status: OppStatus;
  ownerId: string | null;
  source: string | null;
  expectedCloseAt: string | null;
  lastActivityAt: string | null;
  closedAt: string | null;
  customer?: OppCustomer | null;
  owner?: OppOwner;
  stage?: { id: string; name: string; position: number; color: string | null };
};

export type PipelineDetail = {
  id: string;
  workspaceId: string;
  name: string;
  industryTemplate: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
  opportunities: Opportunity[];
};

export type StageSummary = { stageId: string; count: number; valueVnd: number };
