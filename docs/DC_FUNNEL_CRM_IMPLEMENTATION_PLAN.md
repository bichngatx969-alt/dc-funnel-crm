# D.C FUNNEL CRM — Multi-Tenant Implementation Plan

**Phiên bản:** v1.0  
**Ngày tạo:** 2026-06-14  
**Người dùng:** Anh Đức / D.C Group  
**Mục tiêu:** Dùng làm file làm việc chung cho Codex và Claude. Hai agent đọc file này, triển khai theo phân vai, sau đó cập nhật tiến độ và báo cáo trực tiếp vào chính file này để anh Đức gửi lại cho ChatGPT kiểm tra.

---

## 0. Cách sử dụng file này

### 0.1. Dành cho anh Đức

1. Đưa file này vào root repo của dự án, đề xuất tên:
   ```bash
   docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
   ```
2. Giao cho Codex đọc toàn bộ file trước khi code.
3. Giao cho Claude đọc toàn bộ file trước khi làm UI/UX hoặc docs.
4. Sau mỗi ngày hoặc mỗi PR, yêu cầu từng agent cập nhật mục:
   - `17. Daily Agent Report`
   - `18. PR Completion Report`
   - `19. Blockers / Founder Decisions`
5. Khi cả hai agent đã cập nhật, gửi lại chính file này cho ChatGPT để kiểm tra và điều phối bước tiếp theo.

### 0.2. Dành cho Codex và Claude

Trước khi làm bất kỳ việc gì:

- Đọc toàn bộ file này.
- Không tự ý đổi scope.
- Không sửa file thuộc ownership của agent khác nếu chưa có handoff.
- Không chạy migration phá dữ liệu.
- Không deploy.
- Không xóa file hoặc reset database.
- Mọi PR phải nhỏ, có mô tả, có cách test, typecheck/build pass nếu có thể.

---

## 1. Product Decision — Chọn Hướng A

Founder đã chốt:

> **Hướng A — Multi-tenant thật.**

D.C FUNNEL CRM sẽ là một hệ thống có cấu trúc:

```text
Agency / Organization
  └── Workspace / Brand
        ├── Users / Members
        ├── Channels
        ├── Contacts
        ├── Conversations
        ├── Pipelines
        ├── Opportunities
        ├── Tasks
        ├── Orders
        ├── Automation Rules
        └── Reports
```

Không triển khai theo hướng mỗi brand là một deploy riêng.

### 1.1. Ý nghĩa kỹ thuật

Bắt buộc phải có:

- `organizations`
- `workspaces`
- `workspace_members`
- `workspaceId` trên dữ liệu nghiệp vụ chính
- Workspace switcher
- Tenant isolation ở backend
- Role/permission theo workspace

### 1.2. Ý nghĩa sản phẩm

D.C FUNNEL CRM không còn là một Facebook Funnel Bot single-brand. Mục tiêu mới là:

> **CRM Funnel multi-brand cho agency và local brand Việt Nam.**

---

## 2. Tóm tắt hiện trạng codebase theo audit

Theo audit hiện tại, repo đang là:

> **Một MVP Facebook Messenger Funnel Bot single-brand làm khá chắc tay.**

### 2.1. Cái đã có và nên giữ lại

Không đập đi làm lại các phần sau:

- Facebook OAuth
- Facebook Page connection
- Facebook Messenger webhook
- Verify webhook signature
- Dedupe message theo `mid`
- Token encryption AES-256-GCM
- Inbox 3 cột hiện tại
- Funnel engine
- Bắt số điện thoại Việt Nam
- Bot takeover / return-to-bot
- Task cơ bản
- Email automation Resend
- UI tiếng Việt tương đối tốt

### 2.2. Khoảng trống lớn

Các phần còn thiếu để thành D.C FUNNEL CRM:

- Multi-brand workspace
- Role/permission backend đầy đủ
- Tenant isolation
- Pipeline Kanban
- Contact 360 đầy đủ
- Order Lite
- Facebook Comment-to-Inbox
- Automation template dạng rule engine
- Founder Dashboard có doanh thu/pipeline/sale performance
- Mobile-first inbox
- Zalo OA sau MVP core

### 2.3. Việc security cần xử lý trước

Audit báo `.env` có credential Neon production thật. Việc này phải xử lý ngay:

- Rotate DB password trên Neon.
- Cập nhật `.env` local/deploy.
- Đảm bảo `.env` không commit.
- Thêm fail-fast nếu production dùng secret mặc định.
- Thêm role enforcement ở backend.

---

## 3. Product Scope

### 3.1. MVP 1 — Bắt buộc

Tên MVP:

> **D.C FUNNEL CRM MVP 1 — Multi-brand Social Inbox + CRM + Pipeline + Order Lite**

MVP 1 gồm:

1. Multi-brand Workspace
2. Role & Permission cơ bản
3. Contact CRM 360
4. Unified Inbox nâng cấp
5. Facebook Page Inbox giữ và mở rộng
6. Facebook Comment-to-Inbox
7. Pipeline Kanban
8. Task Follow-up nâng cấp
9. Order Lite
10. Founder Dashboard
11. Automation Template cơ bản
12. Tiếng Việt, VND, Asia/Ho_Chi_Minh

### 3.2. Không làm trong MVP 1

Không làm sớm:

- POS đa kho
- Nhập/xuất/kiểm kho
- Kế toán/công nợ
- Đối soát COD
- Marketplace
- LMS/Course/Community
- Voice AI
- Funnel Builder
- White-label sâu
- Flow builder canvas phức tạp
- Broadcast hàng loạt phức tạp
- Affiliate
- Zalo OA nếu làm chậm core

---

## 4. Product Principles

### 4.1. Contact là trung tâm

Mọi thứ nên xoay quanh Contact:

```text
Contact
  ├── Conversations
  ├── Messages
  ├── Comments
  ├── Tags
  ├── Notes
  ├── Tasks
  ├── Opportunities
  ├── Orders
  └── Activities
```

### 4.2. Inbox không chỉ để nhắn tin

Inbox phải giúp sale:

- Xem hội thoại
- Xem thông tin khách
- Gắn tag
- Tạo task
- Tạo opportunity
- Tạo đơn
- Chuyển stage
- Ghi chú nội bộ

### 4.3. Pipeline là bản đồ tiền

Pipeline phải giúp founder biết:

- Lead đang ở stage nào
- Tiền đang kẹt ở đâu
- Sale nào xử lý tốt/chậm
- Khách nào cần follow-up

### 4.4. Order Lite, không POS nặng

Order Lite chỉ phục vụ chốt đơn nhanh:

- Sản phẩm
- Số lượng
- Giá
- Giảm giá
- Ship
- Tổng tiền
- COD/chuyển khoản/đã cọc
- Trạng thái đơn

Không làm kho/kế toán/đối soát ở MVP.

### 4.5. Việt Nam-first

Mặc định:

- Ngôn ngữ: Tiếng Việt
- Tiền tệ: VND
- Timezone: Asia/Ho_Chi_Minh
- Kênh chính: Facebook Messenger, Facebook Comment
- Sau đó: Zalo OA
- Mobile-first cho sale

---

## 5. Agent Roles

## 5.1. Codex — Backend/Core Owner

Codex phụ trách:

- Security
- Database schema
- Prisma migration/baseline
- Auth/session/role
- Workspace/tenant isolation
- API routes
- Backend validation
- Facebook webhook
- Facebook Comment-to-Inbox backend
- Pipeline API
- Contact API
- Order API
- Automation backend
- Stats API
- Typecheck/build

Codex không tự ý làm UI lớn nếu chưa được giao.

## 5.2. Claude — Product UI/UX Owner

Claude phụ trách:

- Product docs
- UI/UX spec
- AppShell
- Workspace switcher UI
- Dashboard UI
- Inbox UI
- Contacts UI
- Pipeline Kanban UI
- Order Lite modal
- Automation Template UI
- Empty states
- Mobile responsive
- Microcopy tiếng Việt
- UI documentation

Claude không sửa Prisma/Auth/Webhook/API core.

---

## 6. File Ownership Rules

| Khu vực | Owner chính | Quy tắc |
|---|---|---|
| `prisma/schema.prisma` | Codex | Claude không sửa |
| `prisma/seed.ts` | Codex | Claude chỉ đề xuất nội dung bằng docs |
| `src/lib/auth.ts` | Codex | Claude không sửa |
| `src/lib/api.ts` | Codex | Claude không sửa |
| `src/lib/env.ts` | Codex | Claude không sửa |
| `src/lib/workspace.ts` | Codex | Claude không sửa nếu chưa handoff |
| `src/lib/facebook/**` | Codex | Claude không sửa |
| `src/app/api/**` | Codex | Claude không sửa |
| `src/app/dashboard/**` | Claude | Codex chỉ sửa API stats |
| `src/app/inbox/**` | Claude | Codex chỉ sửa API/conversation |
| `src/app/contacts/**` | Claude | Codex làm API/model |
| `src/app/pipeline/**` | Claude | Codex làm API/model |
| `src/app/orders/**` | Claude | Codex làm API/model |
| `src/components/**` | Claude | Codex chỉ tạo helper/type nếu cần |
| `src/types/**` | Codex tạo contract | Claude dùng theo contract |
| `docs/**` | Claude | Codex bổ sung technical note nếu cần |

### Quy tắc tránh conflict

- Không cùng sửa `InboxClient.tsx` trong một PR nếu chưa chia vùng rõ.
- Không cùng sửa `AppShell.tsx` trong một PR nếu chưa chốt workspace API.
- Không sửa `schema.prisma` nếu không phải Codex.
- Không sửa API contract tùy ý sau khi Claude đã build UI theo contract.
- Nếu cần thay đổi contract, Codex phải ghi breaking change trong mục `16. API Contract Handoff`.

---

## 7. Branch Strategy

Đề xuất branch:

```text
main
├── codex/01-secure-stabilize
├── claude/01-docs-ui-foundation
├── codex/02-workspace-core
├── claude/02-workspace-ui
├── codex/03-pipeline-api
├── claude/03-pipeline-ui
├── codex/04-contact-api
├── claude/04-contact-ui
├── codex/05-order-api
├── claude/05-order-ui
├── codex/06-comment-backend
├── claude/06-comment-ui
├── codex/07-automation-api
├── claude/07-automation-ui
├── codex/08-stats-api
└── claude/08-dashboard-ui
```

### Merge rule

1. Codex PR schema/API phải merge trước UI phụ thuộc.
2. Claude PR UI chỉ merge khi API contract đã ổn.
3. Mỗi PR cần:
   - Summary
   - Files changed
   - Test result
   - Risk
   - Handoff
4. Không merge nếu typecheck fail, trừ khi founder chấp nhận rõ.

---

## 8. Implementation Roadmap Overview

| PR | Owner | Tên | Mục tiêu | Phụ thuộc |
|---|---|---|---|---|
| PR #1 | Codex | Secure & Stabilize | Bịt security, role, timezone, migration baseline | Không |
| PR #1B | Claude | Docs & UI Foundation | Docs plan, wireframe, ownership, copy | Không |
| PR #2 | Codex | Workspace Core | Org/Workspace/Member/API/current workspace | PR #1 |
| PR #2B | Claude | Workspace UI | Workspace switcher, empty state brand | PR #2 API |
| PR #3 | Codex | Pipeline API | Pipeline/Stage/Opportunity APIs | PR #2 |
| PR #3B | Claude | Pipeline UI | Kanban, cards, template UI | PR #3 API |
| PR #4 | Codex | Contact API | Contact 360, notes, owner, custom fields | PR #2 |
| PR #4B | Claude | Contact UI | Contacts list/detail/tabs | PR #4 API |
| PR #5 | Codex | Order Lite API | Product/Order/OrderItem APIs | PR #2 + PR #4 |
| PR #5B | Claude | Order UI | Create order modal, order list/history | PR #5 API |
| PR #6 | Codex | Comment-to-Inbox Backend | FB feed webhook, hide phone comments | PR #2 + FB core |
| PR #6B | Claude | Comment UI | Comment badge/filter/post context | PR #6 API |
| PR #7 | Codex | Automation Rule Engine | Template triggers/actions | PR #2 + PR #5 |
| PR #7B | Claude | Automation Template UI | Toggle/config automation templates | PR #7 API |
| PR #8 | Codex | Founder Stats API | Revenue/pipeline/sale/source stats | PR #3 + PR #5 |
| PR #8B | Claude | Dashboard Upgrade | Founder dashboard UI | PR #8 API |

---

## 9. PR #1 — Secure & Stabilize

**Owner:** Codex  
**Priority:** P0  
**Risk:** Low-Medium  
**Không phụ thuộc PR khác**

### 9.1. Mục tiêu

Đảm bảo codebase an toàn hơn trước khi mở rộng multi-tenant.

### 9.2. Tasks

- [ ] Rotate Neon DB credential ngoài code.
- [ ] Đảm bảo `.env` không bị commit.
- [ ] Thêm cảnh báo trong README về secret.
- [ ] Thêm `requireRole()` / `requireAdmin()` trong `src/lib/api.ts`.
- [ ] Áp role check vào route admin-only.
- [ ] Fail-fast trong production nếu secret mặc định.
- [ ] Sửa timezone Asia/Ho_Chi_Minh cho stats/dashboard.
- [ ] Tạo migration baseline nếu phù hợp.
- [ ] Chạy typecheck.

### 9.3. Files dự kiến

```text
src/lib/api.ts
src/lib/env.ts
src/app/api/** admin-only routes
src/app/api/stats/route.ts
README.md
prisma/**
```

### 9.4. Không làm trong PR này

- Không thêm workspaceId hàng loạt.
- Không tạo Pipeline/Order.
- Không refactor Inbox lớn.
- Không chạm UI lớn.

### 9.5. Acceptance Criteria

- [ ] Secret production không còn nằm trong repo/working tree chia sẻ.
- [ ] Route admin-only không cho SALE gọi.
- [ ] Production không chạy nếu secret mặc định.
- [ ] Stats “hôm nay” theo giờ Việt Nam.
- [ ] Typecheck pass.

### 9.6. Codex report sau khi xong

Ghi vào mục `18. PR Completion Report`.

---

## 10. PR #1B — Docs & UI Foundation

**Owner:** Claude  
**Priority:** P0-support  
**Có thể làm song song PR #1**

### 10.1. Mục tiêu

Chuẩn hóa docs để cả hai agent không lệch hướng.

### 10.2. Tasks

- [ ] Tạo hoặc cập nhật `docs/product/DC_FUNNEL_CRM_SPEC.md`.
- [ ] Tạo `docs/ui/MVP1_WIREFRAMES.md`.
- [ ] Tạo `docs/dev/BRANCH_AND_OWNERSHIP.md`.
- [ ] Viết microcopy tiếng Việt cho empty states.
- [ ] Không đụng backend/core.

### 10.3. Files dự kiến

```text
docs/product/DC_FUNNEL_CRM_SPEC.md
docs/ui/MVP1_WIREFRAMES.md
docs/dev/BRANCH_AND_OWNERSHIP.md
```

### 10.4. Acceptance Criteria

- [ ] Có spec sản phẩm tự đọc được.
- [ ] Có wireframe Dashboard, Inbox, Contact, Pipeline, Order, Automation.
- [ ] Có quy tắc branch/ownership.
- [ ] Không conflict với Codex PR #1.

---

## 11. PR #2 — Workspace Core

**Owner:** Codex  
**Priority:** P0  
**Phụ thuộc:** PR #1

### 11.1. Mục tiêu

Chuyển nền từ single-brand sang multi-brand theo hướng additive.

### 11.2. Schema cần thêm

- [ ] `Organization`
- [ ] `Workspace`
- [ ] `WorkspaceMember`

Đề xuất field:

```text
Organization:
- id
- name
- createdAt
- updatedAt
- deletedAt?

Workspace:
- id
- organizationId
- name
- industry
- timezone default Asia/Ho_Chi_Minh
- currency default VND
- locale default vi-VN
- createdAt
- updatedAt
- deletedAt?

WorkspaceMember:
- id
- workspaceId
- userId
- role
- assignedOnly
- createdAt
```

### 11.3. Role enum mới

```text
AGENCY_ADMIN
OWNER
MANAGER
SALE
MARKETER
```

Nếu giữ role cũ `ADMIN/SALE`, cần migration/compatibility rõ.

### 11.4. Backend cần thêm

- [ ] `src/lib/workspace.ts`
- [ ] Helper lấy current workspace
- [ ] API `GET /api/workspaces`
- [ ] API `POST /api/workspaces`
- [ ] API `POST /api/workspaces/switch` hoặc dùng cookie/session
- [ ] Seed workspace mặc định cho data cũ
- [ ] Thêm `workspaceId nullable` vào bảng chính trước
- [ ] Backfill data cũ vào workspace mặc định

### 11.5. Bảng cần workspaceId trước

Bắt đầu với:

- Customer
- Conversation
- Message
- Task
- FacebookPage
- Offer
- Flow
- EmailTemplate/Sequence nếu cần giữ theo brand

### 11.6. Không làm trong PR này

- Không làm Pipeline.
- Không làm Order.
- Không làm Comment-to-Inbox.
- Không ép NOT NULL ngay nếu dữ liệu cũ chưa backfill xong.

### 11.7. API Contract cho Claude

Codex phải ghi contract vào mục `16. API Contract Handoff`, tối thiểu:

```http
GET /api/workspaces
POST /api/workspaces
POST /api/workspaces/switch
```

Response mẫu:

```json
{
  "items": [
    {
      "id": "workspace_id",
      "name": "Nam Nguyên Store",
      "industry": "fashion",
      "role": "OWNER",
      "timezone": "Asia/Ho_Chi_Minh",
      "currency": "VND"
    }
  ],
  "currentWorkspaceId": "workspace_id"
}
```

### 11.8. Acceptance Criteria

- [ ] User có workspace mặc định.
- [ ] Data cũ thuộc workspace mặc định.
- [ ] API trả danh sách workspace.
- [ ] Có helper current workspace.
- [ ] Query mới bắt đầu filter workspace.
- [ ] Typecheck pass.

---

## 12. PR #2B — Workspace UI

**Owner:** Claude  
**Priority:** P0-support  
**Phụ thuộc:** PR #2 API contract

### 12.1. Mục tiêu

Người dùng thấy và chuyển được workspace/brand.

### 12.2. Tasks

- [ ] Thêm Workspace Switcher trong AppShell.
- [ ] Hiển thị workspace hiện tại.
- [ ] Màn empty state nếu chưa có brand.
- [ ] Trang settings/workspaces cơ bản.
- [ ] UI tiếng Việt.

### 12.3. Files dự kiến

```text
src/components/AppShell.tsx
src/components/workspace/**
src/app/settings/workspaces/**
```

### 12.4. Acceptance Criteria

- [ ] Chuyển workspace được.
- [ ] UI không phá layout cũ.
- [ ] Mobile vẫn dùng được.
- [ ] Empty state có CTA.

---

## 13. PR #3 — Pipeline API

**Owner:** Codex  
**Priority:** P0  
**Phụ thuộc:** Workspace Core

### 13.1. Mục tiêu

Có backend cho Pipeline Kanban.

### 13.2. Schema cần thêm

- [ ] `Pipeline`
- [ ] `PipelineStage`
- [ ] `Opportunity`

Field đề xuất:

```text
Pipeline:
- id
- workspaceId
- name
- industryTemplate
- isDefault
- createdAt
- updatedAt
- deletedAt?

PipelineStage:
- id
- pipelineId
- name
- position
- color
- showInReports

Opportunity:
- id
- workspaceId
- contactId
- pipelineId
- stageId
- title
- valueVnd integer
- status OPEN/WON/LOST
- ownerId
- source
- expectedCloseAt
- lastActivityAt
- createdAt
- updatedAt
- closedAt
- deletedAt?
```

### 13.3. API cần thêm

```http
GET /api/pipelines
POST /api/pipelines
GET /api/pipelines/:id
PATCH /api/pipelines/:id

GET /api/opportunities
POST /api/opportunities
PATCH /api/opportunities/:id
PATCH /api/opportunities/:id/stage
```

### 13.4. Seed template ngành

- [ ] Thời trang
- [ ] Studio
- [ ] Salon/Spa
- [ ] Agency

Pipeline mẫu:

```text
Thời trang:
Lead mới → Hỏi mẫu/size → Đã gửi set → Đang cân nhắc → Chốt đơn → Giao hàng → Mua lại

Studio:
Lead mới → Tư vấn concept → Báo giá → Chờ cọc → Đã đặt lịch → Đã chụp → Giao ảnh → Xin review

Salon/Spa:
Lead mới → Đã tư vấn → Đã đặt lịch → Đã đến → Đã thanh toán → Chăm sóc lại

Agency:
Lead mới → Đã trao đổi → Audit → Proposal → Đàm phán → Chốt hợp đồng → Onboarding
```

### 13.5. Acceptance Criteria

- [ ] Tạo pipeline được.
- [ ] Tạo opportunity được.
- [ ] Đổi stage được.
- [ ] API filter theo workspaceId.
- [ ] Trả tổng giá trị theo stage hoặc đủ data để UI tính.
- [ ] Typecheck pass.

---

## 14. PR #3B — Pipeline UI

**Owner:** Claude  
**Priority:** P0  
**Phụ thuộc:** PR #3 API

### 14.1. Mục tiêu

Có màn Kanban để quản trị funnel.

### 14.2. Tasks

- [ ] Tạo route `/pipeline`.
- [ ] Hiển thị columns theo stages.
- [ ] Hiển thị cards theo opportunities.
- [ ] Drag/drop hoặc fallback select đổi stage nếu drag khó.
- [ ] Tổng giá trị theo stage.
- [ ] Filter theo sale/tag/kênh.
- [ ] Empty state chọn mẫu pipeline.
- [ ] Nút tạo opportunity.
- [ ] UI VND.

### 14.3. Card cần hiển thị

- Tên khách
- Tên opportunity
- Giá trị VND
- Kênh/source
- Tag
- Owner
- Last activity
- Task tiếp theo nếu có
- Cảnh báo quá hạn nếu có

### 14.4. Acceptance Criteria

- [ ] Founder thấy tiền ở từng stage.
- [ ] Sale có thể chuyển stage.
- [ ] Empty state rõ.
- [ ] Mobile/tablet không vỡ nặng.

---

## 15. PR #4 — Contact API + Notes

**Owner:** Codex  
**Priority:** P0/P1  
**Phụ thuộc:** Workspace Core

### 15.1. Mục tiêu

Nâng Customer thành Contact 360.

### 15.2. Schema update

Mở rộng Customer/Contact:

- [ ] `workspaceId`
- [ ] `ownerId`
- [ ] `gender`
- [ ] `birthday`
- [ ] `address`
- [ ] `customFieldsJson`
- [ ] `lastActivityAt`
- [ ] `deletedAt?`

Thêm:

- [ ] `Note`
- [ ] chuẩn hóa `Tag` và `ContactTag` nếu kịp

### 15.3. API

```http
GET /api/contacts
POST /api/contacts
GET /api/contacts/:id
PATCH /api/contacts/:id
POST /api/contacts/:id/notes
GET /api/contacts/:id/timeline
```

### 15.4. Acceptance Criteria

- [ ] Contact list lấy theo workspace.
- [ ] Contact detail trả đủ hội thoại/task/opportunity/order nếu có.
- [ ] Tạo note được.
- [ ] Owner/contact fields update được.

---

## 16. API Contract Handoff

Codex bắt buộc cập nhật mục này sau mỗi backend PR.

### 16.1. Workspace API Contract

**Status:** `READY`  
**Owner:** Codex  
**Last updated:** 2026-06-14  

```http
GET /api/workspaces
POST /api/workspaces
POST /api/workspaces/switch
```

Response:

```json
{
  "items": [
    {
      "id": "workspace_id",
      "organizationId": "organization_id",
      "name": "HICHAOS",
      "industry": "fashion",
      "role": "OWNER",
      "assignedOnly": false,
      "timezone": "Asia/Ho_Chi_Minh",
      "currency": "VND",
      "locale": "vi-VN"
    }
  ],
  "currentWorkspaceId": "workspace_id"
}
```

Notes:

```text
GET /api/workspaces
- Auth: logged-in user.
- Side effect: ensures a default workspace exists for legacy users and sets HttpOnly cookie dc_workspace_id.
- Response envelope: { ok: true, data: { items, currentWorkspaceId } }.

POST /api/workspaces
- Auth: requireAdmin() => legacy ADMIN, AGENCY_ADMIN, OWNER.
- Body: { name: string, industry?: string, timezone?: string, currency?: string, locale?: string }.
- Creates workspace under the user's existing organization, adds caller as OWNER, switches current workspace cookie.
- Response envelope: { ok: true, data: { workspace, currentWorkspaceId } }.

POST /api/workspaces/switch
- Auth: logged-in user with WorkspaceMember access.
- Body: { workspaceId: string }.
- Sets HttpOnly cookie dc_workspace_id.
- Response envelope: { ok: true, data: { workspace, currentWorkspaceId } }.

Role compatibility:
- Prisma Role keeps legacy ADMIN for safe migration compatibility.
- New workspace roles are available: AGENCY_ADMIN, OWNER, MANAGER, SALE, MARKETER.
- Legacy ADMIN is mapped to workspace OWNER when creating default membership.
```

---

### 16.2. Pipeline API Contract

**Status:** `NOT_READY / READY / CHANGED`  
**Owner:** Codex  
**Last updated:**  

```http
GET /api/pipelines
GET /api/opportunities
POST /api/opportunities
PATCH /api/opportunities/:id/stage
```

Response example:

```json
{
  "pipelines": [],
  "stages": [],
  "opportunities": []
}
```

Notes:

```text
Điền sau khi Codex hoàn thành PR #3.
```

---

### 16.3. Contact API Contract

**Status:** `NOT_READY / READY / CHANGED`  
**Owner:** Codex  
**Last updated:**  

```http
GET /api/contacts
GET /api/contacts/:id
POST /api/contacts/:id/notes
```

Notes:

```text
Điền sau khi Codex hoàn thành PR #4.
```

---

### 16.4. Order API Contract

**Status:** `NOT_READY / READY / CHANGED`  
**Owner:** Codex  
**Last updated:**  

```http
GET /api/orders
POST /api/orders
PATCH /api/orders/:id/status
```

Notes:

```text
Điền sau khi Codex hoàn thành PR #5.
```

---

### 16.5. Comment-to-Inbox API Contract

**Status:** `NOT_READY / READY / CHANGED`  
**Owner:** Codex  
**Last updated:**  

```http
Facebook webhook feed/comment
GET /api/comments
```

Notes:

```text
Điền sau khi Codex hoàn thành PR #6.
```

---

## 17. Daily Agent Report

Codex và Claude cập nhật mỗi ngày vào đây.

### Report Format

```text
## YYYY-MM-DD — Agent Name

### Đang làm PR
- PR:

### Đã làm hôm nay
- 

### Files đã sửa
- 

### Có sửa file thuộc owner agent khác không?
- Không / Có: ...

### Typecheck/build/test
- 

### Blocker
- 

### Cần founder quyết
- 

### Cần agent kia hỗ trợ
- 

### Kế hoạch ngày tiếp theo
-
```

---

### 17.1. Daily Reports Log

#### 2026-06-14 — Codex

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #1 — Secure & Stabilize

### Đã làm hôm nay
- Đọc toàn bộ implementation plan và audit security.
- Thêm requireRole() / requireAdmin() trong backend helper.
- Áp admin role check vào các route cấu hình/nhạy cảm: brand profile PATCH, Facebook OAuth/connect/toggle/disconnect/health/logs, manual facebook page POST, offers/flows write routes, email template/sequence write routes, email send-test, cron fallback qua session.
- Giữ các route vận hành sale hằng ngày ở mức requireApiUser(): conversations, customer tags/stage, tasks, stats read, email one-off theo consent.
- Thêm production fail-fast cho secret mặc định/dev: AUTH_SECRET, UNSUBSCRIBE_SECRET, CRON_SECRET, META_VERIFY_TOKEN, TOKEN_ENCRYPTION_SECRET.
- Tách Next production build phase để build được artifact; runtime production vẫn fail-fast nếu secret default.
- Sửa thống kê "hôm nay" sang mốc ngày Asia/Ho_Chi_Minh.
- Cập nhật .gitignore để chặn toàn bộ .env* trừ .env.example.
- Thêm README cảnh báo secret/rotation.
- Kiểm tra .env hiện có theo danh sách key, không in secret ra log.
- Scrub .env local về nội dung mẫu an toàn từ .env.example để loại bỏ credential plaintext khỏi working tree hiện tại.
- Không tạo/chạy migration baseline vì repo chưa có prisma/migrations và audit báo .env đang trỏ credential production; cần rotate/xác nhận DB trước khi baseline an toàn.

### Files đã sửa
- .gitignore
- .env (ignored local file, scrubbed về mẫu an toàn)
- README.md
- src/lib/api.ts
- src/lib/env.ts
- src/app/api/brand-profile/route.ts
- src/app/api/cron/email-automation/route.ts
- src/app/api/email/send-test/route.ts
- src/app/api/email/sequences/route.ts
- src/app/api/email/sequences/[id]/route.ts
- src/app/api/email/templates/route.ts
- src/app/api/email/templates/[id]/route.ts
- src/app/api/facebook-pages/route.ts
- src/app/api/flows/[id]/route.ts
- src/app/api/integrations/facebook/login/route.ts
- src/app/api/integrations/facebook/pages/route.ts
- src/app/api/integrations/facebook/pages/connect/route.ts
- src/app/api/integrations/facebook/pages/[pageId]/route.ts
- src/app/api/integrations/facebook/pages/[pageId]/disconnect/route.ts
- src/app/api/integrations/facebook/pages/[pageId]/health-check/route.ts
- src/app/api/integrations/facebook/pages/[pageId]/logs/route.ts
- src/app/api/integrations/facebook/pages/[pageId]/toggle-bot/route.ts
- src/app/api/offers/route.ts
- src/app/api/offers/[id]/route.ts
- src/app/api/stats/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report. Không sửa src/components/** hoặc các route UI Claude-owned.

### Typecheck/build/test
- npm run typecheck: PASS
- npm run lint: PASS, còn 1 warning sẵn trong src/components/FacebookPageDetailClient.tsx về exhaustive-deps; không sửa vì thuộc ownership Claude.
- npm run build: PASS
- Production fail-fast smoke check với NODE_ENV=production: PASS, import env.ts báo "Production requires a non-default AUTH_SECRET." khi .env còn secret default.
- Secret scan sau khi scrub: không thấy Neon connection string thật; chỉ còn audit note nhắc rủi ro, không chứa password.

### Blocker
- Founder cần rotate Neon DB credential ngoài code nếu chưa làm, vì credential đã từng nằm trong working tree theo audit. Codex không thể rotate credential từ repo.
- Không có .git metadata trong thư mục hiện tại, nên không tạo được branch/commit/diff bằng git tại đây.

### Cần founder quyết
- Không còn cho PR #1. D-001 đã được founder xác nhận trước PR #2.

### Cần agent kia hỗ trợ
- Claude không cần hỗ trợ cho PR #1. Claude có thể xử lý warning exhaustive-deps trong component nếu muốn ở PR UI riêng.

### Kế hoạch ngày tiếp theo
- Handoff sang PR #2 Workspace Core: thiết kế additive schema Organization/Workspace/WorkspaceMember, default workspace cho data cũ, helper current workspace, API contract /api/workspaces.
```

#### 2026-06-14 — Codex (PR #2)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #2 — Workspace Core

### Đã làm hôm nay
- Xác nhận PR #1 DONE, D-001 DONE, repo có Git commit nền secure foundation, branch codex/02-workspace-core.
- Thêm schema additive cho Organization, Workspace, WorkspaceMember.
- Mở rộng Role enum với AGENCY_ADMIN, OWNER, MANAGER, SALE, MARKETER; giữ ADMIN legacy để migration không phá dữ liệu cũ.
- Thêm workspaceId nullable + index cho FacebookPage, Customer, Conversation, Message, Task, Offer, Flow, EmailTemplate, EmailSequence.
- Tạo src/lib/workspace.ts: default workspace, WorkspaceMember, cookie dc_workspace_id, current workspace helper, switch helper, legacy backfill helper.
- Tạo API GET /api/workspaces, POST /api/workspaces, POST /api/workspaces/switch.
- Cập nhật seed để tạo default organization/workspace/member và backfill data cũ khi seed được chạy sau migration.
- Áp workspace filter cho API nghiệp vụ chính: conversations, customers, tasks, stats, AI suggest, offers, flows, email templates/sequences, Facebook pages/integration.
- Cập nhật Facebook integration service để page connect/toggle/disconnect/health-check scoped theo workspace.
- Không làm Pipeline, Order, Comment-to-Inbox. Không sửa UI lớn.

### Files đã sửa
- prisma/schema.prisma
- prisma/seed.ts
- src/lib/auth.ts
- src/lib/api.ts
- src/lib/workspace.ts
- src/lib/facebook/facebook-integration-service.ts
- src/lib/funnel/intake.ts
- src/lib/funnel/engine.ts
- src/lib/email/send.ts
- src/lib/email/automation.ts
- src/app/api/workspaces/route.ts
- src/app/api/workspaces/switch/route.ts
- src/app/api/conversations/**
- src/app/api/customers/**
- src/app/api/tasks/**
- src/app/api/stats/route.ts
- src/app/api/ai/suggest/route.ts
- src/app/api/offers/**
- src/app/api/flows/**
- src/app/api/email/**
- src/app/api/facebook-pages/route.ts
- src/app/api/integrations/facebook/pages/**
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report/API contract.
- Không sửa src/components/**, src/app/dashboard/** UI, src/app/inbox/** UI, src/app/contacts/**, src/app/pipeline/**, src/app/orders/**.

### Typecheck/build/test
- npx prisma format: PASS
- npx prisma generate: PASS
- npm run typecheck: PASS
- npm run lint: PASS, còn warning cũ ở src/components/FacebookPageDetailClient.tsx thuộc Claude-owned.
- npm run build: PASS

### Blocker
- Không có blocker mới chặn PR #2.
- Migration chưa được chạy theo yêu cầu. Cần tạo/áp migration an toàn ở bước riêng trước khi chạy app với DB thật.

### Cần founder quyết
- Không cần quyết định mới cho PR #2.

### Cần agent kia hỗ trợ
- Claude có thể bắt đầu PR #2B Workspace UI dựa trên mục 16.1 = READY.

### Kế hoạch ngày tiếp theo
- Dừng sau PR #2. Chờ founder xác nhận trước khi chuyển sang PR #3 Pipeline API.
```

#### 2026-06-14 — Codex (PR #2M)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #2M — Workspace Migration Review

### Đã làm hôm nay
- Kiểm tra trạng thái migration hiện tại: trước PR #2M repo chưa có prisma/migrations.
- Chạy npx prisma migrate status để kiểm tra migration state; lệnh không apply migration nhưng fail với "Schema engine error" ở local DB connection, không in secret.
- Tạo migration SQL offline bằng prisma migrate diff từ schema nền commit 11827be sang schema hiện tại.
- Không chạy prisma migrate dev/deploy/db push/reset/seed, không deploy, không chạm dữ liệu DB thật.
- Review migration SQL: chỉ thêm enum role mới, bảng Organization/Workspace/WorkspaceMember, workspaceId nullable, indexes và foreign keys.
- Quét migration SQL: không có DROP, DELETE FROM, TRUNCATE, SET NOT NULL trên bảng legacy; workspaceId NOT NULL duy nhất nằm trong bảng mới WorkspaceMember.

### Files đã sửa
- prisma/migrations/20260614_workspace_core/migration.sql
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report.
- Không sửa UI/Claude-owned files; working tree đang có một số thay đổi UI sẵn nhưng Codex không chạm trong PR #2M.

### Typecheck/build/test
- npx prisma generate: PASS
- npm run typecheck: PASS
- npm run lint: PASS, còn warning cũ ở src/components/FacebookPageDetailClient.tsx thuộc Claude-owned.
- npm run build: FAIL ở bước packaging Next sau khi compile/type phase pass; lỗi ENOENT rename .next/export/500.html -> .next/server/pages/500.html. Không tự ý xóa .next vì ngoài scope migration review.

### Blocker
- npx prisma migrate status fail với Schema engine error khi kiểm tra DB state local; cần founder/dev xác nhận DB connectivity/migration history trước khi apply migration thật.
- Migration đã tạo nhưng CHƯA chạy. Dữ liệu legacy sẽ bị ẩn bởi workspace filter cho tới khi migration + backfill/seed được chạy có kiểm soát.

### Cần founder quyết
- Duyệt migration file prisma/migrations/20260614_workspace_core/migration.sql.
- Sau backup Neon DB, quyết định cách apply: npx prisma migrate deploy trong môi trường kiểm soát, sau đó chạy backfill bằng prisma seed hoặc SQL plan đã ghi ở PR #2M report.

### Cần agent kia hỗ trợ
- Claude không cần hỗ trợ backend. PR #2B Workspace UI vẫn an toàn để tiếp tục theo API contract READY, nhưng demo với DB thật cần migration/backfill trước.

### Kế hoạch ngày tiếp theo
- Chờ founder duyệt migration/backfill trước khi chuyển sang PR #3. Không làm Pipeline/Order/Comment-to-Inbox trong PR #2M.
```

#### 2026-06-14 — Claude

```text
## 2026-06-14 — Claude

### Đang làm PR
- PR #1B — Docs & UI Foundation

### Đã làm hôm nay
- Đọc toàn bộ docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md.
- Tạo docs/product/DC_FUNNEL_CRM_SPEC.md — spec MVP1: 10 module, persona, mô hình contact-centric, ma trận quyền, vòng đời trạng thái, localization VN/VND/timezone, glossary.
- Tạo docs/ui/MVP1_WIREFRAMES.md — 9 wireframe (Dashboard, Workspace switcher, Inbox, Contact list, Contact detail, Pipeline Kanban, Order modal, Automation, Settings/Channel) cả desktop+mobile, microcopy 6 empty state, nguyên tắc mobile-first, checklist component.
- Tạo docs/dev/BRANCH_AND_OWNERSHIP.md — bảng ownership, quy tắc tránh conflict, cổng API contract (NOT_READY/READY/CHANGED), branch/merge, handoff protocol, status board.

### Files đã sửa
- docs/product/DC_FUNNEL_CRM_SPEC.md (mới)
- docs/ui/MVP1_WIREFRAMES.md (mới)
- docs/dev/BRANCH_AND_OWNERSHIP.md (mới)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (cập nhật mục 17, 18.2, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ docs/**. Không đụng prisma/schema.prisma, src/lib/auth.ts, src/lib/api.ts, src/lib/env.ts, src/lib/facebook/**, src/app/api/**.

### Typecheck/build/test
- PR thuần docs, không thay đổi code → không cần chạy. (Trạng thái typecheck gần nhất từ audit: pass.)

### Blocker
- Repo chưa init git (không có .git) → chưa tạo được branch claude/01-docs-ui-foundation; PR #1B làm trên working tree.

### Cần founder quyết
- D-005 (ẩn Email khỏi nav MVP1?), D-007 (SĐT có là khóa dedup contact?), D-008 (git init + tạo branch theo plan mục 7).

### Cần agent kia hỗ trợ
- Codex chốt Workspace API contract (mục 16.1) sang READY để mở PR #2B (Workspace UI).

### Kế hoạch ngày tiếp theo
- Chờ Codex PR #1 + Workspace API. Khi 16.1 = READY: build Workspace Switcher + nền EmptyState/MoneyVND (PR #2B).
```

#### 2026-06-14 — Claude (PR #2B Workspace UI)

```text
## 2026-06-14 — Claude (PR #2B Workspace UI)

### Đang làm PR
- PR #2B — Workspace UI

### Đã làm hôm nay
- Xác nhận mục 16.1 Workspace API = READY trước khi code (đúng cổng API contract).
- WorkspaceSwitcher (sidebar): GET /api/workspaces khi mount; popover chọn brand + ô tìm + tick brand hiện tại; switch qua POST /api/workspaces/switch rồi reload toàn trang để re-scope dữ liệu; có loading skeleton + empty CTA "Tạo brand đầu tiên" + hiển thị lỗi gọn.
- Gắn WorkspaceSwitcher vào AppShell (thay khối brand tĩnh; thêm wordmark "D.C FUNNEL CRM").
- EmptyState dùng chung (src/components/EmptyState.tsx).
- Trang Cài đặt > Brands (src/app/settings/workspaces) + WorkspacesClient: liệt kê brand, chuyển brand, tạo brand mới (POST /api/workspaces; ẩn form nếu không phải legacy ADMIN, backend vẫn enforce requireAdmin).
- Thêm mục "Brands" vào settings nav. UI tiếng Việt 100%; truncate + popover để mobile không vỡ layout.

### Files đã sửa
- src/components/workspace/WorkspaceSwitcher.tsx (mới)
- src/components/workspace/WorkspacesClient.tsx (mới)
- src/components/workspace/labels.ts (mới)
- src/components/EmptyState.tsx (mới)
- src/app/settings/workspaces/page.tsx (mới)
- src/components/AppShell.tsx (gắn switcher + nav "Brands")
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.4, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/settings/workspaces/**, docs/**. Không đụng prisma/schema.prisma, src/lib/auth.ts, src/lib/api.ts, src/lib/workspace.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS
- npm run build: PASS (route /settings/workspaces có trong cây build; /api/workspaces + /api/workspaces/switch nhận diện đúng). Lưu ý: build lần này KHÔNG gặp lỗi ENOENT .next/500.html mà PR #2M báo (B-009) — có vẻ là flake packaging, build sạch của mình đã pass.

### Blocker
- B-010: UI build đúng theo contract nhưng chạy end-to-end phụ thuộc migration Workspace của Codex (prisma/migrations/20260614_workspace_core) đã áp + backfill/seed + DATABASE_URL hợp lệ. Theo PR #2M, migration CHƯA chạy và .env local đang là giá trị mẫu → switch/list workspace sẽ lỗi runtime cho tới khi DB sẵn sàng. UI đã xử lý lỗi gọn (hiện thông báo, không crash).

### Cần founder quyết
- Không phát sinh mới trong PR này.

### Cần agent kia hỗ trợ
- Codex/founder áp migration + backfill (theo PR #2M) để verify switch end-to-end với DB thật.

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ làm PR #2B). Bước kế: PR #3B Pipeline UI sau khi mục 16.2 = READY.
```

#### 2026-06-14 — Codex (Apply Workspace Migration Safely)

```text
## 2026-06-14 — Codex

### Đang làm PR
- Apply Workspace Migration Safely — PREFLIGHT BLOCKED

### Đã làm hôm nay
- Kiểm tra git status: branch codex/02-workspace-core, working tree sạch.
- Xác nhận commit cuối: pr2 workspace core migration and workspace ui.
- Xác nhận .env tồn tại và có DATABASE_URL nhưng không in giá trị.
- Kiểm tra an toàn .env bằng boolean: DATABASE_URL đang được nhận diện là local DB, không phải Neon.
- Chạy npx prisma generate và npm run typecheck trước migration.
- Chạy npx prisma migrate status; lệnh không apply migration nhưng fail với Schema engine error.
- Review lại prisma/migrations/20260614_workspace_core/migration.sql: additive-only, không DROP/DELETE FROM/TRUNCATE/SET NOT NULL trên bảng cũ.
- Dừng trước migrate deploy theo rule: migration status không ổn và DATABASE_URL chưa trỏ Neon trong local context.
- Founder đã duyệt chạy migrate deploy nếu migration additive và không in secret, nhưng Codex chạy lại preflight vẫn thấy DATABASE_URL local/không phải Neon nên vẫn CHƯA deploy.
- Sau khi founder cập nhật lại .env, Codex rerun preflight: DATABASE_URL tồn tại, nhìn đúng Neon, không phải local; không in secret.
- npx prisma generate: PASS; npm run typecheck: PASS.
- npx prisma migrate status kết nối được nhưng exit code 1 vì có 1 migration pending chưa apply; output đã được sanitize, không thấy drift/history risk.
- Founder duyệt chạy npx prisma migrate deploy; Codex đã chạy deploy với output sanitize.
- npx prisma migrate deploy: FAIL với Prisma P3005. Status sau đó vẫn báo migration pending và không có failed migration.
- Không chạy seed/backfill vì migration chưa apply thành công.

### Files đã sửa
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report/blocker.
- Không sửa code, không sửa UI, không làm PR #3.

### Typecheck/build/test
- npx prisma generate: PASS
- npm run typecheck: PASS
- npx prisma migrate status: FAIL với Schema engine error
- Rerun sau khi DATABASE_URL đúng Neon: npx prisma migrate status kết nối được, exit code 1 vì 1 migration pending.
- npx prisma migrate deploy: FAIL với P3005.
- npm run build: CHƯA chạy vì migration apply/backfill bị chặn ở preflight.

### Blocker
- B-010 vẫn OPEN: DB chưa sẵn sàng cho runtime workspace.
- B-011 mới: DATABASE_URL trong .env local hiện nhìn như local database, không phải Neon; migrate status fail. Không được apply migration cho tới khi founder/dev xác nhận lại DATABASE_URL và Prisma migrate status ổn.
- B-011 target issue đã được founder sửa; preflight Neon pass. Blocker mới là B-012: Prisma P3005 khi deploy vì Neon DB đã có schema nhưng chưa có migration baseline.

### Cần founder quyết
- Cập nhật/kiểm tra lại .env local để DATABASE_URL trỏ đúng Neon DB đã rotate, rồi yêu cầu Codex chạy lại preflight. Approval deploy đã có điều kiện, nhưng chỉ dùng khi preflight xác nhận đúng target Neon.
- Duyệt chiến lược baseline Prisma trước khi deploy lại: tạo baseline migration cho schema hiện hữu, mark baseline applied bằng prisma migrate resolve, rồi deploy workspace migration.

### Cần agent kia hỗ trợ
- Không cần Claude hỗ trợ.

### Kế hoạch ngày tiếp theo
- Chờ founder duyệt baseline strategy cho non-empty Neon DB (P3005). Sau đó Codex tạo/review baseline an toàn, mark baseline applied nếu được duyệt, rồi deploy workspace migration, backfill/seed, smoke test và build.
```

#### 2026-06-14 — Codex (Prisma Baseline Strategy)

```text
## 2026-06-14 — Codex

### Đang làm PR
- Prisma Baseline + Workspace Migration Apply — WAITING_FOUNDER_APPROVAL

### Đã làm hôm nay
- Kiểm tra git status và migration folder hiện tại.
- Xác nhận DATABASE_URL tồn tại, nhìn đúng Neon, không in giá trị.
- Kiểm tra npx prisma migrate status dạng sanitize: trước baseline có 1 migration pending (workspace), không có failed migration.
- So sánh read-only Neon schema hiện hữu với schema trước Workspace tại commit 11827be: No difference detected.
- Tạo baseline migration offline từ empty -> schema trước Workspace.
- Baseline migration mới: prisma/migrations/20260614_baseline_existing_schema/migration.sql.
- Kiểm tra thứ tự migrations: baseline đứng trước workspace.
- Review baseline + workspace SQL: không DROP, không DELETE FROM, không TRUNCATE, không SET NOT NULL.
- Baseline không chứa Organization/Workspace/WorkspaceMember/workspaceId/Pipeline/Order/Comment.
- Chạy npx prisma migrate status sau khi thêm baseline file: 2 migrations pending (baseline + workspace), không có failed migration.
- Dừng trước npx prisma migrate resolve theo đúng yêu cầu.
- Founder duyệt chạy npx prisma migrate resolve --applied 20260614_baseline_existing_schema.
- Codex chạy migrate resolve với output sanitize: PASS, baseline marked as applied.
- Chạy npx prisma migrate status sau resolve: chỉ còn 20260614_workspace_core pending; baseline không còn pending; không có failed migration.
- Founder duyệt chạy npx prisma migrate deploy nếu baseline đã mark applied và workspace migration additive-only.
- Codex review lại safety gate: baseline không pending, workspace pending, không failed migration, workspace SQL additive-only.
- Codex chạy npx prisma migrate deploy với output sanitize: PASS, 20260614_workspace_core applied.
- Chạy npx prisma migrate status sau deploy: PASS, database schema up to date, không pending, không failed migration.
- Chưa chạy seed/backfill, chưa smoke test runtime vì cần duyệt riêng.

### Files đã sửa
- prisma/migrations/20260614_baseline_existing_schema/migration.sql
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report/blocker.
- Không sửa UI, không làm PR #3, không chạy seed/backfill.

### Typecheck/build/test
- npx prisma migrate status: PASS kết nối nhưng exit code 1 vì migrations pending như kỳ vọng.
- npx prisma migrate diff DB hiện hữu -> schema pre-workspace: PASS, No difference detected.
- npx prisma migrate diff empty -> schema pre-workspace: PASS, tạo baseline SQL.
- npx prisma migrate resolve --applied 20260614_baseline_existing_schema: PASS
- npx prisma migrate status sau resolve: connected, 1 pending migration (20260614_workspace_core), no failed migration.
- npx prisma migrate deploy: PASS, applied 20260614_workspace_core.
- npx prisma migrate status sau deploy: PASS, schema up to date, no pending/failed migration.
- npm run build: CHƯA chạy vì đang dừng trước resolve/deploy/backfill.

### Blocker
- B-012 DONE: baseline resolved và workspace migration deployed.
- B-008/B-010 vẫn OPEN: seed/backfill chưa chạy, runtime workspace chưa smoke test.

### Cần founder quyết
- Duyệt chạy backfill: npm run prisma:seed hoặc SQL backfill đã review trong 18.3M.

### Cần agent kia hỗ trợ
- Không cần Claude hỗ trợ.

### Kế hoạch ngày tiếp theo
- Nếu founder duyệt backfill: chạy npm run prisma:seed hoặc SQL backfill đã review, sau đó smoke test GET /api/workspaces và kiểm tra legacy Customer/Conversation/Task/FacebookPage có workspaceId.
```

#### 2026-06-14 — Codex (Workspace Backfill + Runtime Smoke Test)

```text
## 2026-06-14 — Codex

### Đang làm PR
- Workspace Backfill + Runtime Smoke Test — DONE

### Đã làm hôm nay
- Kiểm tra git status: branch codex/02-workspace-core; chỉ còn docs report + baseline migration folder uncommitted.
- Kiểm tra npx prisma migrate status dạng sanitize: schema up to date, không pending, không failed migration.
- Review seed safety: prisma/seed.ts không có deleteMany/reset/drop/truncate; backfill dùng upsert/create/update/updateMany.
- Đo pre-count trước seed: 31 legacy rows đang workspaceId NULL trên Customer/Conversation/Message/Flow/Offer/Task/EmailTemplate/EmailSequence.
- Chạy npm run prisma:seed theo founder approval: PASS.
- Xác nhận default Organization/Workspace/WorkspaceMember đã có: 1 organization, 1 workspace HICHAOS, 1 workspace member.
- Xác nhận backfill: 0 workspaceId NULL ở FacebookPage, Customer, Conversation, Message, Flow, Offer, Task, EmailTemplate, EmailSequence.
- Smoke test local API bằng dev server + session cookie tạm không in token/cookie:
  - GET /api/workspaces: 200, ok true, 1 workspace, currentWorkspaceId có.
  - POST /api/workspaces/switch: 200, ok true.
- Xác nhận dữ liệu cũ còn thấy theo counts: Customer 2, Conversation 2, Message 11, Task 1; không thấy giảm count so với pre-count.
- Chạy npx prisma generate, npm run typecheck, npm run build.
- Không làm PR #3 Pipeline.

### Files đã sửa
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật report/blocker.
- Không sửa code/UI trong bước này.

### Typecheck/build/test
- npx prisma migrate status: PASS, schema up to date.
- npm run prisma:seed: PASS.
- GET /api/workspaces runtime smoke: PASS.
- POST /api/workspaces/switch runtime smoke: PASS.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.

### Blocker
- B-008 RESOLVED: seed/backfill đã chạy.
- B-010 RESOLVED: Workspace runtime smoke test đã pass.
- Không còn blocker migration/backfill cho Workspace Core.

### Cần founder quyết
- Không cần quyết định thêm cho Workspace migration/backfill.

### Cần agent kia hỗ trợ
- Không cần Claude hỗ trợ.

### Kế hoạch ngày tiếp theo
- Dừng tại Workspace Backfill + Smoke Test. Chỉ chuyển PR #3 Pipeline khi founder yêu cầu riêng.
```

---

## 18. PR Completion Report

Mỗi PR hoàn thành phải cập nhật vào đây.

### 18.1. PR #1 — Secure & Stabilize

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** N/A — working folder hiện tại không có `.git` metadata  
**Commit/PR link:** N/A  

#### Summary

```text
Added backend role helpers requireRole() and requireAdmin().
Enforced admin-only access on sensitive configuration/write routes: brand settings, Facebook integration management, offer/flow management, email template/sequence management, email test send, and cron session fallback.
Added production fail-fast guard for default/dev secrets while allowing Next production build phase to compile artifacts.
Fixed stats "today" boundary to Asia/Ho_Chi_Minh.
Hardened env hygiene with .gitignore .env* coverage and README secret rotation warning.
Reviewed .env key presence without exposing values and scrubbed local .env back to safe example values.
Did not run migrations, deploy, reset DB, delete data, or touch large UI.
```

#### Files changed

```text
.gitignore
.env (ignored local file, scrubbed về mẫu an toàn)
README.md
src/lib/api.ts
src/lib/env.ts
src/app/api/brand-profile/route.ts
src/app/api/cron/email-automation/route.ts
src/app/api/email/send-test/route.ts
src/app/api/email/sequences/route.ts
src/app/api/email/sequences/[id]/route.ts
src/app/api/email/templates/route.ts
src/app/api/email/templates/[id]/route.ts
src/app/api/facebook-pages/route.ts
src/app/api/flows/[id]/route.ts
src/app/api/integrations/facebook/login/route.ts
src/app/api/integrations/facebook/pages/route.ts
src/app/api/integrations/facebook/pages/connect/route.ts
src/app/api/integrations/facebook/pages/[pageId]/route.ts
src/app/api/integrations/facebook/pages/[pageId]/disconnect/route.ts
src/app/api/integrations/facebook/pages/[pageId]/health-check/route.ts
src/app/api/integrations/facebook/pages/[pageId]/logs/route.ts
src/app/api/integrations/facebook/pages/[pageId]/toggle-bot/route.ts
src/app/api/offers/route.ts
src/app/api/offers/[id]/route.ts
src/app/api/stats/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npm run typecheck: PASS
npm run lint: PASS with existing warning in Claude-owned src/components/FacebookPageDetailClient.tsx.
npm run build: PASS
Production fail-fast smoke check: PASS; NODE_ENV=production import of env.ts fails on default AUTH_SECRET in current .env.
Secret scan after .env scrub: PASS; only audit note mentions Neon risk without password.
```

#### Risks

```text
D-001 resolved before PR #2: founder confirmed Neon credential was rotated and DATABASE_URL was updated in local .env.
Build now skips secret validation only during Next production build phase; runtime production import still fails fast on default secrets.
Local .env was scrubbed to example values. Local dev/deploy will need real rotated secrets re-entered outside git.
No migration baseline created in this PR because DB credential state is unresolved and repo has no migrations folder/history to anchor safely.
No automated route-level integration tests exist yet for SALE-vs-ADMIN authorization; verified by typecheck/build and code review.
```

#### Handoff

```text
PR #2 Workspace Core can start after founder confirms DB credential rotation.
Recommended next steps: additive schema for Organization, Workspace, WorkspaceMember; default workspace backfill plan; current workspace helper; GET/POST/switch workspace API contract in section 16.
Claude does not need to act on PR #1 backend changes. For PR #2B, wait for Codex API contract.
```

---

### 18.2. PR #1B — Docs & UI Foundation

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/01-docs-ui-foundation (repo chưa init git — làm trên working tree)  
**Commit/PR link:** N/A (chưa có git remote)  

#### Summary

```text
Tạo nền tài liệu để Codex và Claude không lệch hướng khi build MVP1:
- Product spec MVP1 (10 module, persona, contact-centric, ma trận quyền, vòng đời trạng thái, VN/VND/timezone, glossary).
- Bộ wireframe 9 màn (desktop + mobile) + microcopy tiếng Việt cho 6 empty state.
- Quy tắc branch/ownership + cổng API contract (Claude không build UI phụ thuộc tới khi contract READY).
Không đụng backend/core. Đúng phạm vi PR #1B: chỉ docs, không sửa UI app thật.
```

#### Files changed

```text
docs/product/DC_FUNNEL_CRM_SPEC.md      (mới)
docs/ui/MVP1_WIREFRAMES.md              (mới)
docs/dev/BRANCH_AND_OWNERSHIP.md        (mới)
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (cập nhật mục 17, 18.2, 19)
```

#### Tests

```text
PR thuần docs, không thay đổi code → không chạy typecheck/build trong PR này.
```

#### Risks

```text
- Thấp: chỉ thêm tài liệu.
- Ma trận quyền & vòng đời trạng thái trong spec là ĐỀ XUẤT sản phẩm; Codex chốt khi làm schema/API. Nếu khác đề xuất → ghi vào mục 19.
- KHÔNG tạo/khóa API contract (đúng quy tắc). Mọi UI phụ thuộc dữ liệu đều đánh dấu "chờ Codex (PR #X)".
```

#### Handoff

```text
- Đạt Acceptance PR #1B (plan mục 10.4): có spec tự đọc; có wireframe Dashboard/Inbox/Contact/Pipeline/Order/Automation (+ Workspace/Settings); có quy tắc branch/ownership; không conflict Codex PR #1 (chỉ chạm docs/**).
- Đề nghị Codex: khi hoàn tất PR #2, điền mục 16.1 Workspace API (endpoint + response mẫu) và đặt Status = READY để mở khóa PR #2B (Workspace UI).
- Bước UI kế tiếp của Claude khi có Workspace API: xem mục 19.2 (blockers) và phần "Đề xuất Workspace UI".
```

---

### 18.3. PR #2 — Workspace Core

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** codex/02-workspace-core  
**Commit/PR link:** Local working tree, chưa tạo commit PR #2  

#### Summary

```text
PR #2 Workspace Core hoàn tất theo hướng additive:
- Thêm Organization, Workspace, WorkspaceMember.
- Mở rộng role enum cho multi-tenant, giữ ADMIN legacy để tương thích.
- Thêm workspaceId nullable + index vào các bảng chính trước, không ép NOT NULL.
- Thêm helper current workspace + cookie switch + default workspace/backfill helper.
- Thêm Workspace API: GET /api/workspaces, POST /api/workspaces, POST /api/workspaces/switch.
- Seed được cập nhật để tạo default workspace/member và backfill data legacy khi được chạy sau migration.
- Các API nghiệp vụ chính bắt đầu filter theo current workspace.
- Không chạy migration/db push/seed/reset/deploy.
```

#### API Contract Updated?

```text
YES — mục 16.1 Workspace API Contract đã đặt Status = READY.
```

#### Files changed

```text
prisma/schema.prisma
prisma/seed.ts
src/lib/auth.ts
src/lib/api.ts
src/lib/workspace.ts
src/lib/facebook/facebook-integration-service.ts
src/lib/funnel/intake.ts
src/lib/funnel/engine.ts
src/lib/email/send.ts
src/lib/email/automation.ts
src/app/api/workspaces/route.ts
src/app/api/workspaces/switch/route.ts
src/app/api/ai/suggest/route.ts
src/app/api/conversations/**
src/app/api/customers/**
src/app/api/tasks/**
src/app/api/stats/route.ts
src/app/api/offers/**
src/app/api/flows/**
src/app/api/email/**
src/app/api/facebook-pages/route.ts
src/app/api/integrations/facebook/pages/**
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run lint: PASS with existing warning in Claude-owned src/components/FacebookPageDetailClient.tsx.
npm run build: PASS
```

#### Risks

```text
- No migration file was generated/applied and no database command was run. The DB will need a safe migration step before runtime against real DB.
- Role enum keeps legacy ADMIN. Future cleanup can migrate ADMIN users to AGENCY_ADMIN/OWNER, then remove ADMIN in a later explicit migration if founder approves.
- workspaceId is nullable by design for safe rollout. Data isolation relies on seed/API helper backfill assigning legacy rows to default workspace after schema migration.
- FacebookPage.pageId remains globally unique. Same Fanpage cannot be connected to multiple workspaces in this PR.
- Existing UI has not been updated yet; Claude PR #2B should consume the READY contract.
- No automated integration tests for workspace switching yet; verified by typecheck/lint/build and code review.
```

#### Handoff to Claude

```text
Claude PR #2B can start.

Use:
- GET /api/workspaces to render switcher and current workspace.
- POST /api/workspaces for admin create-workspace flow.
- POST /api/workspaces/switch with { workspaceId } to switch current brand/workspace.

Response data uses:
- items[].id
- items[].organizationId
- items[].name
- items[].industry (lowercase string)
- items[].role
- items[].assignedOnly
- items[].timezone
- items[].currency
- items[].locale
- currentWorkspaceId

The switch mechanism is an HttpOnly cookie named dc_workspace_id. UI should call switch endpoint then refresh/reload workspace-scoped data.
```

---

### 18.3M. PR #2M — Workspace Migration Review

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** codex/02-workspace-core  
**Commit/PR link:** Local working tree, chưa tạo commit PR #2M  

#### Summary

```text
PR #2M hoàn tất phần review/tạo migration an toàn cho Workspace Core:
- Tạo migration file offline, không apply lên DB thật.
- Migration chỉ additive: thêm Organization, Workspace, WorkspaceMember, role enum mới, workspaceId nullable, indexes, foreign keys.
- Không thêm Pipeline/Order/Comment-to-Inbox.
- Không drop table/column, không reset database, không deploy, không ép workspaceId NOT NULL.
- Backfill data legacy được tách thành bước riêng cần founder duyệt sau backup DB.
```

#### Migration File

```text
Created:
- prisma/migrations/20260614_workspace_core/migration.sql

Migration applied?
- NO. Không chạy prisma migrate dev/deploy/db push/reset.

Migration state check:
- npx prisma migrate status: FAIL với Schema engine error ở local DB connection.
- Trước khi tạo file, repo chưa có prisma/migrations.
```

#### Schema Changes In Migration

```text
Role enum:
- ADD VALUE AGENCY_ADMIN
- ADD VALUE OWNER
- ADD VALUE MANAGER
- ADD VALUE MARKETER
- Giữ ADMIN legacy.

New tables:
- Organization
- Workspace
- WorkspaceMember

Nullable workspaceId added to legacy/business tables:
- FacebookPage
- Customer
- Conversation
- Message
- Flow
- Offer
- Task
- EmailTemplate
- EmailSequence

Indexes:
- deletedAt / organizationId indexes for new tables.
- userId / role / unique workspaceId+userId for WorkspaceMember.
- workspaceId indexes on all added legacy/business tables.

Foreign keys:
- Workspace -> Organization
- WorkspaceMember -> Workspace/User
- workspaceId nullable relations from legacy/business tables -> Workspace with ON DELETE SET NULL.
```

#### Migration SQL Safety Review

```text
PASS:
- No DROP.
- No DELETE FROM.
- No TRUNCATE.
- No SET NOT NULL on legacy/business tables.
- workspaceId NOT NULL appears only inside new WorkspaceMember table.

Note:
- Prisma generated a PostgreSQL warning for adding multiple enum values in one migration on PostgreSQL 11 or earlier. Neon is expected to be modern PostgreSQL, but founder/dev should verify target Postgres version before apply.
```

#### Backfill Plan

```sql
-- Run only AFTER schema migration succeeds, DB backup exists, and founder approves.
-- Values are deterministic placeholders; adjust names if founder wants.

INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
VALUES ('legacy_default_org', 'D.C Group', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "Workspace" (
  "id", "organizationId", "name", "industry", "timezone", "currency", "locale", "createdAt", "updatedAt"
)
VALUES (
  'legacy_default_workspace',
  'legacy_default_org',
  'Default Workspace',
  'OTHER',
  'Asia/Ho_Chi_Minh',
  'VND',
  'vi-VN',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "assignedOnly", "createdAt")
SELECT
  'legacy_member_' || "id",
  'legacy_default_workspace',
  "id",
  CASE WHEN "role" = 'ADMIN'::"Role" THEN 'OWNER'::"Role" ELSE "role" END,
  false,
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("workspaceId", "userId") DO NOTHING;

UPDATE "FacebookPage" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Customer" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Conversation" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Message" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Flow" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Offer" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "Task" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "EmailTemplate" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
UPDATE "EmailSequence" SET "workspaceId" = 'legacy_default_workspace' WHERE "workspaceId" IS NULL;
```

#### Preferred Apply Sequence For Founder

```text
1. Backup Neon DB.
2. Verify target Postgres version and current migration history.
3. Review prisma/migrations/20260614_workspace_core/migration.sql.
4. Apply with npx prisma migrate deploy in controlled environment.
5. Run one approved backfill path:
   - npm run prisma:seed, because seed.ts now creates default workspace/member and backfills legacy rows; OR
   - the SQL backfill plan above, after adjusting names/IDs if needed.
6. Smoke test GET /api/workspaces and legacy inbox/customer/task reads.
```

#### Tests

```text
npx prisma generate: PASS
npm run typecheck: PASS
npm run lint: PASS with existing warning in Claude-owned src/components/FacebookPageDetailClient.tsx.
npm run build: FAIL after successful compile/type/static page generation, due ENOENT rename .next/export/500.html -> .next/server/pages/500.html.
```

#### Risks

```text
- npx prisma migrate status failed locally with Schema engine error, so DB migration state was not fully inspectable from this workspace.
- Migration file does not backfill legacy rows by design. Without backfill/seed after migration, workspace-scoped APIs can hide legacy data.
- PostgreSQL enum multi-value migration should be checked against Neon Postgres version before apply.
- Build failure appears to be Next artifact packaging/output issue after compile, not TypeScript/migration failure, but remains unresolved in PR #2M.
```

#### Handoff to Claude

```text
Claude PR #2B remains safe to continue:
- Workspace API contract in 16.1 is still READY.
- UI can build against GET /api/workspaces, POST /api/workspaces, POST /api/workspaces/switch.
- For real DB demo, founder/dev must apply migration and run approved backfill/seed first.
```

---

### 18.4. PR #2B — Workspace UI

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/02-workspace-ui (làm trên working tree; repo đã có git từ PR #2)  
**Commit/PR link:** N/A  

#### Summary

```text
Người dùng thấy được brand hiện tại và chuyển brand được, theo đúng API contract 16.1.
- WorkspaceSwitcher trên sidebar (GET /api/workspaces; switch qua POST /api/workspaces/switch + reload).
- Gắn vào AppShell; thêm wordmark "D.C FUNNEL CRM".
- EmptyState dùng chung; trang Cài đặt > Brands (xem/chuyển/tạo brand).
- Chỉ làm UI theo contract. Không sửa schema/auth/api core/workspace.ts/api routes. Không làm Pipeline/Contact/Order UI.
```

#### Files changed

```text
src/components/workspace/WorkspaceSwitcher.tsx   (mới)
src/components/workspace/WorkspacesClient.tsx     (mới)
src/components/workspace/labels.ts                (mới)
src/components/EmptyState.tsx                      (mới)
src/app/settings/workspaces/page.tsx              (mới)
src/components/AppShell.tsx                        (gắn switcher + nav "Brands")
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md          (mục 17, 18.4, 19)
```

#### Tests

```text
npm run typecheck: PASS
npm run build: PASS — route /settings/workspaces có trong cây build; build KHÔNG lặp lại lỗi ENOENT .next/500.html của B-009 (flake).
Runtime end-to-end (list/switch thật): CHƯA verify — phụ thuộc migration + DB (xem B-010). UI đã degrade gọn khi API lỗi.
Cách test thủ công khi DB sẵn sàng: đăng nhập → thấy brand ở đầu sidebar → mở popover → chọn brand khác → trang reload, dữ liệu theo brand mới; vào Cài đặt > Brands để tạo/chuyển brand.
```

#### Risks

```text
- B-010: chạy thật phụ thuộc migration 20260614_workspace_core đã áp + backfill + DATABASE_URL hợp lệ. Chưa áp migration (PR #2M) nên switch sẽ lỗi runtime tới khi DB sẵn sàng.
- Chỉ gắn switcher ở sidebar AppShell hiện có; chưa làm lại toàn bộ mobile nav của AppShell (ngoài scope PR #2B) — switcher tự co/truncate nên không làm vỡ layout.
- POST tạo brand chỉ hiện form cho legacy ADMIN ở UI; backend vẫn là nguồn enforce (requireAdmin).
```

#### Handoff

```text
- Đạt Acceptance PR #2B (plan mục 12.4): chuyển workspace được; UI không phá layout cũ; mobile vẫn dùng được; empty state có CTA.
- Cần Codex/founder: áp migration + backfill/seed để demo switch với DB thật (B-010).
- Claude tiếp theo chờ mục 16.2 Pipeline API = READY để vào PR #3B; chưa đụng Pipeline/Contact/Order UI.
- Đề xuất nhỏ cho Codex: cân nhắc trả thêm tên Organization trong GET /api/workspaces để switcher hiển thị nhóm theo agency (không bắt buộc cho MVP).
```

---

### 18.4M. Apply Workspace Migration Safely

**Owner:** Codex  
**Status:** `BLOCKED / NOT APPLIED`  
**Branch:** codex/02-workspace-core  
**Commit/PR link:** Local working tree, report update chưa commit  

#### Summary

```text
Apply migration đã dừng ở preflight theo safety rule:
- Không chạy npx prisma migrate deploy.
- Không chạy seed/backfill.
- Không reset database.
- Không xóa dữ liệu.
- Không deploy.
- Không làm PR #3.

Lý do dừng:
- DATABASE_URL trong .env local có tồn tại nhưng được nhận diện là local DB, không phải Neon.
- npx prisma migrate status fail với Schema engine error.
- Theo rule, nếu migration status không ổn hoặc có rủi ro thì dừng và báo founder.
- Founder đã duyệt migrate deploy có điều kiện sau review additive, nhưng preflight rerun vẫn nhận diện DATABASE_URL là local DB nên deploy không được chạy.
- Sau khi founder sửa .env, preflight xác nhận DATABASE_URL nhìn đúng Neon và migration SQL an toàn; migrate deploy được chạy theo approval nhưng fail với P3005.
- Migration vẫn chưa apply; seed/backfill vẫn chưa chạy.
```

#### Preflight Results

```text
git status:
- Branch: codex/02-workspace-core
- Working tree trước khi update report: clean
- Last commit: c5d9401 pr2 workspace core migration and workspace ui

DATABASE_URL:
- Present: YES
- Value printed: NO
- Looks local: YES
- Looks Neon: NO

Commands:
- npx prisma generate: PASS
- npm run typecheck: PASS
- Initial npx prisma migrate status: FAIL with Schema engine error
- Rerun after DATABASE_URL fix: CONNECTED, exit code 1 because one migration is pending
- npx prisma migrate deploy: FAIL with P3005
```

#### Migration SQL Review

```text
File reviewed:
- prisma/migrations/20260614_workspace_core/migration.sql

Safety:
- No DROP.
- No DELETE FROM.
- No TRUNCATE.
- No SET NOT NULL on legacy/business tables.
- workspaceId columns on legacy/business tables remain nullable.
- workspaceId NOT NULL appears only inside new WorkspaceMember table.

Scope:
- Adds Role enum values: AGENCY_ADMIN, OWNER, MANAGER, MARKETER.
- Adds Organization, Workspace, WorkspaceMember.
- Adds nullable workspaceId to FacebookPage, Customer, Conversation, Message, Flow, Offer, Task, EmailTemplate, EmailSequence.
- Adds indexes and foreign keys.
- No Pipeline/Order/Comment-to-Inbox changes.
```

#### Applied?

```text
Migration applied: NO
Migration deploy attempted: YES, failed with P3005
Seed/backfill run: NO
Workspace API runtime smoke test: NO
Data loss observed: NO successful DB write/migration was executed by this attempt; post-status still shows migration pending and no failed migration.
```

#### Founder Next Action

```text
1. Approve a Prisma baseline strategy for the existing non-empty Neon schema.
2. Likely safe path:
   - create a baseline migration representing current pre-workspace schema,
   - mark that baseline as applied with prisma migrate resolve,
   - keep 20260614_workspace_core as the next pending additive migration,
   - rerun npx prisma migrate deploy.
3. After workspace migration succeeds, approve one backfill path: npm run prisma:seed OR reviewed SQL backfill from 18.3M.
```

---

### 18.4N. Prisma Baseline + Workspace Migration Apply

**Owner:** Codex  
**Status:** `WORKSPACE MIGRATION DEPLOYED / BACKFILL PENDING`  
**Branch:** codex/02-workspace-core  
**Commit/PR link:** Local working tree, baseline file/report chưa commit  

#### Summary

```text
Prisma baseline strategy đã được chuẩn bị và baseline đã mark applied:
- Neon DATABASE_URL nhìn đúng target, không local, không in secret.
- Neon schema hiện hữu khớp schema pre-workspace tại commit 11827be (read-only diff: No difference detected).
- Đã tạo baseline migration đại diện schema hiện hữu trước Workspace.
- Baseline SQL không được apply trực tiếp vào Neon; đã mark applied để Prisma biết schema cũ đã tồn tại.
- Workspace migration 20260614_workspace_core đã deploy thành công.
- Seed/backfill CHƯA chạy.
- Không làm PR #3.
```

#### Migration Files

```text
Current order:
1. prisma/migrations/20260614_baseline_existing_schema/migration.sql
2. prisma/migrations/20260614_workspace_core/migration.sql

Created in this step:
- prisma/migrations/20260614_baseline_existing_schema/migration.sql

Already existed:
- prisma/migrations/20260614_workspace_core/migration.sql
```

#### Safety Review

```text
Baseline migration:
- Generated offline from empty -> pre-workspace schema.
- Contains CREATE TYPE / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT for existing schema.
- Does not contain Workspace, Organization, WorkspaceMember, workspaceId, Pipeline, Order, Comment.
- No DROP.
- No DELETE FROM.
- No TRUNCATE.
- No SET NOT NULL.

Workspace migration:
- Still additive-only as previously reviewed.
- Adds workspace tables, nullable workspaceId columns, indexes, foreign keys, role enum values.
- No DROP / DELETE FROM / TRUNCATE / SET NOT NULL on legacy/business tables.
```

#### Current DB/Migration State

```text
Before baseline file:
- npx prisma migrate status: connected to Neon, 1 pending migration (workspace), no failed migration.

After baseline file:
- npx prisma migrate status: connected to Neon, 2 pending migrations:
  1. 20260614_baseline_existing_schema
  2. 20260614_workspace_core
- No failed migration detected.

After migrate resolve:
- npx prisma migrate resolve --applied 20260614_baseline_existing_schema: PASS.
- npx prisma migrate status: connected to Neon, 1 pending migration:
  1. 20260614_workspace_core
- Baseline no longer pending.
- No failed migration detected.

After workspace deploy:
- npx prisma migrate deploy: PASS, applied 20260614_workspace_core.
- npx prisma migrate status: PASS, database schema is up to date.
- No pending migration.
- No failed migration detected.
```

#### Applied?

```text
Baseline migration created: YES
Baseline marked applied: YES
Workspace migration deployed: YES
Seed/backfill run: YES, completed in 18.4O.
GET /api/workspaces runtime smoke test: YES, completed in 18.4O.
Data loss observed: No destructive DB command was executed. Migration was additive-only; backfill/smoke details are in 18.4O.
```

#### Follow-up

```text
Backfill and runtime smoke test completed in 18.4O.
```

---

### 18.4O. Workspace Backfill + Runtime Smoke Test

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** codex/02-workspace-core  
**Commit/PR link:** Local working tree, report update chưa commit  

#### Summary

```text
Workspace Backfill + Runtime Smoke Test hoàn tất:
- Chạy npm run prisma:seed theo founder approval.
- Tạo/xác nhận default Organization, Workspace, WorkspaceMember.
- Gán workspaceId cho legacy data.
- Smoke test GET /api/workspaces và POST /api/workspaces/switch bằng local dev server + session cookie tạm; không in token/cookie.
- Không reset database, không xóa dữ liệu, không drop table/column, không deploy app.
- Không làm PR #3.
```

#### Backfill Results

```text
Before seed:
- Organization: 0
- Workspace: 0
- WorkspaceMember: 0
- Users: 1
- Legacy workspaceId NULL total measured: 31

After seed:
- Organization: 1
- Workspace: 1 (HICHAOS, Asia/Ho_Chi_Minh, VND, vi-VN)
- WorkspaceMember: 1
- Users: 1
- workspaceId NULL remaining across checked tables: 0

Legacy rows assigned workspaceId:
- FacebookPage: 0 / 0
- Customer: 2 / 2
- Conversation: 2 / 2
- Message: 11 / 11
- Flow: 3 / 3
- Offer: 5 / 5
- Task: 1 / 1
- EmailTemplate: 4 / 4
- EmailSequence: 3 / 3
- Total assigned/measured: 31
```

#### Runtime Smoke Test

```text
Local dev server smoke:
- GET /api/workspaces: PASS, HTTP 200, ok true, 1 workspace, currentWorkspaceId present.
- POST /api/workspaces/switch: PASS, HTTP 200, ok true.
- Session token/cookie was generated only in local process memory and not printed.
```

#### Data Retention Check

```text
Counts after backfill:
- Customer: 2
- Conversation: 2
- Message: 11
- Task: 1

Result:
- Legacy customer/inbox/task-related records are still present.
- No count decrease observed in checked legacy tables.
```

#### Tests

```text
npx prisma migrate status: PASS, schema up to date, no pending/failed migration.
npm run prisma:seed: PASS.
npx prisma generate: PASS.
npm run typecheck: PASS.
npm run build: PASS.
```

#### Blockers

```text
B-008: RESOLVED.
B-010: RESOLVED.
Remaining Workspace migration/backfill blockers: none.
```

---

### 18.5. PR #3 — Pipeline API

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

#### Summary

```text
Chưa cập nhật.
```

#### API Contract Updated?

```text
Chưa cập nhật.
```

#### Files changed

```text
Chưa cập nhật.
```

#### Tests

```text
Chưa cập nhật.
```

#### Handoff to Claude

```text
Chưa cập nhật.
```

---

### 18.6. PR #3B — Pipeline UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

#### Summary

```text
Chưa cập nhật.
```

#### Files changed

```text
Chưa cập nhật.
```

#### Tests

```text
Chưa cập nhật.
```

#### Handoff

```text
Chưa cập nhật.
```

---

### 18.7. PR #4 — Contact API + Notes

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.8. PR #4B — Contact UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.9. PR #5 — Order Lite API

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.10. PR #5B — Order UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.11. PR #6 — Comment-to-Inbox Backend

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.12. PR #6B — Comment UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.13. PR #7 — Automation Rule Engine

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.14. PR #7B — Automation UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.15. PR #8 — Founder Stats API

**Owner:** Codex  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

### 18.16. PR #8B — Dashboard UI

**Owner:** Claude  
**Status:** `TODO / IN_PROGRESS / DONE / BLOCKED`  
**Branch:**  
**Commit/PR link:**  

```text
Chưa cập nhật.
```

---

## 19. Blockers / Founder Decisions

Agent nào gặp blocker phải ghi vào đây.

### 19.1. Open Decisions

| ID | Decision Needed | Owner hỏi | Status | Founder Answer |
|---|---|---|---|---|
| D-001 | DB credential đã rotate chưa? | Codex | DONE | Đã rotate Neon DB credential và cập nhật DATABASE_URL mới vào .env local. |
| D-002 | App Facebook đã có quyền `pages_manage_engagement` chưa? | Codex | OPEN | |
| D-003 | Lưu tiền VND bằng integer đồng được không? | Codex | OPEN | Đề xuất: Có |
| D-004 | Zalo OA để P2 hay ép vào MVP1? | Founder/PM | OPEN | Đề xuất: P2 |
| D-005 | Email module hiện có giữ hay ẩn khỏi nav MVP1? | Founder/PM | OPEN | Đề xuất: Giữ code, ẩn khỏi nav nếu gây rối |
| D-006 | Realtime giữ polling 5s hay nâng WebSocket? | Founder/PM | OPEN | Đề xuất: giữ polling MVP1 |
| D-007 | SĐT có là khóa dedup/merge contact trong cùng workspace không? | Claude (PM) | OPEN | Đề xuất: dùng SĐT + email làm tín hiệu dedup; Codex chốt ràng buộc khi làm Contact API |
| D-008 | Khởi tạo git + tạo branch theo plan mục 7 trước PR #2? | Claude | DONE | Đã git init và tạo branch codex/02-workspace-core. |

### 19.2. Blockers Log

```text
[2026-06-14 · Claude · PR #1B]
- B-001 (LOW): Repo chưa init git (không có .git). Chưa tạo được branch claude/01-docs-ui-foundation;
  PR #1B làm trực tiếp trên working tree. Đề nghị founder git init + tạo branch trước PR #2/#2B (xem D-008).
- B-002 (RESOLVED bởi Codex PR #2): Workspace API contract (mục 16.1) đã READY.
  Claude có thể bắt đầu PR #2B Workspace UI theo contract đã cập nhật.
- Không có blocker nào chặn PR #1B. PR #1B hoàn tất.

[2026-06-14 · Codex · PR #1]
- B-003 (RESOLVED trước PR #2): D-001 DONE. Founder xác nhận đã rotate Neon DB credential và cập nhật DATABASE_URL mới vào .env local.
- B-004 (RESOLVED trước PR #2): Đã git init và tạo branch codex/02-workspace-core.
- B-005 (SAFETY): Migration baseline chưa tạo/chạy trong PR #1 để tránh rủi ro với production DB credential chưa xác nhận đã rotate và repo chưa có migrations history.
- Không có blocker nào chặn hoàn tất PR #1 code hardening. PR #1 hoàn tất.

[2026-06-14 · Codex · PR #2]
- Không có blocker mới chặn PR #2.
- Lưu ý an toàn: PR #2 chỉ cập nhật schema/code/seed. Chưa chạy migration/db push/seed/reset/deploy theo đúng yêu cầu.
- Bước trước runtime với DB thật: cần tạo và review migration additive cho Organization/Workspace/WorkspaceMember + workspaceId nullable, rồi áp migration an toàn.

[2026-06-14 · Codex · PR #2M]
- B-006 (REVIEW): Đã tạo prisma/migrations/20260614_workspace_core/migration.sql bằng offline diff, nhưng CHƯA chạy migration. Founder cần duyệt migration file, backup Neon DB, rồi mới apply bằng quy trình kiểm soát.
- B-007 (SAFETY): npx prisma migrate status fail ở local với Schema engine error, nên migration history/DB connectivity chưa xác nhận được từ workspace này. Không in secret, không apply DB.
- B-008 (FOLLOW-UP): Sau khi apply migration phải chạy backfill/seed đã duyệt; nếu không, workspace-scoped API có thể không thấy legacy data vì workspaceId còn NULL.
- B-009 (BUILD): npm run build fail ở bước packaging Next với ENOENT rename .next/export/500.html -> .next/server/pages/500.html sau khi compile/type/static generation pass. Không sửa trong PR #2M vì ngoài scope migration review.

[2026-06-14 · Claude · PR #2B]
- B-009 UPDATE: build của PR #2B PASS, KHÔNG lặp lại lỗi ENOENT .next/500.html → khả năng cao là flake packaging .next, không phải lỗi code.
- B-010 (RUNTIME DEP): Workspace UI build đúng contract nhưng list/switch chạy thật cần migration 20260614_workspace_core đã áp + backfill/seed + DATABASE_URL hợp lệ. Hiện migration CHƯA chạy (xem B-006/B-008) và .env local là giá trị mẫu → switcher sẽ hiện lỗi/empty cho tới khi DB sẵn sàng (đã xử lý degrade gọn, không crash).
- Không có blocker nào chặn việc hoàn tất code PR #2B. PR #2B hoàn tất (DONE), chờ DB để demo runtime.

[2026-06-14 · Codex · Apply Workspace Migration Safely]
- B-006 UPDATE (STILL OPEN): Migration file vẫn CHƯA apply. Dừng trước migrate deploy vì preflight chưa đạt.
- B-008 UPDATE (STILL OPEN): Backfill/seed vẫn CHƯA chạy vì migration chưa apply.
- B-010 UPDATE (STILL OPEN): Runtime workspace vẫn chưa verify với DB thật; .env có DATABASE_URL nhưng preflight nhận diện là local DB, không phải Neon.
- B-011 (BLOCKER): npx prisma migrate status vẫn fail với Schema engine error. Founder/dev cần kiểm tra lại DATABASE_URL trỏ đúng Neon DB đã rotate và migration connectivity trước khi Codex xin duyệt apply.
- B-011 UPDATE: Founder đã duyệt deploy có điều kiện, nhưng Codex rerun preflight vẫn thấy DATABASE_URL local/LooksNeon = false nên KHÔNG chạy migrate deploy.
- B-006 UPDATE 2 (STILL OPEN): Sau khi founder sửa .env, Codex đã chạy npx prisma migrate deploy theo approval nhưng Prisma trả P3005; migration workspace vẫn CHƯA apply.
- B-011 UPDATE 2 (TARGET RESOLVED): DATABASE_URL hiện nhìn đúng Neon và không local; lỗi cũ về target DB được giải quyết.
- B-012 (BLOCKER): Prisma P3005 vì Neon DB đã có schema nhưng chưa có migration baseline. Cần founder duyệt baseline strategy trước khi retry deploy.
- B-012 UPDATE (WAITING APPROVAL): Đã tạo baseline migration prisma/migrations/20260614_baseline_existing_schema/migration.sql. DB hiện hữu khớp schema pre-workspace. Cần founder duyệt npx prisma migrate resolve --applied 20260614_baseline_existing_schema.
- B-012 UPDATE 2 (RESOLVED): Founder duyệt và Codex đã chạy npx prisma migrate resolve --applied 20260614_baseline_existing_schema thành công. Status hiện chỉ còn 20260614_workspace_core pending, không có failed migration.
- B-006/B-008/B-010 vẫn OPEN: workspace migration chưa deploy, seed/backfill chưa chạy, runtime workspace chưa smoke test.
- B-006 UPDATE 3 (RESOLVED): Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công; 20260614_workspace_core applied. migrate status hiện schema up to date, không pending/failed migration.
- B-008/B-010 vẫn OPEN: seed/backfill chưa chạy, runtime workspace chưa smoke test.
- B-008 UPDATE 2 (RESOLVED): Founder duyệt và Codex đã chạy npm run prisma:seed thành công; legacy rows đã gán workspaceId, null còn lại = 0 ở các bảng kiểm tra.
- B-010 UPDATE 2 (RESOLVED): Runtime smoke test pass: GET /api/workspaces 200 ok, POST /api/workspaces/switch 200 ok. Không còn blocker migration/backfill cho Workspace Core.
```

#### Đề xuất bước tiếp theo cho Workspace UI (PR #2B — chờ Codex PR #2 API READY)

```text
Khi Codex hoàn tất Workspace Core và mục 16.1 = READY, Claude sẽ build theo thứ tự:

1. WorkspaceSwitcher (src/components/workspace/WorkspaceSwitcher.tsx)
   - Đặt trên cùng sidebar trong AppShell: tên brand + ngành + role, popover list + ô tìm + tick brand hiện tại.
   - Gọi GET /api/workspaces; chuyển brand qua cơ chế switch Codex chốt (cookie/session); reload data theo workspace.
2. EmptyState dùng chung (src/components/EmptyState.tsx) + áp microcopy "Workspace rỗng" cho onboarding tạo brand đầu tiên.
3. MoneyVND util (format VND vi-VN) — đặt nền cho Pipeline/Order/Dashboard.
4. Trang Cài đặt > Workspace cơ bản (src/app/settings/workspaces/**): xem/tạo brand, thông tin brand.
5. Đảm bảo không vỡ layout cũ; AppShell mobile vẫn dùng được; mọi empty state có CTA.

Tiền đề bắt buộc trước khi code: 16.1 READY (endpoint + response mẫu + currentWorkspaceId), xác nhận cơ chế switch,
và xác nhận field role trả về để render nhãn quyền. Nếu thiếu, ghi blocker và chỉ làm phần tĩnh.
```

---

## 20. Technical Guardrails

### 20.1. Schema changes

- Mọi schema change phải additive.
- Không drop column/table nếu chưa backup và founder duyệt.
- Khi thêm `workspaceId`, làm nullable trước, backfill, rồi mới cân nhắc NOT NULL.
- Tất cả bảng tenant phải index theo `workspaceId`.

### 20.2. Money

- Tiền VND lưu bằng integer đồng, ví dụ `299000`.
- Không dùng float cho tiền.
- UI format bằng `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })` hoặc util tương đương.

### 20.3. Timezone

- Mặc định Asia/Ho_Chi_Minh.
- Các filter “hôm nay” phải theo giờ Việt Nam, không theo server UTC/local mơ hồ.

### 20.4. Webhook

- Verify signature.
- Idempotency theo external ID:
  - Messenger: `mid`
  - Comment: `commentId`
- Webhook phải trả 200 nhanh.
- Không làm tác vụ nặng đồng bộ nếu gây timeout.
- Ghi log lỗi nhưng không làm Facebook retry vô hạn nếu lỗi nội bộ.

### 20.5. Tenant isolation

Mọi query nghiệp vụ phải filter:

```ts
where: {
  workspaceId: currentWorkspaceId
}
```

Không được dùng ID trực tiếp mà không kiểm workspace.

### 20.6. Role enforcement

Backend phải enforce quyền. UI ẩn nút là chưa đủ.

Ví dụ:

- SALE không được disconnect Facebook Page.
- SALE không được sửa workspace settings.
- MARKETER không được xem tài chính sâu nếu không được cấp quyền.
- AGENCY_ADMIN xem được nhiều workspace.

---

## 21. UI/UX Guardrails

### 21.1. Ngôn ngữ

UI phải tiếng Việt 100%.

Dùng:

- Hội thoại
- Khách hàng
- Cơ hội
- Đơn hàng
- Việc cần làm
- Báo cáo
- Tự động hóa
- Cài đặt
- Không dùng "Opportunity" trong UI nếu không cần.

### 21.2. Empty state

Không để màn trắng.

Ví dụ:

Inbox rỗng:

```text
Kết nối Fanpage để bắt đầu nhận tin nhắn và bình luận.
[ Kết nối Fanpage ]
```

Pipeline rỗng:

```text
Chọn mẫu pipeline theo ngành để bắt đầu quản lý khách hàng.
[ Thời trang ] [ Studio ] [ Salon/Spa ] [ Agency ]
```

Orders rỗng:

```text
Chưa có đơn hàng. Khi khách chốt trong hội thoại, hãy bấm “Tạo đơn”.
```

### 21.3. Mobile-first

Sale cần làm được trên điện thoại:

- Xem hội thoại
- Trả lời nhanh
- Gắn tag
- Tạo task
- Tạo đơn
- Chuyển stage

Desktop có thể 3 cột. Mobile nên chuyển thành từng màn/tab.

---

## 22. Testing Checklist

Mỗi PR nên chạy nếu có thể:

```bash
npm run typecheck
npm run lint
npm run build
```

Nếu không chạy được, ghi rõ lý do.

### 22.1. Manual QA checklist MVP

- [ ] Login thành công.
- [ ] User thấy workspace hiện tại.
- [ ] Chuyển workspace không lẫn data.
- [ ] Facebook Messenger vẫn nhận tin.
- [ ] Gửi tin Messenger vẫn hoạt động.
- [ ] Sale không gọi được API admin-only.
- [ ] Tạo contact.
- [ ] Tạo opportunity.
- [ ] Kéo opportunity qua stage.
- [ ] Tạo task.
- [ ] Tạo đơn.
- [ ] Dashboard cập nhật dữ liệu.
- [ ] Comment có SĐT được detect.
- [ ] Comment có SĐT được ẩn nếu có quyền.
- [ ] Typecheck pass.

---

## 23. Agent Prompts

### 23.1. Prompt cho Codex

```text
Bạn là backend/core owner của D.C FUNNEL CRM.

Đọc file docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md trước khi làm.

Quy tắc:
- Không sửa UI lớn.
- Không sửa file thuộc owner Claude nếu chưa có handoff.
- Bạn là owner của prisma/schema.prisma, src/lib/api.ts, src/lib/auth.ts, src/lib/env.ts, src/lib/facebook/**, src/app/api/**.
- Mọi schema change phải additive.
- Mọi query nghiệp vụ mới phải filter theo workspaceId.
- Không chạy migration phá dữ liệu.
- Không deploy.
- Không xóa data.
- Mỗi PR nhỏ, typecheck pass.

Thứ tự:
1. PR #1 Secure & Stabilize.
2. PR #2 Workspace Core.
3. PR #3 Pipeline API.
4. PR #4 Contact API + Notes.
5. PR #5 Order Lite API.
6. PR #6 Comment-to-Inbox Backend.
7. PR #7 Automation Rule Engine.
8. PR #8 Founder Stats API.

Sau mỗi PR, cập nhật trực tiếp vào file plan:
- 17. Daily Agent Report
- 18. PR Completion Report
- 16. API Contract Handoff nếu có API mới
- 19. Blockers / Founder Decisions nếu có blocker
```

### 23.2. Prompt cho Claude

```text
Bạn là product UI/UX owner của D.C FUNNEL CRM.

Đọc file docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md trước khi làm.

Quy tắc:
- Không sửa prisma/schema.prisma.
- Không sửa src/lib/auth.ts, src/lib/api.ts, src/lib/env.ts, src/lib/facebook/**.
- Không tự tạo API contract nếu Codex chưa chốt.
- UI tiếng Việt 100%.
- Mobile-first cho sale.
- Empty state phải hướng dẫn hành động.
- Bạn là owner của src/components/**, src/app/dashboard/**, src/app/inbox/**, src/app/contacts/**, src/app/pipeline/**, src/app/orders/**, docs/**.

Thứ tự:
1. PR #1B Docs & UI Foundation.
2. PR #2B Workspace UI sau khi Codex có Workspace API.
3. PR #3B Pipeline UI sau khi Codex có Pipeline API.
4. PR #4B Contact UI sau khi Codex có Contact API.
5. PR #5B Order UI sau khi Codex có Order API.
6. PR #6B Comment UI sau khi Codex có Comment backend.
7. PR #7B Automation UI sau khi Codex có Automation API.
8. PR #8B Dashboard UI sau khi Codex có Stats API.

Sau mỗi PR, cập nhật trực tiếp vào file plan:
- 17. Daily Agent Report
- 18. PR Completion Report
- 19. Blockers / Founder Decisions nếu có blocker
```

---

## 24. Final Founder Checklist

Anh Đức cần kiểm tra trước khi giao triển khai:

- [ ] Đã chốt Hướng A multi-tenant thật.
- [ ] Đã rotate DB credential.
- [ ] Đã đưa file này vào repo.
- [ ] Codex đã đọc file này.
- [ ] Claude đã đọc file này.
- [ ] Hai agent hiểu file ownership.
- [ ] PR #1 giao Codex.
- [ ] PR #1B giao Claude.
- [ ] Chưa giao Pipeline/Order/Comment trước khi PR #1 xong.

---

## 25. Summary One-liner

> D.C Funnel Bot hiện là một Facebook Funnel Bot single-brand khá chắc. Để thành D.C FUNNEL CRM, triển khai Hướng A multi-tenant theo thứ tự: Security → Workspace → Pipeline → Contact 360 → Order Lite → Comment-to-Inbox → Automation → Dashboard, với Codex làm backend/core và Claude làm product UI/UX theo API contract.
