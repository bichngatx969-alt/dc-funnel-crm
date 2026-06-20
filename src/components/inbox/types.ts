// Kiểu dùng chung cho module Inbox (conversation-first messaging workspace).

export type ConvItem = {
  id: string;
  pageId: string | null;
  facebookPage: { pageId: string; pageName: string } | null;
  status: string;
  lastMessageAt: string;
  customer: {
    id: string;
    name: string | null;
    psid: string;
    avatarUrl: string | null;
    currentStage: string;
    leadScore: number;
    tags: string[];
    phone: string | null;
  };
  assignedTo: { id: string; name: string | null } | null;
  lastMessage: { text: string | null; direction: string; createdAt: string } | null;
};

export type Msg = {
  id: string;
  direction: string;
  senderType: string;
  text: string | null;
  createdAt: string;
  payloadJson: any;
};

export type Detail = {
  conversation: any;
  tasks: any[];
};

export type InboxCustomer = {
  id: string;
  name: string | null;
  psid: string;
  avatarUrl: string | null;
  phone: string | null;
  currentStage: string;
  leadScore: number;
  tags: string[];
  source: string | null;
  firstCampaign: string | null;
  firstPostId: string | null;
  email: string | null;
  emailConsent: boolean;
  emailStatus: string;
  unsubscribedAt: string | null;
  gender: string | null;
  address: string | null;
  lastInteractionAt: string | null;
  lastActivityAt: string | null;
  createdAt: string | null;
};
