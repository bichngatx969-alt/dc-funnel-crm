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

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

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

GET /api/pipelines response:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "pipeline_id",
        "workspaceId": "workspace_id",
        "name": "Pipeline thời trang",
        "industryTemplate": "FASHION",
        "isDefault": true,
        "stages": [
          {
            "id": "stage_id",
            "pipelineId": "pipeline_id",
            "name": "Lead mới",
            "position": 0,
            "color": "#60a5fa",
            "showInReports": true
          }
        ],
        "_count": { "opportunities": 0 }
      }
    ],
    "templates": [
      {
        "key": "FASHION",
        "label": "Thời trang",
        "pipelineName": "Pipeline thời trang",
        "stages": []
      }
    ]
  }
}
```

Opportunity response shape:

```json
{
  "ok": true,
  "data": {
    "opportunity": {
      "id": "opportunity_id",
      "workspaceId": "workspace_id",
      "customerId": "customer_id",
      "pipelineId": "pipeline_id",
      "stageId": "stage_id",
      "title": "Cơ hội mới",
      "valueVnd": 299000,
      "status": "OPEN",
      "ownerId": "user_id",
      "source": "facebook",
      "expectedCloseAt": null,
      "lastActivityAt": "2026-06-14T00:00:00.000Z",
      "closedAt": null,
      "deletedAt": null
    }
  }
}
```

Notes:

```text
Auth:
- GET /api/pipelines: require logged-in user.
- POST/PATCH /api/pipelines: requireAdmin() => ADMIN, AGENCY_ADMIN, OWNER.
- Opportunity endpoints: require logged-in user.

Tenant isolation:
- Every query filters currentWorkspaceId from dc_workspace_id/session.
- Customer, pipeline, stage, owner are validated against current workspace before writes.
- Users cannot read/write pipeline or opportunity from another workspace.

Pipeline templates:
- FASHION: Lead mới → Hỏi mẫu/size → Đã gửi set → Đang cân nhắc → Chốt đơn → Giao hàng → Mua lại
- STUDIO: Lead mới → Tư vấn concept → Báo giá → Chờ cọc → Đã đặt lịch → Đã chụp → Giao ảnh → Xin review
- SALON: Lead mới → Đã tư vấn → Đã đặt lịch → Đã đến → Đã thanh toán → Chăm sóc lại
- AGENCY: Lead mới → Đã trao đổi → Audit → Proposal → Đàm phán → Chốt hợp đồng → Onboarding

Behavior:
- GET /api/pipelines creates a default pipeline if workspace has none, unless ensureDefault=false.
- POST /api/pipelines accepts { name?, template?, industryTemplate?, isDefault?, stages? }.
- POST /api/opportunities accepts { customerId, pipelineId?, stageId?, title?, valueVnd?, ownerId?, source?, expectedCloseAt? }.
- valueVnd is integer VND; API rounds and clamps to >= 0.
- PATCH /api/opportunities/:id/stage accepts { stageId, status? } and updates lastActivityAt.

Runtime note:
- Migration 20260614_workspace_core_01_pipeline_api đã deploy thành công.
- Runtime smoke test PASS: GET /api/pipelines, ensure default pipeline, POST /api/opportunities, PATCH /api/opportunities/:id/stage.
- DB hiện up to date, không pending/failed migration sau PR #3.
```

---

### 16.3. Contact API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

```http
GET /api/contacts
POST /api/contacts
GET /api/contacts/:id
PATCH /api/contacts/:id
POST /api/contacts/:id/notes
GET /api/contacts/:id/timeline
```

Notes:

```text
Entity:
- Dùng model Customer hiện tại làm Contact entity để tránh rename/migration lớn.
- Thêm field additive nullable: ownerId, gender, birthday, address, customFieldsJson, lastActivityAt, deletedAt.
- Thêm Note model cho ghi chú nội bộ theo workspace/contact.
- Tag vẫn giữ Customer.tags String[] trong PR #4; chuẩn hóa Tag/ContactTag để lại debt vì thay đổi lan sang funnel/email/stats.

Auth:
- Tất cả endpoint require logged-in user.
- Tất cả query/write filter currentWorkspaceId hoặc validate entity thuộc current workspace.

GET /api/contacts query:
- q/search: tìm theo name, phone, email, psid.
- tag: filter Customer.tags has tag.
- stage: COLD/WARM/HOT/CUSTOMER/LOST.
- ownerId: user id hoặc "unassigned".
- page/pageSize hoặc limit: pagination cơ bản, pageSize max 100.

GET /api/contacts response:
- { ok, data: { items, pagination } }
- Contact list item gồm thông tin cơ bản, owner, facebookPage, _count conversations/tasks/opportunities/notes.

POST /api/contacts body:
- { name?, phone?, email?, ownerId?, gender?, birthday?, address?, customFieldsJson?, tags?, currentStage?, leadScore?, source?, pageId? }
- Cần ít nhất name, phone hoặc email.
- Nếu không có psid, API tạo psid dạng manual:<uuid> để giữ unique(pageId, psid) hiện hữu.

GET /api/contacts/:id:
- Trả Contact 360: thông tin khách, owner, facebookPage, conversations + messages gần nhất, tasks, opportunities, notes.

PATCH /api/contacts/:id:
- Update các field Contact 360; hỗ trợ soft-delete qua { deleted: true }.
- Owner và pageId được validate trong currentWorkspaceId.

POST /api/contacts/:id/notes:
- Body { body } hoặc { text } hoặc { note }.
- Tạo note nội bộ, authorId = current user, update Customer.lastActivityAt.

GET /api/contacts/:id/timeline:
- Trả timeline gộp note.created, conversation.activity, task.activity, opportunity.activity.
- Query limit max 100.

Runtime note:
- Migration 20260614_workspace_core_02_contact_api đã deploy thành công.
- Runtime smoke test PASS: GET/POST/PATCH Contacts, POST Note, GET Timeline.
- DB hiện up to date, không pending/failed migration sau PR #4.
```

---

### 16.4. Order API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

```http
GET /api/orders
POST /api/orders
GET /api/orders/:id
PATCH /api/orders/:id
PATCH /api/orders/:id/status

GET /api/products
POST /api/products
```

Notes:

```text
Auth:
- Tất cả endpoint require logged-in user.
- Tất cả query/write filter currentWorkspaceId hoặc validate entity thuộc current workspace.

Entity:
- ProductLite: sản phẩm nhẹ cho tạo đơn nhanh, không làm tồn kho.
- Order: đơn hàng nhẹ gắn customerId, optional opportunityId, optional ownerId.
- OrderItem: snapshot dòng hàng tại thời điểm tạo đơn.

GET /api/products:
- Query: q/search, active=true/false, page/pageSize hoặc limit.
- Response: { ok, data: { items, pagination } }.

POST /api/products body:
- { name, sku?, priceVnd?, description?, isActive? }.
- priceVnd là integer VND, API round/clamp >= 0.

GET /api/orders:
- Query: q/search, customerId, opportunityId, ownerId, status, paymentStatus, page/pageSize.
- Response: { ok, data: { items, pagination } }.

POST /api/orders body:
- { customerId, opportunityId?, ownerId?, code?, status?, paymentStatus?, paymentMethod?, items, discountVnd?, shippingFeeVnd?, depositVnd?, note?, shippingName?, shippingPhone?, shippingAddress? }.
- items: [{ productId?, name?, sku?, quantity, unitPriceVnd?, discountVnd? }].
- customerId phải thuộc currentWorkspaceId.
- opportunityId nếu truyền phải thuộc currentWorkspaceId và cùng customerId.
- ownerId nếu truyền phải là WorkspaceMember trong currentWorkspaceId.

Money:
- Không dùng float.
- lineTotalVnd = max(0, quantity * unitPriceVnd - item.discountVnd).
- subtotalVnd = sum(lineTotalVnd).
- totalVnd = max(0, subtotalVnd - order.discountVnd + shippingFeeVnd).
- depositVnd lưu riêng, không trừ khỏi totalVnd trong PR #5.

PATCH /api/orders/:id:
- Update metadata, shipping, status/payment, discount/shipping/deposit.
- PR #5 không hỗ trợ cập nhật items sau khi tạo đơn để tránh xóa cứng OrderItem; UI cần tạo đơn mới hoặc chờ item-level API ở PR sau nếu cần sửa dòng hàng.
- Soft-delete qua { deleted: true }.

PATCH /api/orders/:id/status:
- Body { status, paymentStatus?, paymentMethod? }.
- Cập nhật confirmedAt/completedAt/cancelledAt theo status.

Side effects:
- Khi tạo/cập nhật/order status, cập nhật Customer.lastActivityAt.
- Nếu order có opportunityId, cập nhật Opportunity.lastActivityAt.
- Không tự đổi opportunity WON/stage trong PR #5 để tránh side effect phức tạp.

Runtime note:
- Migration 20260614_workspace_core_03_order_lite_api đã deploy thành công bằng npx prisma migrate deploy.
- npx prisma migrate status sau deploy: schema up to date, không pending/failed migration.
- Runtime smoke test PASS: GET/POST products, GET/POST/PATCH orders, PATCH order status; totalVnd integer đúng, ProductLite/Order thuộc currentWorkspaceId, Order gắn customerId đúng workspace, opportunityId cùng workspace/customer, Customer.lastActivityAt được cập nhật.
```

---

### 16.5. Comment-to-Inbox API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

```http
Facebook webhook feed/comment via POST /api/webhook/facebook
GET /api/comments
GET /api/comments/:id
PATCH /api/comments/:id
POST /api/comments/:id/reply
POST /api/comments/:id/hide
```

Notes:

```text
Auth:
- Tất cả API /api/comments require logged-in user.
- Mọi query/write filter currentWorkspaceId.
- Không đọc/sửa comment workspace khác.

Webhook:
- POST /api/webhook/facebook giữ nguyên xử lý Messenger entry.messaging.
- PR #6 thêm xử lý entry.changes field feed/comments cho item=comment.
- Handler dedupe bằng (workspaceId, pageId, externalCommentId).
- Nếu comment mới:
  - tạo/cập nhật FacebookPost theo externalPostId.
  - tạo Customer tối thiểu theo pageId + fromId nếu chưa có.
  - tạo/reuse Conversation trong current workspace/page/customer.
  - tạo Message INBOUND với metaMessageId = fb_comment:{externalCommentId} để comment đi vào inbox.
  - cập nhật Customer.lastInteractionAt và Customer.lastActivityAt.
- Nếu message có SĐT Việt Nam, set hasPhone=true và needsFollowUp=true.

Schema:
- FacebookPost(workspaceId, pageId, externalPostId, permalink, message, externalCreatedAt, deletedAt).
- FacebookComment(workspaceId, pageId, postId?, customerId?, conversationId?, externalPostId, externalCommentId, parentCommentId?, message, fromName/fromId, permalink, status, hasPhone, needsFollowUp, isHidden, repliedAt, hiddenAt, externalCreatedAt, rawPayloadJson, deletedAt).
- FacebookCommentStatus: OPEN, REPLIED, HIDDEN, ARCHIVED.

GET /api/comments:
- Query: q/search, status, pageId, customerId, postId, hasPhone=true/false, needsFollowUp=true/false, isHidden=true/false, page/pageSize hoặc limit.
- Response: { ok, data: { items, pagination } }.
- items include facebookPage, post, customer, conversation summary.

GET /api/comments/:id:
- Response: { ok, data: { comment } } scoped by currentWorkspaceId.

PATCH /api/comments/:id:
- Body: { status?, needsFollowUp?, isHidden?, deleted? }.
- Chỉ cập nhật trạng thái nội bộ/soft-delete; không gọi Graph API.

POST /api/comments/:id/reply:
- Body: { message }.
- Gọi Graph API /{externalCommentId}/comments bằng page token.
- Nếu thành công: status=REPLIED, repliedAt set, needsFollowUp=false, tạo Message OUTBOUND nếu comment có conversationId.

POST /api/comments/:id/hide:
- Body: { hide?: boolean }, default true.
- Gọi Graph API /{externalCommentId} is_hidden=true/false bằng page token.
- Nếu thành công: cập nhật isHidden/status/hiddenAt.

Meta permission/runtime:
- OAuth scope đã thêm pages_manage_engagement.
- Page subscribed_fields đã thêm feed.
- Các page đã connect trước PR #6 có thể cần reconnect/health-check để lấy scope/subscription mới.
- Nếu app/page token chưa có pages_manage_engagement, reply/hide sẽ trả lỗi Graph API; xem D-002.

Runtime note:
- Migration 20260614_workspace_core_04_comment_backend đã deploy thành công bằng npx prisma migrate deploy.
- npx prisma migrate status sau deploy: schema up to date, không pending/failed migration.
- Runtime smoke test PASS: GET /api/comments, webhook feed/comment payload qua POST /api/webhook/facebook, GET /api/comments/:id, PATCH /api/comments/:id.
- Smoke xác nhận FacebookPost/FacebookComment thuộc currentWorkspaceId, dedupe theo workspaceId+pageId+externalCommentId, tạo/reuse Customer và Conversation đúng workspace, tạo Message INBOUND cho inbox, comment có SĐT Việt Nam được set hasPhone=true và needsFollowUp=true.
- Messenger webhook cũ vẫn accept payload; smoke page botEnabled=false nên không tạo Messenger message, đúng hành vi hiện tại.
- Graph reply/hide chưa smoke thật vì test dùng smoke page không có page token/quyền Meta thật; D-002 vẫn OPEN.
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

#### 2026-06-14 — Claude (PR #3B Pipeline UI)

```text
## 2026-06-14 — Claude (PR #3B Pipeline UI)

### Đang làm PR
- PR #3B — Pipeline UI

### Đã làm hôm nay
- Xác nhận mục 16.2 Pipeline API = READY; đọc route thật (pipelines, pipelines/:id, opportunities, opportunities/:id/stage) để build khớp shape. Tạo branch claude/03-pipeline-ui.
- Trang /pipeline (Kanban): GET /api/pipelines (chọn default), GET /api/pipelines/:id (stages + opportunities), render cột theo position, thẻ theo stage.
- Thẻ hiển thị: tên cơ hội, tên khách + SĐT, giá trị VND, nguồn, owner, last activity, trạng thái OPEN/WON/LOST.
- Đổi stage: kéo-thả (HTML5 DnD, desktop) + dropdown "Chuyển giai đoạn" trên thẻ (fallback + mobile), cập nhật lạc quan, lỗi thì revert. Gọi PATCH /api/opportunities/:id/stage.
- Đổi trạng thái OPEN/WON/LOST trên thẻ (PATCH stage kèm status).
- Nút "Tạo cơ hội" + "+" trên mỗi cột → modal tạo opportunity (POST /api/opportunities). Chọn khách qua /api/conversations (Contact list API chưa READY).
- Tổng giá trị VND theo cột tính client-side từ opportunities (khớp stageSummaries). Empty states: chưa có pipeline (chọn mẫu ngành), cột rỗng, lỗi tải (Thử lại).
- util formatVnd (vi-VN). Thêm mục "Pipeline" vào sidebar nav. UI tiếng Việt 100%; board cuộn ngang, modal full-screen sheet trên mobile.

### Files đã sửa
- src/components/money.ts (mới)
- src/components/pipeline/types.ts (mới)
- src/components/pipeline/PipelineBoard.tsx (mới)
- src/components/pipeline/CreateOpportunityModal.tsx (mới)
- src/components/pipeline/PipelineClient.tsx (mới)
- src/app/pipeline/page.tsx (mới)
- src/components/AppShell.tsx (thêm nav Pipeline)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.6, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/pipeline/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, pipeline.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- next build: "Compiled successfully" + "Checking validity of types" PASS. Full npm run build chặn ở prisma generate (EPERM) và prerender "/" (ENOENT) do DEV SERVER đang chạy (PID 8984, port 3000) khóa Prisma engine DLL + .next — môi trường, không phải code (giống B-009). KHÔNG kill dev server của founder.

### Blocker
- B-014 (ENV, không chặn code): full production build cần dừng dev server để giải phóng lock .next/prisma engine.
- Phụ thuộc nhẹ: form chọn khách dùng /api/conversations vì Contact list API (16.3) chưa READY → chỉ chọn được khách đã có hội thoại.

### Cần founder quyết
- Không phát sinh mới.

### Cần agent kia hỗ trợ
- (PR #4) Codex cung cấp GET /api/contacts để form Tạo cơ hội chọn được mọi khách, không chỉ khách đã có hội thoại.

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ PR #3B). Bước kế: PR #4B Contact UI sau khi mục 16.3 = READY.
```

#### 2026-06-14 — Claude (PR #4B Contact UI)

```text
## 2026-06-14 — Claude (PR #4B Contact UI)

### Đang làm PR
- PR #4B — Contact UI

### Đã làm hôm nay
- Xác nhận mục 16.3 Contact API = READY; đọc route thật (contacts, :id, notes, timeline) + contact.ts để build khớp shape. Tạo branch claude/04-contact-ui.
- /contacts: danh sách (GET /api/contacts) — tìm q, lọc stage + tag, pagination, bảng (desktop) + card (mobile); hiển thị tên/SĐT/email/stage/tags/owner/đếm conv-opp-task-note/lần cuối.
- /contacts/[id]: Contact 360 (GET /api/contacts/:id) — thông tin + owner + fanpage + tags; tabs Tổng quan(timeline)/Hội thoại/Cơ hội/Việc cần làm/Ghi chú.
- Tạo contact (POST) + sửa contact (PATCH) qua ContactFormModal dùng chung. Ghi chú: POST /api/contacts/:id/notes (prepend + refresh timeline). Timeline: GET /api/contacts/:id/timeline.
- Cập nhật Pipeline CreateOpportunityModal: chọn khách từ GET /api/contacts (thay /api/conversations) → chọn được mọi contact.
- Thêm nav "Khách hàng". UI tiếng Việt 100%; bảng→card trên mobile; tái dùng StageBadge/ScoreBadge/Tag + formatVnd.

### Files đã sửa
- src/components/contacts/types.ts (mới)
- src/components/contacts/ContactFormModal.tsx (mới)
- src/components/contacts/ContactsClient.tsx (mới)
- src/components/contacts/ContactDetailClient.tsx (mới)
- src/app/contacts/page.tsx (mới)
- src/app/contacts/[id]/page.tsx (mới)
- src/components/AppShell.tsx (nav "Khách hàng")
- src/components/pipeline/CreateOpportunityModal.tsx (picker khách dùng /api/contacts)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.8, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/contacts/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, contact.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- npm run build: PASS (full, dev server đã tắt) — /contacts + /contacts/[id] có trong cây build. B-014 (lock build PR #3B) đã hết khi dev server dừng.

### Blocker
- Không có blocker chặn PR #4B.
- Hạn chế nhẹ: chưa có API list members (users) → form contact chỉ hiển thị owner (không sửa); list contact bỏ filter "theo owner".

### Cần founder quyết
- Không mới (D-007 dedup phone/email do Codex/founder chốt ở backend).

### Cần agent kia hỗ trợ
- (Tương lai) Codex cấp API list workspace members để chọn/đổi owner và lọc theo nhân viên (Contact + Pipeline).

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ PR #4B). Bước kế: PR #5B Order UI sau khi mục 16.4 = READY.
```

#### 2026-06-14 — Claude (PR #5B Order UI)

```text
## 2026-06-14 — Claude (PR #5B Order UI)

### Đang làm PR
- PR #5B — Order UI

### Đã làm hôm nay
- Xác nhận mục 16.4 Order API = READY; đọc route thật (orders, :id, :id/status, products) + lib/order.ts (enums, orderInclude, công thức tiền). Tạo branch claude/05-order-ui.
- /orders: danh sách đơn (GET /api/orders) — tìm q, lọc status + paymentStatus, pagination, bảng (desktop) + card (mobile); hiển thị mã đơn/khách/tổng tiền/trạng thái/thanh toán/ngày/phụ trách.
- /orders/[id]: chi tiết đơn (GET /api/orders/:id) — khách/cơ hội/owner, bảng dòng hàng, tổng tiền (tạm tính/giảm/ship/tổng/cọc/còn lại), giao hàng + ghi chú; panel đổi trạng thái (PATCH /api/orders/:id/status).
- OrderFormModal (POST /api/orders): chọn khách qua /api/contacts, cơ hội theo khách (/api/opportunities), dòng hàng chọn/suggest product (/api/products) + nhập tay, tạo nhanh product (POST /api/products), giảm/ship/cọc, thanh toán/trạng thái, giao hàng, ghi chú; preview tổng tiền VND client.
- Tích hợp Contact detail: tab "Đơn hàng" (GET /api/orders?customerId) + nút "Tạo đơn" (khoá sẵn khách).
- Thêm nav "Đơn hàng". UI tiếng Việt 100%; bảng→card mobile; modal full-screen sheet. Tôn trọng giới hạn PR #5 (không sửa dòng hàng sau tạo; total do API tính).

### Files đã sửa
- src/components/orders/types.ts (mới)
- src/components/orders/OrderFormModal.tsx (mới)
- src/components/orders/OrdersClient.tsx (mới)
- src/components/orders/OrderDetailClient.tsx (mới)
- src/app/orders/page.tsx (mới)
- src/app/orders/[id]/page.tsx (mới)
- src/components/AppShell.tsx (nav "Đơn hàng")
- src/components/contacts/ContactDetailClient.tsx (tab "Đơn hàng" + nút Tạo đơn)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.10, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/orders/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, order.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- next build: FULL PASS (Compiled successfully + type validation + static pages 5/5 + traces) dù dev server đang chạy. npm run build có bước prisma generate có thể vướng lock dev server (class B-014) nhưng Prisma client đã current.

### Blocker
- Không có blocker chặn PR #5B.
- Lưu ý: Order API (PR #5) của Codex đang ở working tree CHƯA commit trên branch codex/05-order-api (M schema.prisma; ?? api/orders, api/products, lib/order.ts, migration). UI build trên đó; Codex/founder cần commit.

### Cần founder quyết
- Không mới (D-003 tiền VND integer đã áp).

### Cần agent kia hỗ trợ
- Codex commit Order API (PR #5). (Tương lai) API list members để chọn owner đơn + lọc theo nhân viên.

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ PR #5B). Bước kế: PR #6B Comment UI sau khi mục 16.5 = READY.
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

#### 2026-06-14 — Codex (PR #3 Pipeline API)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #3 — Pipeline API — DONE

### Đã làm hôm nay
- Tạo branch codex/03-pipeline-api sau khi commit riêng phần Workspace baseline/backfill completion.
- Thêm schema additive: OpportunityStatus, Pipeline, PipelineStage, Opportunity.
- Chọn customerId theo model hiện tại Customer; chưa tạo Contact model riêng.
- Thêm helper src/lib/pipeline.ts với template ngành FASHION/STUDIO/SALON/AGENCY, ensure default pipeline, validate customer/stage/owner theo workspace.
- Thêm API Pipeline: GET/POST /api/pipelines, GET/PATCH /api/pipelines/:id.
- Thêm API Opportunity: GET/POST /api/opportunities, PATCH /api/opportunities/:id, PATCH /api/opportunities/:id/stage.
- Mọi query/write mới filter currentWorkspaceId hoặc validate entity thuộc current workspace.
- valueVnd lưu integer đồng; API round/clamp >= 0, không dùng float.
- Không làm Pipeline UI, Order Lite, Contact UI, Comment-to-Inbox, Automation.
- Tạo migration offline: prisma/migrations/20260614_workspace_core_01_pipeline_api/migration.sql.
- Review migration SQL: additive-only; không DROP, DELETE FROM, TRUNCATE, SET NOT NULL; không ON DELETE CASCADE.
- Founder duyệt migrate deploy; đã chạy npx prisma migrate deploy thành công.
- npx prisma migrate status sau deploy: schema up to date, không pending/failed migration.
- Runtime smoke test PASS:
  GET /api/pipelines 200, ensure default pipeline có 7 stage.
  POST /api/opportunities 201 tạo opportunity trong currentWorkspaceId.
  PATCH /api/opportunities/:id/stage 200 chuyển stage thành công.
- Verify DB: Pipeline và Opportunity thuộc currentWorkspaceId; legacy Customer/Conversation/Task/FacebookPage counts không giảm.

### Files đã sửa
- prisma/schema.prisma
- prisma/migrations/20260614_workspace_core_01_pipeline_api/migration.sql
- src/lib/pipeline.ts
- src/app/api/pipelines/route.ts
- src/app/api/pipelines/[id]/route.ts
- src/app/api/opportunities/route.ts
- src/app/api/opportunities/[id]/route.ts
- src/app/api/opportunities/[id]/stage/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa UI/Claude-owned app/components.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md đang modified ngoài scope trước report PR #3; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma format: PASS
- npx prisma generate: PASS
- npm run typecheck: PASS
- npm run build: PASS
- npx prisma migrate deploy: PASS, applied 20260614_workspace_core_01_pipeline_api.
- npx prisma migrate status: PASS, schema up to date, no pending/failed migration.
- API runtime smoke: PASS.

### Blocker
- B-013 RESOLVED: Pipeline migration deployed and runtime smoke test passed.

### Cần founder quyết
- Không cần quyết định thêm cho PR #3 Pipeline API.

### Cần agent kia hỗ trợ
- Claude PR #3B Pipeline UI có thể bắt đầu từ contract 16.2.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #3 theo yêu cầu. Bước tiếp theo đề xuất: Claude PR #3B Pipeline UI.
```

#### 2026-06-14 — Codex (PR #4 Contact API + Notes)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #4 — Contact API + Notes — DONE

### Đã làm hôm nay
- Tạo branch codex/04-contact-api từ trạng thái hiện tại sau PR #3B.
- Dùng Customer model hiện tại làm Contact entity, không rename model để tránh migration lớn.
- Thêm field additive nullable cho Customer: ownerId, gender, birthday, address, customFieldsJson, lastActivityAt, deletedAt.
- Thêm Note model: workspaceId, customerId, authorId nullable, body, timestamps, deletedAt.
- Thêm helper src/lib/contact.ts cho normalize input, pagination, owner/page validation, Contact 360 include, timeline builder.
- Thêm API:
  GET /api/contacts
  POST /api/contacts
  GET /api/contacts/:id
  PATCH /api/contacts/:id
  POST /api/contacts/:id/notes
  GET /api/contacts/:id/timeline
- Mọi endpoint require logged-in user.
- Mọi query/write chính filter currentWorkspaceId; nested Contact 360 include cũng filter workspaceId cho conversations/messages/tasks/opportunities/notes.
- Không làm Contact UI, Order Lite, Comment-to-Inbox, Automation, Dashboard.
- Không chuẩn hóa Tag/ContactTag trong PR này; giữ Customer.tags String[] để tránh lan rộng sang funnel/email/stats, ghi debt.
- Tạo migration additive: prisma/migrations/20260614_workspace_core_02_contact_api/migration.sql.
- Review migration SQL: additive-only; không DROP, DELETE FROM, TRUNCATE, SET NOT NULL; không ON DELETE CASCADE.
- Founder duyệt migrate deploy; đã chạy npx prisma migrate deploy thành công.
- npx prisma migrate status sau deploy: schema up to date, không pending/failed migration.
- Runtime smoke test PASS:
  GET /api/contacts 200.
  POST /api/contacts 201 tạo contact trong currentWorkspaceId.
  GET /api/contacts/:id 200 trả Contact 360.
  PATCH /api/contacts/:id 200 cập nhật stage/address/customFieldsJson.
  POST /api/contacts/:id/notes 201 tạo note trong currentWorkspaceId.
  GET /api/contacts/:id/timeline 200 có note.created.
- Verify DB: Contact và Note thuộc currentWorkspaceId; nested Contact 360 cùng workspace; legacy counts không giảm.

### Files đã sửa
- prisma/schema.prisma
- prisma/migrations/20260614_workspace_core_02_contact_api/migration.sql
- src/lib/contact.ts
- src/app/api/contacts/route.ts
- src/app/api/contacts/[id]/route.ts
- src/app/api/contacts/[id]/notes/route.ts
- src/app/api/contacts/[id]/timeline/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa UI/Claude-owned app/components.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md đang modified từ PR #3B trước khi Codex bắt đầu PR #4; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma format: PASS.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- npx prisma migrate deploy: PASS, applied 20260614_workspace_core_02_contact_api.
- npx prisma migrate status: PASS, schema up to date, no pending/failed migration.
- Migration safety scan: PASS additive-only.
- API runtime smoke: PASS.

### Blocker
- B-015 RESOLVED: Contact migration deployed and runtime smoke test passed.

### Cần founder quyết
- D-007 vẫn OPEN: có dùng phone/email làm khóa dedup/merge contact trong cùng workspace không. PR #4 chưa thêm unique constraint để tránh rủi ro dữ liệu.

### Cần agent kia hỗ trợ
- Claude PR #4B Contact UI có thể bắt đầu từ contract 16.3.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #4 theo yêu cầu. Bước tiếp theo đề xuất: Claude PR #4B Contact UI.
```

#### 2026-06-14 — Codex (PR #5 Order Lite API)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #5 — Order Lite API — DONE

### Đã làm hôm nay
- Tạo branch codex/05-order-api từ trạng thái hiện tại sau PR #4B.
- Thêm schema additive: ProductLite, Order, OrderItem.
- Thêm enum OrderStatus, PaymentStatus, PaymentMethod.
- Thêm helper src/lib/order.ts cho validate workspace/customer/opportunity/owner/product, normalize items, tính tiền integer VND, sinh mã đơn.
- Thêm API Product:
  GET /api/products
  POST /api/products
- Thêm API Order:
  GET /api/orders
  POST /api/orders
  GET /api/orders/:id
  PATCH /api/orders/:id
  PATCH /api/orders/:id/status
- Mọi endpoint require logged-in user.
- Mọi query/write filter currentWorkspaceId hoặc validate entity thuộc current workspace.
- Order validate customerId thuộc workspace; opportunityId thuộc workspace và cùng customerId; ownerId là WorkspaceMember.
- totalVnd tính từ items, discount, shippingFee bằng integer VND; không dùng float.
- Không làm kho/tồn kho/kế toán/COD reconciliation.
- Không hard-delete dữ liệu; Order/Product dùng deletedAt.
- Khi tạo/cập nhật/status order: cập nhật Customer.lastActivityAt; nếu có opportunityId, cập nhật Opportunity.lastActivityAt.
- Không tự đổi opportunity WON/stage để tránh side effect phức tạp.
- Tạo migration additive: prisma/migrations/20260614_workspace_core_03_order_lite_api/migration.sql.
- Review migration SQL: additive-only; không DROP, DELETE FROM, TRUNCATE, SET NOT NULL; không ON DELETE CASCADE.
- Founder duyệt migrate deploy; Codex đã chạy npx prisma migrate deploy thành công.
- Sau deploy, npx prisma migrate status báo schema up to date, không pending/failed migration.
- Runtime smoke test API thật PASS:
  GET /api/products
  POST /api/products
  GET /api/orders
  POST /api/orders
  GET /api/orders/:id
  PATCH /api/orders/:id
  PATCH /api/orders/:id/status
- Smoke xác nhận ProductLite/Order thuộc currentWorkspaceId, Order gắn customerId đúng workspace, opportunityId cùng workspace/customer, totalVnd integer đúng 290000, Customer.lastActivityAt được cập nhật, dữ liệu cũ không giảm count.
- Chặn PATCH /api/orders/:id với items trong PR #5 để tránh xóa cứng OrderItem; cần item-level API sau nếu muốn sửa dòng hàng.

### Files đã sửa
- prisma/schema.prisma
- prisma/migrations/20260614_workspace_core_03_order_lite_api/migration.sql
- src/lib/order.ts
- src/app/api/products/route.ts
- src/app/api/orders/route.ts
- src/app/api/orders/[id]/route.ts
- src/app/api/orders/[id]/status/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa UI/Claude-owned app/components.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md đang modified từ PR #4B trước khi Codex bắt đầu PR #5; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma format: PASS.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- npx prisma migrate status trước deploy: connected, 1 pending migration 20260614_workspace_core_03_order_lite_api, no failed migration.
- Migration safety scan: PASS additive-only.
- npx prisma migrate deploy: PASS; applied 20260614_workspace_core_03_order_lite_api.
- npx prisma migrate status sau deploy: PASS; schema up to date, không pending/failed migration.
- API runtime smoke: PASS.

### Blocker
- B-016 RESOLVED: Founder đã duyệt; migration deploy và runtime smoke test API thật đều PASS.

### Cần founder quyết
- D-003 vẫn OPEN nhưng PR #5 đã triển khai theo đề xuất: lưu tiền VND bằng integer đồng.
- Không cần founder quyết thêm để hoàn tất PR #5.

### Cần agent kia hỗ trợ
- Claude PR #5B Order UI có thể bắt đầu theo mục 16.4 contract đã READY + runtime PASS.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #5 theo yêu cầu. Bước tiếp theo: Claude PR #5B Order UI; nếu cần sửa dòng hàng trong đơn, đề xuất Codex PR sau thêm item-level API soft-safe.
```

#### 2026-06-14 — Codex (PR #6 Comment-to-Inbox Backend)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #6 — Comment-to-Inbox Backend — DONE

### Đã làm hôm nay
- Tạo branch codex/06-comment-backend từ trạng thái sau PR #5B.
- Giữ nguyên Messenger webhook hiện có; thêm xử lý Facebook feed/comment ở entry.changes.
- Thêm schema additive: FacebookPost, FacebookComment, FacebookCommentStatus.
- Thêm migration additive: prisma/migrations/20260614_workspace_core_04_comment_backend/migration.sql.
- Thêm prisma/migrations/migration_lock.toml provider postgresql để migration history có metadata chuẩn.
- Thêm helper src/lib/facebook/comments.ts:
  handleFacebookFeedChange
  dedupe comment theo workspaceId/pageId/externalCommentId
  tạo Customer tối thiểu nếu người comment chưa có contact
  tạo/reuse Conversation và tạo Message INBOUND để comment đi vào inbox
  detect SĐT Việt Nam và set hasPhone/needsFollowUp
  reply/hide qua Graph API bằng page token nếu quyền cho phép
- Cập nhật Facebook OAuth scope thêm pages_manage_engagement.
- Cập nhật subscribed_fields thêm feed.
- Thêm API:
  GET /api/comments
  GET /api/comments/:id
  PATCH /api/comments/:id
  POST /api/comments/:id/reply
  POST /api/comments/:id/hide
- Mọi API require logged-in user và filter currentWorkspaceId.
- Không làm Comment UI, Automation, Dashboard.
- Founder duyệt migrate deploy; Codex đã chạy npx prisma migrate deploy thành công.
- Sau deploy, npx prisma migrate status báo schema up to date, không pending/failed migration.
- Runtime smoke test API/backend PASS:
  GET /api/comments
  webhook feed/comment payload qua POST /api/webhook/facebook
  GET /api/comments/:id
  PATCH /api/comments/:id
- Smoke xác nhận FacebookPost/FacebookComment thuộc currentWorkspaceId, dedupe đúng workspaceId+pageId+externalCommentId, tạo/reuse Customer đúng workspace, tạo/reuse Conversation đúng workspace, tạo Message INBOUND cho inbox, hasPhone/needsFollowUp true khi comment có SĐT Việt Nam.
- Messenger webhook cũ vẫn accept payload; smoke page botEnabled=false nên không tạo Messenger message, đúng hành vi hiện tại.
- Không test Graph reply/hide thật vì smoke page không có page token/quyền Meta thật; không fake pass.

### Files đã sửa
- prisma/schema.prisma
- prisma/migrations/migration_lock.toml
- prisma/migrations/20260614_workspace_core_04_comment_backend/migration.sql
- src/lib/facebook/comments.ts
- src/lib/facebook/facebook-client.ts
- src/app/api/webhook/facebook/route.ts
- src/app/api/comments/route.ts
- src/app/api/comments/[id]/route.ts
- src/app/api/comments/[id]/reply/route.ts
- src/app/api/comments/[id]/hide/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa UI/Claude-owned app/components.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md đang modified từ Claude trước khi Codex bắt đầu PR #6; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma format: PASS.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- npx prisma migrate status trước deploy: PASS connection; 1 pending migration 20260614_workspace_core_04_comment_backend; no failed migration.
- Migration safety scan: PASS additive-only; không DROP, DELETE FROM, TRUNCATE, SET NOT NULL, ON DELETE CASCADE.
- npx prisma migrate deploy: PASS; applied 20260614_workspace_core_04_comment_backend.
- npx prisma migrate status sau deploy: PASS; schema up to date, không pending/failed migration.
- Runtime smoke GET /api/comments + webhook feed/comment payload + GET/PATCH detail: PASS.
- Reply/hide Graph runtime: SKIPPED, không có real page token/quyền Meta trong smoke; D-002 vẫn OPEN.

### Blocker
- B-018 RESOLVED: Founder đã duyệt; migration deploy và runtime smoke test backend đều PASS.
- D-002 vẫn OPEN: App/Page cần pages_manage_engagement và feed subscription để hide/reply/receive comments chạy thật trên page Meta.

### Cần founder quyết
- Xác nhận/reconnect Facebook Page để cấp pages_manage_engagement và subscribed_fields feed.

### Cần agent kia hỗ trợ
- Claude PR #6B Comment UI có thể bắt đầu theo mục 16.5 contract đã READY + runtime backend smoke PASS.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #6 theo yêu cầu. Bước tiếp theo: Claude PR #6B Comment UI; founder/dev cần reconnect/resubscribe Page để cấp pages_manage_engagement/feed nếu muốn demo hide/reply thật.
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
**Status:** `DONE`  
**Branch:** codex/03-pipeline-api  
**Commit/PR link:** Local working tree, chưa commit PR #3  

#### Summary

```text
PR #3 Pipeline API complete:
- Added additive schema for Pipeline, PipelineStage, Opportunity and OpportunityStatus.
- Added industry pipeline templates for FASHION, STUDIO, SALON, AGENCY.
- Added backend helper src/lib/pipeline.ts for template creation, default pipeline, workspace validation, VND parsing.
- Added Pipeline APIs:
  GET /api/pipelines
  POST /api/pipelines
  GET /api/pipelines/:id
  PATCH /api/pipelines/:id
- Added Opportunity APIs:
  GET /api/opportunities
  POST /api/opportunities
  PATCH /api/opportunities/:id
  PATCH /api/opportunities/:id/stage
- Every query/write scopes by currentWorkspaceId or validates related entity belongs to current workspace.
- No Pipeline UI, Order Lite, Contact UI, Comment-to-Inbox, or Automation work.
- Migration 20260614_workspace_core_01_pipeline_api deployed successfully.
- Runtime smoke test passed against local app connected to Neon DB.
```

#### API Contract Updated?

```text
YES — mục 16.2 Pipeline API Contract đã đặt Status = READY.
Runtime note: DB migration 20260614_workspace_core_01_pipeline_api applied; API smoke test passed.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/20260614_workspace_core_01_pipeline_api/migration.sql
src/lib/pipeline.ts
src/app/api/pipelines/route.ts
src/app/api/pipelines/[id]/route.ts
src/app/api/opportunities/route.ts
src/app/api/opportunities/[id]/route.ts
src/app/api/opportunities/[id]/stage/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
npx prisma migrate deploy: PASS, applied 20260614_workspace_core_01_pipeline_api.
npx prisma migrate status: PASS, schema up to date; no pending/failed migration.
Migration SQL review: PASS additive-only; no DROP, DELETE FROM, TRUNCATE, SET NOT NULL, or ON DELETE CASCADE.
API smoke test: PASS.
- GET /api/pipelines: 200, ensured default pipeline with 7 stages.
- POST /api/opportunities: 201, created opportunity in currentWorkspaceId.
- PATCH /api/opportunities/:id/stage: 200, moved opportunity stage.
- DB verification: Pipeline/Opportunity workspaceId matched currentWorkspaceId.
- Legacy counts did not decrease: Customer 2, Conversation 2, Task 1, FacebookPage 0.
- Cross-workspace denial not fully exercised because DB currently has 1 active workspace and no other-workspace pipeline; route code still scopes all reads/writes by currentWorkspaceId.
```

#### Handoff to Claude

```text
Claude PR #3B Pipeline UI can start from contract 16.2.

UI can rely on:
- GET /api/pipelines returns { items, templates } and auto-creates default pipeline unless ensureDefault=false.
- Pipeline stages are ordered by position.
- GET /api/pipelines/:id returns stages + opportunities + stageSummaries.
- valueVnd is integer VND.
- Move cards with PATCH /api/opportunities/:id/stage { stageId, status? }.
- Create opportunity with POST /api/opportunities { customerId, pipelineId?, stageId?, title?, valueVnd?, ownerId?, source?, expectedCloseAt? }.
```

---

### 18.6. PR #3B — Pipeline UI

**Owner:** Claude  
**Status:** `DONE`
**Branch:** claude/03-pipeline-ui
**Commit/PR link:** N/A

#### Summary

```text
Màn Pipeline Kanban theo API contract 16.2: xem cơ hội theo từng giai đoạn, tạo cơ hội, đổi giai đoạn
(kéo-thả desktop + dropdown fallback/mobile), đổi trạng thái OPEN/WON/LOST, tổng giá trị VND theo cột.
Empty states + util formatVnd + mục nav "Pipeline". Không đụng backend/core/schema/api routes.
```

#### Files changed

```text
src/components/money.ts                              (mới)
src/components/pipeline/types.ts                     (mới)
src/components/pipeline/PipelineBoard.tsx            (mới)
src/components/pipeline/CreateOpportunityModal.tsx   (mới)
src/components/pipeline/PipelineClient.tsx           (mới)
src/app/pipeline/page.tsx                            (mới)
src/components/AppShell.tsx                          (thêm nav "Pipeline")
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md            (mục 17, 18.6, 19)
```

#### Tests

```text
npm run typecheck: PASS
next build: "Compiled successfully" + "Checking validity of types" PASS.
Full npm run build: chặn ở prisma generate (EPERM) + prerender "/" (ENOENT) do dev server đang chạy khóa
.next/prisma engine — môi trường, không phải code (B-014, giống B-009).
Test thủ công (dev server đang chạy localhost:3000): mở /pipeline → pipeline mặc định + 7 stage →
tạo cơ hội → chuyển stage (kéo-thả/select) → đổi trạng thái → reload dữ liệu vẫn đúng.
```

#### Risks

```text
- B-014: cần dừng dev server để có full production build xanh hoàn toàn.
- Form chọn khách tạm dùng /api/conversations (Contact list API 16.3 chưa READY) → chỉ chọn được khách đã có hội thoại.
- Drag-drop dùng HTML5 native; mobile/an toàn dùng dropdown "Chuyển giai đoạn" (không phụ thuộc kéo-thả).
- valueVnd nhập integer đồng; hiển thị Intl vi-VN.
```

#### Handoff

```text
- Đạt Acceptance PR #3B (plan 14.4): founder thấy tiền theo từng stage; sale chuyển được stage; empty state rõ; mobile/tablet cuộn ngang không vỡ.
- Bước kế Claude: PR #4B Contact UI khi mục 16.3 = READY.
- Đề nghị Codex (PR #4): cung cấp GET /api/contacts để form Tạo cơ hội chọn được mọi khách (không chỉ khách đã có hội thoại).
```

---

### 18.7. PR #4 — Contact API + Notes

**Owner:** Codex  
**Status:** `DONE`
**Branch:** codex/04-contact-api
**Commit/PR link:** Local working tree, chưa commit PR #4

#### Summary

```text
PR #4 Contact API + Notes complete:
- Kept Customer as Contact entity to avoid risky model rename.
- Added additive Customer fields: ownerId, gender, birthday, address, customFieldsJson, lastActivityAt, deletedAt.
- Added Note model for internal notes scoped by workspace/customer.
- Added src/lib/contact.ts helper for input normalization, workspace owner/page validation, pagination, Contact 360 include, and timeline assembly.
- Added Contact APIs:
  GET /api/contacts
  POST /api/contacts
  GET /api/contacts/:id
  PATCH /api/contacts/:id
  POST /api/contacts/:id/notes
  GET /api/contacts/:id/timeline
- Contact list supports q/search, tag, stage, ownerId, page/pageSize pagination.
- Contact detail returns customer info, conversations/messages, tasks, opportunities, notes.
- Timeline returns note, conversation/message, task, and opportunity activity.
- Every endpoint requires a logged-in user and scopes reads/writes to currentWorkspaceId.
- No Contact UI, Order Lite, Comment-to-Inbox, Automation, or Dashboard work.
- Tag normalization into Tag/ContactTag deferred as debt; existing Customer.tags String[] remains source of truth.
- Migration 20260614_workspace_core_02_contact_api deployed successfully.
- Runtime smoke test passed against local app connected to Neon DB.
```

#### API Contract Updated?

```text
YES — mục 16.3 Contact API Contract đã đặt Status = READY.
Runtime note: DB migration 20260614_workspace_core_02_contact_api applied; API smoke test passed.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/20260614_workspace_core_02_contact_api/migration.sql
src/lib/contact.ts
src/app/api/contacts/route.ts
src/app/api/contacts/[id]/route.ts
src/app/api/contacts/[id]/notes/route.ts
src/app/api/contacts/[id]/timeline/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
npx prisma migrate deploy: PASS, applied 20260614_workspace_core_02_contact_api.
npx prisma migrate status: PASS, schema up to date; no pending/failed migration.
Migration SQL review: PASS additive-only; no DROP, DELETE FROM, TRUNCATE, SET NOT NULL, or ON DELETE CASCADE.
API smoke test: PASS.
- GET /api/contacts: 200.
- POST /api/contacts: 201, created smoke contact in currentWorkspaceId.
- GET /api/contacts/:id: 200, returned Contact 360.
- PATCH /api/contacts/:id: 200, updated contact stage/address/customFieldsJson.
- POST /api/contacts/:id/notes: 201, created note in currentWorkspaceId.
- GET /api/contacts/:id/timeline: 200, returned note.created timeline item.
- Search/filter smoke: q + tag + stage returned created contact.
- DB verification: Contact/Note workspaceId matched currentWorkspaceId; Contact 360 nested data matched workspace.
- Legacy counts did not decrease: Customer 2->3 (smoke contact added), Conversation 2->2, Task 1->1, Opportunity 1->1, Note 0->1.
```

#### Risks / Debt

```text
- D-007 remains open: phone/email dedup/merge rule not enforced in DB yet.
- Tag/ContactTag normalization deferred to avoid broad refactor across funnel/email/stats.
- Existing legacy customer routes under /api/customers remain for compatibility.
- Smoke test created one real contact and one note tagged/source runtime-smoke-test.
```

#### Handoff to Claude

```text
Claude PR #4B Contact UI can start from contract 16.3.

UI can rely on:
- GET /api/contacts returns { items, pagination } with filters q/search, tag, stage, ownerId, page/pageSize.
- POST /api/contacts accepts name/phone/email plus optional ownerId, gender, birthday, address, customFieldsJson, tags, currentStage.
- GET /api/contacts/:id returns Contact 360 data: conversations, tasks, opportunities, notes.
- PATCH /api/contacts/:id updates Contact 360 fields and supports soft-delete via { deleted: true }.
- POST /api/contacts/:id/notes creates internal note with current user as author.
- GET /api/contacts/:id/timeline returns mixed activity items sorted newest-first.
```

---

### 18.8. PR #4B — Contact UI

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/04-contact-ui  
**Commit/PR link:** N/A  

#### Summary

```text
Contact 360 theo API contract 16.3: danh sách khách (search/filter/pagination), chi tiết khách với tabs
Tổng quan(timeline)/Hội thoại/Cơ hội/Việc cần làm/Ghi chú, tạo & sửa contact, thêm ghi chú nội bộ.
Cập nhật Pipeline modal chọn khách qua /api/contacts. Không đụng backend/core/schema/api routes.
```

#### Files changed

```text
src/components/contacts/types.ts                    (mới)
src/components/contacts/ContactFormModal.tsx        (mới)
src/components/contacts/ContactsClient.tsx          (mới)
src/components/contacts/ContactDetailClient.tsx     (mới)
src/app/contacts/page.tsx                           (mới)
src/app/contacts/[id]/page.tsx                      (mới)
src/components/AppShell.tsx                          (nav "Khách hàng")
src/components/pipeline/CreateOpportunityModal.tsx  (picker khách dùng /api/contacts)
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md            (mục 17, 18.8, 19)
```

#### Tests

```text
npm run typecheck: PASS
npm run build: PASS (full) — /contacts + /contacts/[id] trong cây build.
Test thủ công: /contacts → tạo contact → mở detail → sửa thông tin → thêm note → xem timeline;
Pipeline "Tạo cơ hội" chọn được contact qua /api/contacts.
```

#### Risks

```text
- Owner contact chỉ hiển thị, chưa cho sửa trên UI (thiếu API list workspace members); filter "theo owner" cũng bỏ vì lý do này.
- Tags nhập kiểu phân cách dấu phẩy (chưa chip), đủ cho MVP.
- Dedup phone/email là việc backend/founder (D-007); UI không tự merge.
```

#### Handoff

```text
- Đạt Acceptance PR #4B: contact list theo workspace; detail trả hội thoại/task/cơ hội/note + timeline; tạo note; cập nhật field/contact.
- Bước kế Claude: PR #5B Order UI khi mục 16.4 = READY.
- Đề nghị Codex (tương lai): API list workspace members để chọn owner + lọc theo nhân viên (Contact, Pipeline).
```

---

### 18.9. PR #5 — Order Lite API

**Owner:** Codex  
**Status:** `DONE`
**Branch:** codex/05-order-api
**Commit/PR link:** Local working tree, chưa commit PR #5

#### Summary

```text
PR #5 Order Lite API complete:
- Added additive schema for ProductLite, Order, OrderItem.
- Added enums OrderStatus, PaymentStatus, PaymentMethod.
- Added src/lib/order.ts helper for workspace validation, product/item normalization, integer VND totals, order code generation.
- Added Product APIs:
  GET /api/products
  POST /api/products
- Added Order APIs:
  GET /api/orders
  POST /api/orders
  GET /api/orders/:id
  PATCH /api/orders/:id
  PATCH /api/orders/:id/status
- Every endpoint requires logged-in user and scopes reads/writes to currentWorkspaceId.
- Order validates customerId, opportunityId, ownerId, products within current workspace.
- Totals are calculated from items with integer VND; no float.
- Migration 20260614_workspace_core_03_order_lite_api deployed successfully.
- Runtime smoke test passed for products/orders/order status.
- PATCH /api/orders/:id intentionally rejects item replacement in PR #5 to avoid hard-deleting OrderItem rows.
- No Order UI, inventory, accounting, COD reconciliation, Comment-to-Inbox, Automation, or Dashboard work.
```

#### API Contract Updated?

```text
YES — mục 16.4 Order API Contract đã đặt Status = READY.
Runtime note: DB migration 20260614_workspace_core_03_order_lite_api has been deployed and API smoke test passed.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/20260614_workspace_core_03_order_lite_api/migration.sql
src/lib/order.ts
src/app/api/products/route.ts
src/app/api/orders/route.ts
src/app/api/orders/[id]/route.ts
src/app/api/orders/[id]/status/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
npx prisma migrate status before deploy: PASS connection, 20260614_workspace_core_03_order_lite_api pending; no failed migration.
Migration SQL review: PASS additive-only; no DROP, DELETE FROM, TRUNCATE, SET NOT NULL, or ON DELETE CASCADE.
npx prisma migrate deploy: PASS; applied 20260614_workspace_core_03_order_lite_api.
npx prisma migrate status after deploy: PASS; schema up to date, no pending/failed migration.
API smoke test: PASS.

Smoke coverage:
- GET /api/products: PASS
- POST /api/products: PASS, ProductLite currentWorkspaceId verified.
- GET /api/orders: PASS
- POST /api/orders: PASS, Order currentWorkspaceId/customer/opportunity verified.
- GET /api/orders/:id: PASS
- PATCH /api/orders/:id: PASS for metadata/shipping/discount; item replacement returns 400 by design.
- PATCH /api/orders/:id/status: PASS, confirmedAt set, Customer.lastActivityAt updated.
- totalVnd integer VND verified: 290000 before and after metadata patch.
```

#### Risks / Debt

```text
- D-003 remains formally OPEN, but code stores VND as integer đồng per proposal.
- No inventory/accounting/COD reconciliation in PR #5 by design.
- Opportunity status/stage is not auto-updated from orders to avoid hidden side effects.
- Editing existing OrderItem rows is deferred; PR #5 blocks item replacement to avoid hard delete. Add item-level soft-safe API later if the UI needs it.
```

#### Handoff to Claude

```text
Claude PR #5B Order UI can use contract 16.4 now; migration deploy + runtime smoke passed.

UI can rely on:
- GET /api/products returns { items, pagination } with q/search and active filters.
- POST /api/products creates lightweight product records.
- GET /api/orders returns { items, pagination } with filters q/search, customerId, opportunityId, ownerId, status, paymentStatus.
- POST /api/orders creates order with items and calculated totals.
- GET /api/orders/:id returns order detail with customer, opportunity, owner, items, product snapshot.
- PATCH /api/orders/:id updates metadata, shipping, payment, discount/shipping/deposit; do not send items in PR #5 because item replacement is intentionally blocked to avoid hard delete.
- PATCH /api/orders/:id/status updates status/payment and timestamps.
- Display values as integer VND; deposit is stored separately and does not reduce totalVnd in PR #5.
```

---

### 18.10. PR #5B — Order UI

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/05-order-ui  
**Commit/PR link:** N/A  

#### Summary

```text
Order Lite UI theo API contract 16.4: danh sách đơn (search/filter/pagination), chi tiết đơn + đổi trạng thái,
modal tạo đơn nhanh (chọn khách/cơ hội, dòng hàng + product suggest + tạo nhanh product, giảm/ship/cọc,
thanh toán/trạng thái, giao hàng, preview tổng tiền VND). Tích hợp tab "Đơn hàng" + nút Tạo đơn trong Contact detail.
Tôn trọng giới hạn PR #5: không sửa dòng hàng sau khi tạo; totalVnd do API tính.
```

#### Files changed

```text
src/components/orders/types.ts                       (mới)
src/components/orders/OrderFormModal.tsx             (mới)
src/components/orders/OrdersClient.tsx               (mới)
src/components/orders/OrderDetailClient.tsx          (mới)
src/app/orders/page.tsx                              (mới)
src/app/orders/[id]/page.tsx                         (mới)
src/components/AppShell.tsx                           (nav "Đơn hàng")
src/components/contacts/ContactDetailClient.tsx      (tab "Đơn hàng" + Tạo đơn)
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md             (mục 17, 18.10, 19)
```

#### Tests

```text
npm run typecheck: PASS
next build: FULL PASS (Compiled successfully + types valid + static pages 5/5 + traces collected).
npm run build: bước prisma generate có thể vướng lock khi dev server chạy (B-014); Prisma client đã current.
Test thủ công: /orders → tạo product nhanh → tạo đơn cho contact → xem chi tiết → đổi trạng thái → tổng tiền VND đúng; từ Contact detail tab "Đơn hàng" + Tạo đơn.
```

#### Risks

```text
- Order API (PR #5) của Codex đang ở working tree CHƯA commit (branch codex/05-order-api): M schema.prisma; ?? api/orders, api/products, lib/order.ts, migration. UI build trên đó; cần Codex/founder commit.
- Không sửa dòng hàng sau khi tạo đơn (giới hạn PR #5) — UI có ghi chú, cần sửa thì tạo đơn mới.
- Chưa chọn owner đơn trên UI (thiếu API list members) — API mặc định owner = current user.
- Tồn kho/kế toán/đối soát COD: ngoài scope, không làm.
```

#### Handoff

```text
- Đạt Acceptance PR #5B: tạo product nhanh; tạo đơn cho contact; xem chi tiết; đổi trạng thái; tổng tiền VND đúng; tích hợp Contact detail.
- Cần Codex: commit Order API (PR #5). (Tương lai) API list members cho owner/lọc nhân viên.
- Bước kế Claude: PR #6B Comment UI khi mục 16.5 = READY.
```

---

### 18.11. PR #6 — Comment-to-Inbox Backend

**Owner:** Codex  
**Status:** `DONE`
**Branch:** codex/06-comment-backend
**Commit/PR link:** Local working tree, chưa commit PR #6

#### Summary

```text
PR #6 Comment-to-Inbox Backend complete:
- Added additive schema for FacebookPost, FacebookComment, FacebookCommentStatus.
- Added webhook handling for Facebook entry.changes feed/comments while preserving existing Messenger entry.messaging flow.
- Added comment dedupe by workspaceId/pageId/externalCommentId.
- New feed/comment handler creates minimal Customer, creates/reuses Conversation, and writes Message INBOUND so comments appear in inbox data.
- Detects Vietnamese phone numbers in comments and marks hasPhone/needsFollowUp.
- Added Graph-backed reply/hide helpers using page token when pages_manage_engagement is available.
- Added comments APIs:
  GET /api/comments
  GET /api/comments/:id
  PATCH /api/comments/:id
  POST /api/comments/:id/reply
  POST /api/comments/:id/hide
- Added pages_manage_engagement to Facebook OAuth scope and feed to subscribed_fields.
- Migration 20260614_workspace_core_04_comment_backend deployed successfully.
- Runtime backend smoke test passed for comments API and webhook feed/comment ingestion.
- No Comment UI, Automation, Dashboard work.
```

#### API Contract Updated?

```text
YES — mục 16.5 Comment-to-Inbox API Contract đã đặt Status = READY.
Runtime note: DB migration 20260614_workspace_core_04_comment_backend has been deployed and backend smoke test passed. Graph reply/hide live smoke still depends on real page token with pages_manage_engagement.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/migration_lock.toml
prisma/migrations/20260614_workspace_core_04_comment_backend/migration.sql
src/lib/facebook/comments.ts
src/lib/facebook/facebook-client.ts
src/app/api/webhook/facebook/route.ts
src/app/api/comments/route.ts
src/app/api/comments/[id]/route.ts
src/app/api/comments/[id]/reply/route.ts
src/app/api/comments/[id]/hide/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
npx prisma migrate status before deploy: PASS connection, 1 pending migration 20260614_workspace_core_04_comment_backend; no failed migration.
Migration SQL review: PASS additive-only; no DROP, DELETE FROM, TRUNCATE, SET NOT NULL, or ON DELETE CASCADE.
npx prisma migrate deploy: PASS; applied 20260614_workspace_core_04_comment_backend.
npx prisma migrate status after deploy: PASS; schema up to date, no pending/failed migration.
API runtime smoke: PASS.
Graph reply/hide runtime: SKIPPED; smoke used generated test page without real page token/Meta permission.

Smoke coverage:
- GET /api/comments: PASS
- POST /api/webhook/facebook feed/comment payload: PASS
- GET /api/comments/:id: PASS
- PATCH /api/comments/:id: PASS
- FacebookPost currentWorkspaceId verified.
- FacebookComment currentWorkspaceId verified.
- Dedupe workspaceId + pageId + externalCommentId verified; duplicate webhook did not create extra rows.
- Customer and Conversation linked in current workspace.
- Message INBOUND created for inbox with metaMessageId fb_comment:{externalCommentId}.
- Vietnamese phone comment set hasPhone=true and needsFollowUp=true.
- Messenger webhook still accepted payload; smoke page botEnabled=false, so no Messenger message was created as expected.
```

#### Risks / Debt

```text
- D-002 remains OPEN: app/page must have pages_manage_engagement and feed subscription for hide/reply/receive-comment runtime.
- Existing connected pages may need reconnect or health-check/resubscribe after new OAuth scope/subscribed_fields.
- Comment Customer uses existing Customer.psid field to store Facebook commenter fromId for compatibility.
- Smoke created one test FacebookPage/FacebookPost/FacebookComment/Customer/Conversation/Message in Neon and did not delete it to respect the no-delete rule.
```

#### Handoff to Claude

```text
Claude PR #6B Comment UI can use contract 16.5 now; migration deploy + backend runtime smoke passed.

UI can rely on:
- GET /api/comments returns { items, pagination } with filters q/search, status, pageId, customerId, postId, hasPhone, needsFollowUp, isHidden.
- Comment item includes facebookPage, post, customer, conversation summary.
- GET /api/comments/:id returns detail scoped by currentWorkspaceId.
- PATCH /api/comments/:id updates internal status/needsFollowUp/isHidden/deleted only.
- POST /api/comments/:id/reply replies through Facebook Graph if page token has permission.
- POST /api/comments/:id/hide hides/unhides through Facebook Graph if page token has permission.
- Phone comments have hasPhone=true and needsFollowUp=true.
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

[2026-06-14 · Codex · PR #3 Pipeline API]
- B-013 RESOLVED: Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_01_pipeline_api. npx prisma migrate status up to date; runtime smoke test Pipeline/Opportunity PASS.

[2026-06-14 · Claude · PR #3B Pipeline UI]
- B-014 (BUILD/ENV, không chặn code): full npm run build fail ở prisma generate (EPERM rename query_engine dll) và prerender "/" (ENOENT) vì dev server đang chạy (PID 8984, port 3000) khóa .next + prisma engine. typecheck PASS và next build "Compiled successfully" + type validation PASS → code hợp lệ. Cần dừng dev server để build production xanh hoàn toàn (cùng loại với B-009). Không kill dev server của founder.
- Phụ thuộc PR #4: form Tạo cơ hội chọn khách qua /api/conversations vì Contact list API (16.3) chưa READY; nâng lên GET /api/contacts khi có.
- PR #3B hoàn tất (DONE).

[2026-06-14 · Codex · PR #4 Contact API + Notes]
- B-015 RESOLVED: Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_02_contact_api. npx prisma migrate status up to date; runtime smoke test Contact/Note/Timeline PASS.
- D-007 vẫn OPEN: chưa áp unique/dedup phone/email ở DB trong PR #4 để tránh rủi ro dữ liệu hiện hữu; cần founder chốt quy tắc merge/dedup.

[2026-06-14 · Claude · PR #4B Contact UI]
- B-014 RESOLVED: full npm run build PASS sau khi dev server dừng (port 3000 free) — xác nhận B-014 là lock môi trường (.next/prisma engine), không phải code.
- Dependency PR #4 RESOLVED: Pipeline "Tạo cơ hội" đã chuyển picker khách sang GET /api/contacts (chọn được mọi contact, không chỉ khách có hội thoại).
- Hạn chế còn lại (không chặn): chưa có API list workspace members → Contact UI không sửa owner / không lọc theo nhân viên. Đề nghị Codex cấp khi tiện.
- PR #4B hoàn tất (DONE).

[2026-06-14 · Codex · PR #5 Order Lite API]
- B-016 RESOLVED: Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_03_order_lite_api. npx prisma migrate status up to date; runtime smoke test Product/Order/Order status PASS.
- D-003 vẫn OPEN trong bảng quyết định, nhưng PR #5 đã triển khai tiền VND bằng integer đồng theo đề xuất hiện tại.

[2026-06-14 · Claude · PR #5B Order UI]
- B-017 (ENV/HANDOFF): Order API (PR #5) của Codex đang nằm trong working tree CHƯA commit trên branch codex/05-order-api (M schema.prisma; ?? src/app/api/orders, src/app/api/products, src/lib/order.ts, prisma/migrations/...order_lite_api). Claude tạo claude/05-order-ui mang theo để build/test UI; Codex/founder cần commit phần Order API.
- Build: next build FULL PASS (compiled + types + static pages 5/5). npm run build có thể vướng prisma generate khi dev server chạy (class B-014); Prisma client đã current.
- Hạn chế (không chặn): chưa chọn owner đơn trên UI vì thiếu API list workspace members; API mặc định owner = current user.
- PR #5B hoàn tất (DONE).

[2026-06-14 · Codex · PR #6 Comment-to-Inbox Backend]
- B-018 RESOLVED: Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_04_comment_backend. npx prisma migrate status up to date; runtime smoke test GET/PATCH comments + webhook feed/comment payload PASS.
- D-002 vẫn OPEN: pages_manage_engagement/feed subscription cần được xác nhận trên Meta thật. PR #6 đã thêm OAuth scope pages_manage_engagement và subscribed_fields feed, nhưng page đã connect trước đó có thể cần reconnect/resubscribe; Graph reply/hide chưa smoke thật vì không có real page token/quyền trong test.
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
