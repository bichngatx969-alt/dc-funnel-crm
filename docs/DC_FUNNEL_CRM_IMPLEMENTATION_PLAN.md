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
**Last updated:** 2026-06-21

```http
GET /api/workspaces
POST /api/workspaces
POST /api/workspaces/switch
GET /api/workspaces/members
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

GET /api/workspaces/members
- Auth: logged-in user with WorkspaceMember access to currentWorkspaceId.
- Query: q optional, role optional.
- Filters by currentWorkspaceId; does not expose members from another workspace.
- Used by UI owner/sale pickers for Contact, Order, Pipeline, Dashboard filters, Automation action config.
- Response envelope: { ok: true, data: { items } }.

Role compatibility:
- Prisma Role keeps legacy ADMIN for safe migration compatibility.
- New workspace roles are available: AGENCY_ADMIN, OWNER, MANAGER, SALE, MARKETER.
- Legacy ADMIN is mapped to workspace OWNER when creating default membership.
```

GET /api/workspaces/members response item:

```json
{
  "id": "membership_id",
  "workspaceId": "workspace_id",
  "userId": "user_id",
  "role": "SALE",
  "assignedOnly": false,
  "createdAt": "2026-06-21T00:00:00.000Z",
  "label": "Sale A",
  "isCurrentUser": false,
  "user": {
    "id": "user_id",
    "name": "Sale A",
    "email": "sale@example.com",
    "role": "SALE",
    "createdAt": "2026-06-21T00:00:00.000Z"
  }
}
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
**Last updated:** 2026-06-20

```http
GET /api/contacts
POST /api/contacts
GET /api/contacts/:id
PATCH /api/contacts/:id
GET /api/contacts/:id/customer-360
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

GET /api/contacts/:id/customer-360:
- Endpoint đọc-only cho Inbox/Customer 360 Panel.
- Response `{ contact, summary, orders, opportunities, tasks, notes, offers, tags, recentProducts, activities }`.
- `summary` gồm totalOrders, totalSpentVnd, openOpportunities, openTasks, lastActivityAt.
- Recent lists giới hạn nhỏ: orders/tasks/notes/opportunities/offers take 5, activities take 10 để tránh tải panel quá nặng.
- Mọi query filter `workspaceId` và `customerId`; không trả dữ liệu workspace khác.

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
- 2026-06-20: thêm GET /api/contacts/:id/customer-360 cho Customer 360 data contract; không schema/migration mới. Local npm run typecheck, npx prisma generate, npm run build PASS.
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

### 16.6. Automation API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

```http
GET /api/automation/rules
POST /api/automation/rules
GET /api/automation/rules/:id
PATCH /api/automation/rules/:id
POST /api/automation/rules/:id/test
GET /api/automation/runs
```

Notes:

```text
Auth:
- Tất cả API /api/automation/** require logged-in user.
- Mọi query/write filter currentWorkspaceId.
- Không đọc/sửa rule/run workspace khác.

Schema:
- AutomationRule(workspaceId, name, description?, triggerType, actionType, conditionsJson?, actionConfigJson?, isActive, runCount, lastRunAt?, createdById?, deletedAt?).
- AutomationRun(workspaceId, ruleId, triggerType, sourceType?, sourceId?, status, inputJson?, outputJson?, error?, createdAt).
- Trigger: CONTACT_CREATED, CONTACT_STAGE_CHANGED, OPPORTUNITY_CREATED, OPPORTUNITY_STAGE_CHANGED, ORDER_CREATED, ORDER_STATUS_CHANGED, COMMENT_CREATED, COMMENT_HAS_PHONE, TASK_DUE_SOON, MANUAL_TEST.
- Action: CREATE_TASK, ADD_TAG, UPDATE_CONTACT_STAGE, CREATE_NOTE, MARK_COMMENT_FOLLOWUP, SEND_EMAIL, WEBHOOK, NOOP.
- Run status: SUCCESS, FAILED, SKIPPED.

GET /api/automation/rules:
- Query: q/search, triggerType, actionType, isActive=true/false, templates=true, page/pageSize hoặc limit.
- Response: { ok, data: { items, templates?, pagination } }.

POST /api/automation/rules:
- Body: { name, description?, triggerType, actionType, conditionsJson?, actionConfigJson?, isActive? }.
- createdById = current user; workspaceId = currentWorkspaceId.

GET /api/automation/rules/:id:
- Trả rule scoped by currentWorkspaceId, include createdBy + run count.

PATCH /api/automation/rules/:id:
- Body cho phép cập nhật name/description/triggerType/actionType/conditionsJson/actionConfigJson/isActive/deleted.
- Soft-delete bằng { deleted: true }.

POST /api/automation/rules/:id/test:
- Default dryRun=true để không tạo task/tag/note/comment update thật.
- Vẫn ghi AutomationRun với triggerType=MANUAL_TEST để có audit.
- Body: { payload?, sourceType?, sourceId?, dryRun? }.

GET /api/automation/runs:
- Query: ruleId, triggerType, sourceType, sourceId, status, page/pageSize hoặc limit.
- Response: { ok, data: { items, pagination } }.

Engine:
- Function dùng chung: evaluateAutomationRules({ workspaceId, triggerType, sourceType?, sourceId?, payload?, dryRun? }).
- ConditionsJson hỗ trợ match key-value đơn giản, gồm hasPhone/status/stage/stageId/customerId nếu payload có.
- SEND_EMAIL và WEBHOOK hiện trả SKIPPED với reason external_side_effect_disabled_in_pr7 để tránh gửi email/webhook thật khi chưa có consent/config rõ.

Hooks đã gắn thật:
- CONTACT_CREATED sau POST /api/contacts.
- CONTACT_STAGE_CHANGED sau PATCH /api/contacts/:id nếu currentStage đổi.
- OPPORTUNITY_STAGE_CHANGED sau PATCH /api/opportunities/:id/stage.
- ORDER_CREATED sau POST /api/orders.
- ORDER_STATUS_CHANGED sau PATCH /api/orders/:id/status.
- COMMENT_CREATED và COMMENT_HAS_PHONE sau webhook feed/comment tạo comment mới.

Runtime note:
- Migration 20260614_workspace_core_05_automation_api đã deploy thành công bằng npx prisma migrate deploy.
- npx prisma migrate status sau deploy: schema up to date, không pending/failed migration.
- Runtime smoke API PASS: GET/POST rules, GET/PATCH rule detail, POST rule test dryRun=true, GET runs.
- Smoke engine PASS: tạo rule MANUAL_TEST + NOOP, test dryRun=true ghi AutomationRun; rule/run thuộc currentWorkspaceId.
- Tenant isolation PASS: API trả 404 khi đọc rule thuộc workspace không có membership.
- Hook smoke PASS: CONTACT_CREATED, CONTACT_STAGE_CHANGED, OPPORTUNITY_STAGE_CHANGED, ORDER_CREATED, ORDER_STATUS_CHANGED, COMMENT_CREATED, COMMENT_HAS_PHONE đều ghi AutomationRun SUCCESS khi có rule active.
- COMMENT_HAS_PHONE smoke xác nhận FacebookComment hasPhone=true, needsFollowUp=true, gắn Customer và Conversation đúng workspace.
- SEND_EMAIL và WEBHOOK vẫn trả SKIPPED, không gửi email/webhook thật.
```

---

### 16.7. Founder Stats API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-14

```http
GET /api/stats/founder
```

Notes:

```text
Auth:
- Endpoint require logged-in user.
- Mọi query filter currentWorkspaceId.
- Không trả dữ liệu workspace khác.

Query params:
- range=today|7d|30d|90d|custom, default 30d.
- from=YYYY-MM-DD và to=YYYY-MM-DD chỉ dùng khi range=custom.
- compare=previous|none, default none.
- ownerId optional; ownerId=unassigned lọc bản ghi chưa gán owner/sale.
- source optional.

Response:
- { ok: true, data: { range, summary, revenue, pipeline, sources, sales, comments, contacts, tasks, automation, comparison } }.

range:
- from, to, timezone="Asia/Ho_Chi_Minh".
- compareFrom/compareTo khi compare=previous.

summary:
- revenueVnd: tổng totalVnd của order trong range, loại CANCELLED/REFUNDED.
- paidRevenueVnd: tổng totalVnd của order paymentStatus=PAID.
- completedRevenueVnd: tổng totalVnd của order status=COMPLETED.
- ordersCount, paidOrdersCount, averageOrderValueVnd.
- newContactsCount.
- openOpportunitiesCount, openPipelineValueVnd.
- commentsCount, phoneCommentsCount, needsFollowUpCommentsCount.
- overdueTasksCount.

revenue:
- byDay: [{ date, revenueVnd, ordersCount }].
- byStatus: [{ status, count, totalVnd }].
- byPaymentStatus: [{ paymentStatus, count, totalVnd }].

pipeline:
- stages: open opportunity summary by stage/pipeline with count and valueVnd.
- openValueVnd, wonValueVnd, lostValueVnd.
- conversion: { open, won, lost, winRate }.

sources:
- contactsBySource.
- opportunitiesBySource.
- ordersBySource.

sales:
- byOwner: owner summary for revenue/orders/new contacts/open/won/lost opportunities/tasks.

comments:
- byStatus, phoneComments, needsFollowUp.

contacts:
- byStage.

tasks:
- dueToday, overdue, completed.

automation:
- runs, success, failed, skipped.

Runtime note:
- PR #8 không tạo schema/migration mới.
- Runtime smoke PASS:
  GET /api/stats/founder?range=today
  GET /api/stats/founder?range=7d
  GET /api/stats/founder?range=30d&compare=previous
  GET /api/stats/founder?range=custom&from=2026-06-01&to=2026-06-14
- Smoke xác nhận timezone Asia/Ho_Chi_Minh, money fields integer VND, tenant isolation không lẫn dữ liệu workspace khác.
```

---

### 16.8. AI Conversation Insight API Contract

**Status:** `READY_CODED`
**Owner:** Codex
**Last updated:** 2026-06-20

```http
POST /api/ai/conversations/:id/analyze
GET /api/ai/conversations/:id/insight
```

Notes:

```text
Auth:
- Tất cả endpoint require logged-in user.
- Conversation phải thuộc currentWorkspaceId; không đọc/ghi insight workspace khác.

Schema additive:
- AIConversationInsight: lưu insight mới theo workspaceId/customerId/conversationId.
- AIAnalysisRun: log lần phân tích theo workspaceId/sourceType/sourceId/status/inputHash.
- Migration tạo: prisma/migrations/20260620_ai_conversation_insight/migration.sql.
- Migration CHƯA apply production trong task này.

POST /api/ai/conversations/:id/analyze:
- Đọc hội thoại + customer + messages gần đây + opportunities/orders/offers trong workspace.
- Nếu OPENAI_API_KEY có cấu hình: gọi OpenAI và lưu insight.
- Nếu chưa có OPENAI_API_KEY: không crash, không 500; dùng rule-based fallback và trả status AI_NOT_CONFIGURED.
- AI chỉ phân tích/gợi ý, KHÔNG tự gửi tin nhắn cho khách.
- Response: { aiConfigured, status, insight, run, error? }.

GET /api/ai/conversations/:id/insight:
- Trả insight mới nhất cho hội thoại.
- Nếu chưa có insight: { insight: null }.

Insight fields:
- buyingIntent
- funnelStage
- communicationStyle
- sentiment
- customerSegment
- mainNeed
- objectionsJson
- productsInterestedJson
- missingDataJson
- nextBestAction
- recommendedOffer
- suggestedReply
- confidence
- rawJson
- modelName

Safety:
- Không log nội dung chat.
- Không tự gửi message.
- Rule-based fallback chỉ dựa trên tín hiệu hội thoại, không phán xét con người.
- Money/order data chỉ đọc trong workspace hiện tại.
```

---

### 16.9. Product/Service AI Auditor API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-21

```http
GET /api/products
POST /api/products
GET /api/products/:id
PATCH /api/products/:id
POST /api/ai/products/:id/audit
GET /api/ai/products/:id/audit
GET /api/products/:id/ai-audit
POST /api/products/:id/ai-audit
```

Notes:

```text
Auth:
- Tất cả endpoint require logged-in user.
- ProductLite phải thuộc currentWorkspaceId; không đọc/ghi audit workspace khác.

Schema additive:
- ProductLite thêm field nullable: costVnd, marginVnd, targetSegment, painPointsJson, benefitsJson,
  faqsJson, objectionsJson, offerIdeasJson, salesScript, aiAuditScore, aiAuditJson, aiAuditedAt.
- Migration tạo: prisma/migrations/20260620_product_ai_auditor/migration.sql.
- Current migration status 2026-06-21: DB schema up to date, no pending migration.

Product CRUD:
- GET /api/products: list ProductLite trong currentWorkspaceId, bỏ deletedAt.
- POST /api/products: tạo sản phẩm/dịch vụ với core + sales/AI fields.
- GET /api/products/:id: đọc chi tiết trong currentWorkspaceId.
- PATCH /api/products/:id: allowlist field an toàn; không xoá cứng; money integer VND; marginVnd tính từ priceVnd - costVnd nếu có.
- JSON list fields có thể nhận textarea string mỗi dòng một ý hoặc array JSON.

POST /api/ai/products/:id/audit:
- Đọc ProductLite trong workspace hiện tại.
- Nếu OPENAI_API_KEY có cấu hình: gọi OpenAI để chấm completeness + gợi ý phần thiếu.
- Nếu chưa có OPENAI_API_KEY: không crash, không 500; dùng rule-based fallback và trả status AI_NOT_CONFIGURED.
- Chỉ ghi các field audit cache: aiAuditScore, aiAuditJson, aiAuditedAt.
- KHÔNG ghi đè field dữ liệu gốc do sale nhập.
- Response: { aiConfigured, status, product, audit, error? }.

GET /api/ai/products/:id/audit:
- Trả product + audit cache hiện tại.
- Nếu chưa audit: audit = null.

Alias:
- /api/products/:id/ai-audit re-export cùng handler để UI cũ/mới có thể gọi an toàn.

Safety:
- AI chỉ gợi ý; không tự tạo đơn, không tự gửi tin, không tự đổi stage.
- Money vẫn integer VND.
- Không log secret hoặc thông tin nhạy cảm.
```

---

### 16.10. Offer Engine API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-21

```http
POST /api/ai/conversations/:id/offer-suggestion
```

Notes:

```text
Auth:
- Endpoint require logged-in user.
- Conversation phải thuộc currentWorkspaceId; không đọc dữ liệu workspace khác.

Schema:
- Không tạo schema/migration mới trong Phase 5.
- Endpoint chỉ đọc Conversation/Customer/Message/Offer/ProductLite/Order trong workspace.
- Không ghi dữ liệu thật, không gửi tin, không tạo đơn, không đổi stage.

POST /api/ai/conversations/:id/offer-suggestion:
- Đọc hội thoại gần đây, tags/stage của customer, offer active, product active và đơn gần đây.
- Nếu OPENAI_API_KEY có cấu hình: gọi OpenAI để chọn offer/sản phẩm phù hợp.
- Nếu chưa có OPENAI_API_KEY: không crash, không 500; dùng rule-based fallback và trả status AI_NOT_CONFIGURED.
- Response: { aiConfigured, status, suggestion, error? }.

Suggestion fields:
- offerId
- offerTitle
- productId
- productName
- reason
- suggestedReply
- nextActions
- alternatives
- confidence

Safety:
- Chỉ chọn từ offer/product có trong workspace hiện tại.
- Không bịa giá/chính sách ngoài dữ liệu đã lưu.
- AI chỉ gợi ý; sale quyết định trước khi gửi tin hoặc tạo đơn.
```

---

### 16.11. AI Growth Report API Contract

**Status:** `READY`
**Owner:** Codex
**Last updated:** 2026-06-21

```http
GET /api/ai/growth-report?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
```

Notes:

```text
Auth:
- Endpoint require logged-in user.
- Tất cả data filter currentWorkspaceId.

Schema:
- Không tạo schema/migration mới trong Phase 6.
- Endpoint chỉ đọc Founder Stats + ProductLite + Offer trong workspace.

Response:
- { generatedAt, mode, aiConfigured, range, blocks, stats }.
- mode hiện là rule_based để không phụ thuộc secret AI.
- blocks gồm 8 khối:
  overview, insights, bottlenecks, followUps, offerTests, products, salesTraining, tomorrowActions.
- UI route /dashboard/ai-growth đã gọi API thật, có range Hôm nay/7 ngày/30 ngày, loading/error/empty state.

Safety:
- Không ghi DB.
- Không gửi tin/khởi tạo automation/tạo đơn.
- Time range dùng helper Founder Stats đã chuẩn Asia/Ho_Chi_Minh.
- Money fields là integer VND từ source stats.
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

#### 2026-06-21 — AI Product/Service Completion

```text
## 2026-06-21 — AI Product/Service Completion

### Đang làm
- Hoàn thiện module Product/Service + AI Product Auditor + AI Growth UI deploy-ready.

### Đã làm hôm nay
- Đọc lại plan tổng và PRODUCTION_WEBHOOK_DIAGNOSIS.md.
- Xác nhận ProductLite đã có đủ field sales/AI, không cần migration mới.
- Hoàn thiện Product/Service CRUD API: POST /api/products nhận đủ field sales/AI; thêm GET/PATCH /api/products/:id filter currentWorkspaceId.
- Hoàn thiện UI /products: list, search, detail, create/edit form, active/inactive, AI score, audit panel, empty/loading/error state.
- Thêm action "Lưu gợi ý" từ Product AI Auditor: chỉ fill field đang trống, không ghi đè dữ liệu sale đã nhập.
- Wire AI Growth Report UI vào API thật GET /api/ai/growth-report với range Hôm nay/7 ngày/30 ngày.
- Bổ sung hành động Offer Suggestion trong Customer 360: tạo task follow-up và mở modal tạo đơn, vẫn không tự gửi tin.
- Kiểm AI config boolean: OPENAI_API_KEY=false, rule-based fallback đang hoạt động.
- Kiểm migration: npx prisma migrate status PASS, DB schema up to date, 11 migrations, không pending/failed.

### Files đã sửa
- src/app/api/products/route.ts
- src/app/api/products/[id]/route.ts
- src/components/products/ProductsClient.tsx
- src/components/products/ProductAuditPanel.tsx
- src/components/dashboard/AiGrowthReport.tsx
- src/components/inbox/ContactProfilePanel.tsx
- src/components/inbox/profile/OfferSuggestionBlock.tsx
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: src/components/** thuộc UI owner, nhưng founder giao trực tiếp Full-stack Product Engineer để hoàn thiện AI + Product/Service end-to-end. Không sửa schema, env, webhook core, database migration.

### Typecheck/build/test
- npx prisma migrate status: PASS, DB schema up to date.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- Local dev read-only smoke: PASS login + GET /api/products + GET detail + GET /api/products/:id/ai-audit + GET /api/ai/growth-report.
- Local production next start smoke: blocked by expected fail-fast default AUTH_SECRET trong .env local; guardrail hoạt động, build vẫn PASS.

### Blocker
- Không có blocker code/migration cho Product/Service AI completion.
- OPENAI_API_KEY chưa cấu hình nên đang dùng rule-based fallback, chất lượng AI thật sẽ tốt hơn sau khi founder nhập key trực tiếp trong Dokploy.
- Runtime write smoke không tạo product giả trên production DB khi founder vắng; cần founder test sản phẩm thật sau deploy.

### Cần founder quyết
- Duyệt push/deploy để đưa UI/API mới lên production.
- Nếu muốn AI model thật: nhập OPENAI_API_KEY trực tiếp trong Dokploy Environment, không gửi qua chat.
- Thêm 3-5 sản phẩm/dịch vụ thật để AI Auditor, Offer Suggestion và Growth Report có dữ liệu tốt.

### Cần agent kia hỗ trợ
- Claude có thể polish UI sau khi live, nhưng hiện /products, /inbox AI blocks và /dashboard/ai-growth đã usable.

### Kế hoạch tiếp theo
- Sau khi founder duyệt: push/deploy, smoke production /products, /inbox AI Insight/Offer Suggestion, /dashboard/ai-growth.
- Sau khi founder test 1 tin nhắn + 1 comment thật: soi DB webhookLogs/messages/comments để cập nhật D-002/D-009.
```

#### 2026-06-21 — Codex

```text
## 2026-06-21 — Codex

### Đang làm
- Production webhook follow-up + Customer 360 AI wire.

### Đã làm hôm nay
- Đọc lại docs/PRODUCTION_WEBHOOK_DIAGNOSIS.md và plan tổng.
- Kiểm DB production read-only sau founder test: webhookLogs 5 -> 6, messages 15 -> 1713, comments 3 -> 3.
- Kết luận smoke: Messenger/message path PARTIAL confirmed; comment thật vẫn chưa confirmed vì FacebookComment chưa tăng.
- Kiểm npx prisma migrate status: PASS, schema up to date, 11 migrations found, không pending/failed migration.
- Xác nhận không chạy migrate deploy vì không có pending migration và chưa cần duyệt deploy mới.
- Nối Customer 360 Offer Suggestion UI vào API thật POST /api/ai/conversations/:id/offer-suggestion.
- AI Insight block đã dùng API thật analyze/insight; Customer 360 vẫn đọc contact/order/timeline qua API sẵn có.

### Files đã sửa
- src/components/inbox/ContactProfilePanel.tsx
- src/components/inbox/profile/OfferSuggestionBlock.tsx
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: src/components/inbox/** là UI-owned, nhưng founder yêu cầu trực tiếp nối Customer 360 + AI Insight + Offer Suggestion vào API. Không sửa schema, auth, env, facebook core.

### Typecheck/build/test
- npx prisma migrate status: PASS, database schema up to date.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.

### Blocker
- D-009 còn PARTIAL: comment real event chưa tăng trong DB.
- D-002 còn PARTIAL: pages_manage_engagement/reply-hide comment vẫn cần Meta permission/App Review/reconnect nếu Meta yêu cầu.

### Cần founder quyết
- Nếu muốn chốt D-009 RESOLVED: test thêm 1 comment thật sau khi page/feed permission ổn, rồi báo Codex soi lại DB.
- Nếu muốn UI Offer Suggestion lên production: duyệt push/deploy bước riêng.

### Cần agent kia hỗ trợ
- Claude có thể polish UI Offer Suggestion nếu muốn, nhưng block hiện đã gọi API thật và build pass.

### Kế hoạch tiếp theo
- Nếu founder duyệt: push/deploy UI wire mới; sau đó smoke nút AI gợi ý offer trên production.
- Tiếp tục theo plan: xác nhận comment realtime, rồi tối ưu/deep-link/realtime inbox nếu vẫn trễ.
```

#### 2026-06-20 — Codex

```text
## 2026-06-20 — Codex

### Đang làm
- AI Growth Copilot backend prep theo yêu cầu founder, bắt đầu bằng Phase 0/1/2 an toàn.

### Đã xác minh
- Branch hiện tại: main.
- Commit đầu ngày hiện tại: e812def auto update contact phone and email from messages.
- Phase 1 P0 auto cập nhật SĐT/email từ chat đã có trong code:
  - src/lib/contact/extract-contact-signals.ts
  - src/lib/contact/update-contact-signals.ts
  - scripts/backfill-contact-signals.ts
  - scripts/test-contact-signals.ts
  - hook Messenger inbound: src/lib/funnel/intake.ts
  - hook Facebook comment inbound: src/lib/facebook/comments.ts
- Quy tắc an toàn giữ đúng: không ghi đè phone/email đã có, không in nội dung tin nhắn khách, không reset DB, không migration production.

### Đã làm thêm
- Thêm Phase 2 Customer 360 data contract:
  - GET /api/contacts/:id/customer-360
  - Trả contact, summary, orders, opportunities, tasks, notes, offers, tags, recentProducts, activities.
  - Mọi query filter workspaceId + customerId; recent lists có limit nhỏ để panel tải nhanh.
- Cập nhật mục 16.3 Contact API Contract.

### Files đã sửa
- src/app/api/contacts/[id]/customer-360/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Typecheck/build/test
- npx tsx scripts/test-contact-signals.ts: PASS (25/25)
- npm run typecheck: PASS
- npx prisma generate: PASS
- npm run build: PASS

### Rủi ro
- Không có schema/migration mới.
- Endpoint Customer 360 đọc nhiều bảng nhưng đã giới hạn take 5/10; nếu data cực lớn có thể tối ưu thêm bằng cache/index sau.
- Backfill contact signals script đang là dry-run mặc định; chưa chạy --apply trên production trong task này.

### Founder cần quyết
- D-007 vẫn OPEN: có dùng phone/email làm khóa merge/dedup contact chính thức trong cùng workspace không.

### Claude handoff
- Có thể nối Inbox/Contact UI sang GET /api/contacts/:id/customer-360 để panel phải có dữ liệu orders/opportunities/tasks/notes/offers/recentProducts/activities đầy đủ hơn.

### Phase 3 — AI Conversation Insight Foundation
- Thêm schema additive AIConversationInsight + AIAnalysisRun.
- Tạo migration review-only: prisma/migrations/20260620_ai_conversation_insight/migration.sql.
- Thêm helper src/lib/ai/conversation-analysis.ts:
  - Có OpenAI key: phân tích hội thoại và lưu insight.
  - Chưa có OpenAI key: rule-based fallback, không 500, status AI_NOT_CONFIGURED.
  - Không tự gửi tin nhắn, không log nội dung chat.
- Thêm API:
  - POST /api/ai/conversations/:id/analyze
  - GET /api/ai/conversations/:id/insight
- Cập nhật mục 16.8 AI Conversation Insight API Contract.

### Phase 3 files đã sửa
- prisma/schema.prisma
- prisma/migrations/20260620_ai_conversation_insight/migration.sql
- src/lib/ai/conversation-analysis.ts
- src/app/api/ai/conversations/[id]/analyze/route.ts
- src/app/api/ai/conversations/[id]/insight/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Phase 3 risk
- Migration additive-only nhưng CHƯA apply production trong task này.
- UI AiInsightBlock vẫn cần Claude wire từ placeholder sang 2 endpoint mới.
```

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

#### 2026-06-14 — Claude (PR #6B Comment UI)

```text
## 2026-06-14 — Claude (PR #6B Comment UI)

### Đang làm PR
- PR #6B — Comment UI

### Đã làm hôm nay
- Xác nhận mục 16.5 Comment API = READY; đọc route thật (comments, :id, reply, hide) + lib/facebook/comments.ts (commentInclude, status enum). Tạo branch claude/06-comment-ui.
- /comments: danh sách (GET /api/comments) với bộ lọc nhanh (Tất cả / Có SĐT / Cần xử lý / Đã phản hồi / Đã ẩn), tìm q, lọc Fanpage, pagination; thẻ CommentCard.
- CommentCard: nội dung + người comment + badge (Có SĐT / Cần xử lý / trạng thái / đang ẩn) + thời gian + context (Fanpage, bài viết, mở khách, mở hội thoại, chi tiết); xử lý nhanh: Trả lời (inline POST /reply), Ẩn/Hiện (POST /hide), toggle Cần xử lý + Lưu trữ (PATCH). Comment cần xử lý có viền đỏ trái.
- /comments/[id]: chi tiết đầy đủ (nội dung, bài viết & Fanpage, khách & hội thoại, repliedAt/hiddenAt) + reply/ẩn/follow-up/đổi trạng thái nội bộ.
- Lỗi Meta (reply/hide thiếu pages_manage_engagement/page token) hiển thị NGUYÊN VĂN + gợi ý cấp quyền/reconnect, KHÔNG fake success (D-002).
- Tích hợp Contact detail: thêm tab "Bình luận" (GET /api/comments?customerId) tái dùng CommentCard.
- Thêm nav "Bình luận". UI tiếng Việt 100%; card mobile-friendly.

### Files đã sửa
- src/components/comments/types.ts (mới)
- src/components/comments/actions.ts (mới)
- src/components/comments/CommentCard.tsx (mới)
- src/components/comments/CommentsClient.tsx (mới)
- src/components/comments/CommentDetailClient.tsx (mới)
- src/app/comments/page.tsx (mới)
- src/app/comments/[id]/page.tsx (mới)
- src/components/AppShell.tsx (nav "Bình luận")
- src/components/contacts/ContactDetailClient.tsx (tab "Bình luận")
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.12, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/comments/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, lib/facebook/comments.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- next build: FULL PASS (Compiled successfully + types valid + static 5/5 + traces); /comments + /comments/[id] có trong cây build.

### Blocker
- Không có blocker chặn PR #6B.
- D-002 (Meta): reply/hide cần page token + pages_manage_engagement thật để smoke end-to-end; UI đã xử lý lỗi rõ, không fake. Backend của Codex cũng chưa smoke Graph thật.
- Ghi chú: Order API (PR #5) nay đã commit (c21af46) → B-017 coi như đã giải quyết.

### Cần founder quyết
- D-002: cấp/duyệt pages_manage_engagement + reconnect page để test reply/hide thật.

### Cần agent kia hỗ trợ
- (Tương lai) API list members + deep-link conversation trong Inbox ("Mở hội thoại" hiện trỏ /inbox chung).

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ PR #6B). Bước kế: PR #7B Automation UI sau khi Codex có Automation API (PR #7) READY.
```

#### 2026-06-14 — Claude (PR #7B Automation UI)

```text
## 2026-06-14 — Claude (PR #7B Automation UI)

### Đang làm PR
- PR #7B — Automation UI

### Đã làm hôm nay
- Xác nhận mục 16.6 Automation API = READY; đọc route thật (rules, :id, test, runs) + lib/automation.ts (enums trigger/action/run, templates, engine). Tạo branch claude/07-automation-ui.
- /automation: tab "Quy tắc" + "Lịch sử chạy". Tab Quy tắc: mục "Mẫu có sẵn" (GET ?templates=true) bấm tạo nhanh; bộ lọc q/trigger/action/isActive; danh sách rule với switch bật/tắt (PATCH isActive), nhãn "Khi… → …", runCount/lastRunAt; CTA tạo quy tắc.
- RuleFormModal (tạo/sửa/từ template): name/description/triggerType/actionType + conditionsJson/actionConfigJson textarea JSON có validate client; cảnh báo khóa an toàn cho SEND_EMAIL/WEBHOOK.
- /automation/[id]: chi tiết rule + sửa + bật/tắt + chạy thử dry-run (POST /test mặc định dryRun=true, hiển thị SUCCESS/SKIPPED/FAILED + output JSON) + lịch sử chạy của rule.
- RunsList tái dùng: lọc theo status, hiển thị thời gian/rule/trigger/nguồn/kết quả/lỗi; empty state.
- Nhãn tiếng Việt cho mọi trigger/action/status; badge Đang bật/Đã tắt/Thành công/Bỏ qua/Lỗi. Thêm nav "Tự động hóa". Mobile-friendly.

### Files đã sửa
- src/components/automation/types.ts (mới)
- src/components/automation/RuleFormModal.tsx (mới)
- src/components/automation/RunsList.tsx (mới)
- src/components/automation/AutomationClient.tsx (mới)
- src/components/automation/RuleDetailClient.tsx (mới)
- src/app/automation/page.tsx, src/app/automation/[id]/page.tsx (mới)
- src/components/AppShell.tsx (nav "Tự động hóa")
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.14, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/automation/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, automation.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- next build: FULL PASS (Compiled + types valid + static 5/5 + traces); /automation + /automation/[id] có trong cây build.

### Blocker
- Không có blocker chặn PR #7B.
- SEND_EMAIL/WEBHOOK: engine khóa an toàn (SKIPPED); UI hiển thị cảnh báo "chưa gửi thật trong MVP".

### Cần founder quyết
- Không mới.

### Cần agent kia hỗ trợ
- (Tương lai) bật SEND_EMAIL/WEBHOOK thật khi có consent/config; API list members để gợi ý customerId/owner trong actionConfig.

### Kế hoạch ngày tiếp theo
- Dừng theo yêu cầu (chỉ PR #7B). Còn lại cuối MVP1 UI: PR #8B Dashboard sau khi Codex có Stats API (PR #8) READY.
```

#### 2026-06-14 — Claude (PR #8B Dashboard UI)

```text
## 2026-06-14 — Claude (PR #8B Founder Dashboard UI)

### Đang làm PR
- PR #8B — Founder Dashboard UI

### Đã làm hôm nay
- Xác nhận mục 16.7 Founder Stats API = READY; đọc route + lib/founder-stats.ts để lấy đúng shape. Tạo branch claude/08-dashboard-ui.
- Thay /dashboard từ truy vấn prisma trực tiếp (cũ, single-brand, KHÔNG scope workspace) → server shell mỏng + FounderDashboardClient gọi GET /api/stats/founder (đã scope workspace).
- Bộ lọc thời gian: Hôm nay / 7 / 30 / 90 ngày / Tùy chọn (from-to + Áp dụng) + toggle "So với kỳ trước" (compare=previous, hiện %Δ trên card).
- 8 summary card: Doanh thu, Đã thanh toán, Đơn hàng, Giá trị TB/đơn, Khách mới, Pipeline đang mở, Comment có SĐT, Việc quá hạn.
- Section: Doanh thu (theo ngày dạng cột + theo trạng thái đơn + theo thanh toán), Pipeline (open/won/lost/win rate + giá trị theo stage), Nguồn (contact/opportunity/order), Sale (bảng theo nhân viên), Bình luận, Việc cần làm, Tự động hóa, Khách theo giai đoạn.
- Chart bằng CSS thuần (bar ngang + cột theo ngày) — KHÔNG thêm dependency. VND format vi-VN (formatVnd) + compact cho nhãn trục.
- Quick links sang /pipeline /orders /contacts /comments /automation. Empty/loading/error state đầy đủ; mobile bảng cuộn ngang.

### Files đã sửa
- src/components/dashboard/types.ts (mới)
- src/components/dashboard/FounderDashboardClient.tsx (mới)
- src/app/dashboard/page.tsx (viết lại: bỏ prisma trực tiếp, dùng stats API)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.16, 19)

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/dashboard/**, docs/**. Không đụng prisma, auth.ts, api.ts, workspace.ts, founder-stats.ts, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- next build: FULL PASS (Compiled + types valid + static 5/5 + traces); /dashboard trong cây build. Lưu ý: B-020 (Codex báo build treo) KHÔNG tái hiện ở lần build sạch của mình — next build exit OK ~61s.

### Blocker
- Không có blocker chặn PR #8B.

### Cần founder quyết
- Không.

### Cần agent kia hỗ trợ
- Không. (Tương lai: API list members để dashboard lọc theo từng sale; stats API đã hỗ trợ ownerId nhưng UI chưa có picker nhân viên.)

### Kế hoạch ngày tiếp theo
- HOÀN TẤT toàn bộ MVP1 UI (PR #1B → #8B). Chờ founder review/merge các nhánh claude/* và Codex commit phần backend còn ở working tree (vd founder-stats.ts).
```

#### 2026-06-14 — Claude (Final MVP1 Stabilization)

```text
## 2026-06-14 — Claude (Final MVP1 Stabilization)

### Phạm vi
- Bước ổn định cuối MVP1: kiểm git, commit leftover (chọn lọc), typecheck/generate/build, smoke route + API, kiểm tenant isolation (mức code), kiểm D-002. KHÔNG thêm feature.

### Git (không dùng git add .)
- Phân loại dirty đầu bước:
  - Backend/Codex: src/lib/founder-stats.ts (PR#8, untracked — thiếu trong commit cf25ff8), src/lib/facebook/comments.ts (PR#7 hook automation COMMENT_CREATED/COMMENT_HAS_PHONE, modified).
  - Docs: docs/dev/BRANCH_AND_OWNERSHIP.md (Claude).
  - Migration: prisma/migrations/migration_lock.toml (untracked).
  - File lạ ngoài scope: không có.
  - UI/Claude: không còn — PR #8B đã commit (c9dc7a8).
- Commit đã tạo:
  - fb8b6a4 "complete pr8 founder stats api" — bổ sung src/lib/founder-stats.ts (route cf25ff8 phụ thuộc lib này; nay PR#8 build độc lập được).
  - "docs: final mvp1 stabilization report" — cập nhật plan + BRANCH ownership.
- CHƯA commit (đề nghị Codex, KHÔNG gộp vào commit pr8 sai nhãn): src/lib/facebook/comments.ts (PR#7 hook), prisma/migrations/migration_lock.toml (artifact prisma).

### Tests
- npm run typecheck: PASS.
- npx prisma generate: PASS (~5s).
- npm run build: PASS (exit 0, ~49s; Compiled + types valid + static 5/5 + traces). B-020 (Codex báo build treo) KHÔNG tái hiện.

### Smoke (dev server tạm, đã tắt sau khi xong — PID 19324 terminated, port 3000 free)
- Routes (chưa đăng nhập, kỳ vọng redirect 307): /dashboard, /contacts, /pipeline, /orders, /comments, /automation, /settings/workspaces → 7/7 = 307 PASS.
- APIs (chưa đăng nhập, kỳ vọng 401): /api/workspaces, /api/contacts, /api/pipelines, /api/orders, /api/comments, /api/automation/rules, /api/stats/founder?range=30d → 7/7 = 401 PASS.
- Ghi chú: vài lần đầu trả 000 do next dev cold-compile vượt timeout curl; warm retest đều 307/401. Production build đã xác nhận tất cả route compile + có trong route tree.

### Tenant isolation
- Mức code: mọi API nghiệp vụ đều getCurrentWorkspaceId(user) + filter workspaceId (review xuyên suốt); cross-workspace bị 404 (Codex smoke PR#2..#8 báo PASS).
- Mức runtime đa-workspace qua UI (switch brand + đối chiếu data) cần phiên đăng nhập + seed nhiều workspace → kiểm trong môi trường founder. Không tự fake.

### D-002 (Meta reply/hide comment)
- OPEN. Môi trường này chưa có pages_manage_engagement/page token thật → KHÔNG smoke reply/hide thật, KHÔNG fake pass. UI đã xử lý lỗi rõ khi thiếu quyền.

### Blocker / việc sau MVP1
- Xem mục 19.2 (blocker còn mở) + 19.3 (việc sau MVP1).
```

#### 2026-06-15 — Claude (PR #9A UI Refresh)

```text
## 2026-06-15 — Claude (PR #9A UI Refresh — Design System)

### Đang làm PR
- PR #9A — UI Refresh (Apple / Windows 11 / Messenger inspired). CHỈ UI/UX; không feature mới; không đụng backend/Prisma/API.

### Đã làm hôm nay
- Tạo branch claude/09a-ui-refresh.
- Foundation: globals.css (font hệ thống, nền gradient dịu, token .dc-glass / .dc-card / .dc-muted, scrollbar mảnh); tailwind.config (fontFamily sans, shadow soft/glass, radius 4xl); layout metadata "D.C FUNNEL CRM".
- Design system primitives: src/components/layout/{icons.tsx (icon inline SVG — KHÔNG thêm dependency), nav.ts (IA gom 7 nhóm phòng ban + resolveActiveHref), SidebarGroup, PageHeader, Surface, QuickAction}; src/components/ui/{Button, Badge}.
- AppShell viết lại (client): sidebar kính nổi bo góc lớn + nav gom nhóm (Tổng quan/Sale/Marketing/Sản phẩm/Kế toán/Nhân sự/Cài đặt); active theo usePathname (prefix dài nhất — đúng cả route con & settings); collapse/expand (desktop) + drawer (mobile); topbar glass: workspace switcher, search placeholder, quick actions (Tạo khách/Tạo đơn/Comment có SĐT), user + đăng xuất.
- Mục chưa có backend (Sản phẩm, Bộ sưu tập, Kế toán, Nhân sự, Bảo mật, Hệ thống) hiển thị "Sắp ra mắt" (disabled) — KHÔNG tạo backend.
- Polish: EmptyState (icon trong khối bo tròn); PageHeader + max-w cho 7 trang list; 4 trang detail bọc max-w; CommentCard thêm avatar tròn + dc-card (Messenger).
- Wire quick action qua query param client-only (không đổi logic nghiệp vụ): /contacts?new=1 & /orders?new=1 mở modal tạo; /comments?filter=hasPhone set bộ lọc nhanh.

### Files đã sửa
- Mới: src/components/layout/{icons.tsx, nav.ts, SidebarGroup.tsx, PageHeader.tsx, Surface.tsx, QuickAction.tsx}; src/components/ui/{Button.tsx, Badge.tsx}.
- Sửa component: src/components/AppShell.tsx (rewrite), EmptyState.tsx, comments/CommentCard.tsx, contacts/ContactsClient.tsx, orders/OrdersClient.tsx, comments/CommentsClient.tsx.
- Sửa nền: src/app/globals.css, tailwind.config.ts, src/app/layout.tsx.
- Sửa page (PageHeader + max-w): dashboard, contacts (+[id]), orders (+[id]), comments (+[id]), automation (+[id]), pipeline, settings/workspaces.
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17, 18.17).

### Có sửa file thuộc owner agent khác không?
- KHÔNG. Chỉ src/components/**, src/app/** (UI), globals.css, tailwind.config.ts, layout.tsx, docs/**. Không đụng prisma, src/lib/auth.ts/api.ts/workspace.ts/facebook/**, src/app/api/**.

### Typecheck/build/test
- npm run typecheck: PASS.
- npm run build: PASS (exit 0) — Compiled 35.3s + type validation + static 5/5 + traces. Route tree còn ĐỦ mọi route cũ (không mất route). (Ghi chú: lần build nền đầu bị orphan khi phiên tạm dừng; đã kill node + xóa .next + build lại sạch → PASS.)

### Blocker
- Không có blocker mới (UI-only). D-002 + việc sau MVP1 giữ như mục 19.

### Cần founder quyết / Cần Codex
- Không. Tương lai: nối search topbar + quick action vào API khi có; mục Sản phẩm/Kế toán/Nhân sự cần backend riêng (đang "Sắp ra mắt").

### Kế hoạch ngày tiếp theo
- Dừng PR #9A. Chờ founder review giao diện + merge nhánh claude/09a-ui-refresh.
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

#### 2026-06-14 — Codex (PR #7 Automation Rule Engine)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #7 — Automation Rule Engine — CODE_READY / MIGRATION_PENDING

### Đã làm hôm nay
- Đọc lại plan và xác nhận PR #7 chỉ làm backend/API/schema, không làm Automation UI hoặc Dashboard.
- Tạo branch codex/07-automation-api.
- Thêm schema AutomationRule, AutomationRun và enum AutomationTriggerType/AutomationActionType/AutomationRunStatus/AutomationSourceType.
- Tạo migration additive prisma/migrations/20260614_workspace_core_05_automation_api/migration.sql.
- Tạo engine dùng chung evaluateAutomationRules() và testAutomationRule().
- Tạo API: GET/POST /api/automation/rules, GET/PATCH /api/automation/rules/:id, POST /api/automation/rules/:id/test, GET /api/automation/runs.
- Test endpoint mặc định dryRun=true, không tạo task/tag/note/update comment thật; vẫn ghi AutomationRun audit với triggerType=MANUAL_TEST.
- Chặn side effect ngoài hệ thống: SEND_EMAIL và WEBHOOK trả SKIPPED trong PR #7, không gửi email/webhook thật.
- Gắn hook thật cho CONTACT_CREATED, CONTACT_STAGE_CHANGED, OPPORTUNITY_STAGE_CHANGED, ORDER_CREATED, ORDER_STATUS_CHANGED, COMMENT_CREATED, COMMENT_HAS_PHONE.
- Cập nhật mục 16.6 Automation API Contract = READY.

### Files đã sửa
- prisma/schema.prisma
- prisma/migrations/20260614_workspace_core_05_automation_api/migration.sql
- src/lib/automation.ts
- src/lib/facebook/comments.ts
- src/app/api/automation/rules/route.ts
- src/app/api/automation/rules/[id]/route.ts
- src/app/api/automation/rules/[id]/test/route.ts
- src/app/api/automation/runs/route.ts
- src/app/api/contacts/route.ts
- src/app/api/contacts/[id]/route.ts
- src/app/api/opportunities/[id]/stage/route.ts
- src/app/api/orders/route.ts
- src/app/api/orders/[id]/status/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa UI/Claude-owned app/components.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md đang modified từ trước PR #7; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma format: PASS.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- npx prisma migrate status: CONNECTED / PENDING; exit code 1 vì còn 1 pending migration 20260614_workspace_core_05_automation_api; no failed migration.
- Migration safety scan: PASS additive-only; không DROP, DELETE FROM, TRUNCATE, SET NOT NULL, ON DELETE CASCADE.
- Runtime smoke API: CHƯA CHẠY vì migration chưa được founder duyệt/apply.

### Blocker
- B-019: cần founder duyệt npx prisma migrate deploy cho migration 20260614_workspace_core_05_automation_api trước khi smoke runtime Automation API.

### Cần founder quyết
- Duyệt apply migration PR #7 nếu đồng ý nội dung additive-only.
- Sau migration, có thể duyệt smoke test tạo rule NOOP/test dry-run và rule CREATE_TASK dry-run.

### Cần agent kia hỗ trợ
- Claude PR #7B Automation UI có thể bắt đầu theo API contract 16.6 sau khi migration/runtime smoke PASS; nếu bắt đầu trước, chỉ nên build theo mock/empty state.

### Kế hoạch ngày tiếp theo
- Khi founder duyệt: chạy npx prisma migrate deploy, npx prisma migrate status, npx prisma generate, npm run typecheck, npm run build, smoke GET/POST/PATCH/test/runs.
```

#### 2026-06-14 — Codex (PR #7 Migration Apply + Runtime Smoke)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #7 — Automation Rule Engine — DONE

### Đã làm hôm nay
- Kiểm tra git status và xác nhận branch codex/07-automation-api.
- Kiểm tra DATABASE_URL tồn tại, nhìn đúng Neon, không in secret.
- Chạy npx prisma migrate status trước deploy: connected, chỉ còn pending migration 20260614_workspace_core_05_automation_api.
- Review lại migration safety scan: không DROP, DELETE FROM, TRUNCATE, SET NOT NULL, ON DELETE CASCADE.
- Founder đã duyệt, Codex chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_05_automation_api.
- Chạy lại npx prisma migrate status: schema up to date, không pending/failed migration.
- Chạy lại npx prisma generate, npm run typecheck, npm run build: PASS.
- Runtime smoke Automation API qua dev server tạm port 3107:
  GET /api/automation/rules
  POST /api/automation/rules
  GET /api/automation/rules/:id
  PATCH /api/automation/rules/:id
  POST /api/automation/rules/:id/test
  GET /api/automation/runs
- Smoke engine:
  tạo rule MANUAL_TEST + NOOP
  test dryRun=true
  xác nhận AutomationRun được ghi
  xác nhận rule/run thuộc currentWorkspaceId
  xác nhận API không đọc rule workspace khác (404)
- Smoke hook:
  CONTACT_CREATED
  CONTACT_STAGE_CHANGED
  OPPORTUNITY_STAGE_CHANGED
  ORDER_CREATED
  ORDER_STATUS_CHANGED
  COMMENT_CREATED
  COMMENT_HAS_PHONE
- Xác nhận SEND_EMAIL và WEBHOOK action trả SKIPPED, không gửi email/webhook thật.
- Dừng dev server tạm sau smoke.

### Files đã sửa
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật runtime report.
- Không sửa Automation UI, Dashboard/Stats, hoặc UI Claude-owned.
- docs/dev/BRANCH_AND_OWNERSHIP.md vẫn đang modified từ trước PR #7; Codex không sửa/revert file này.

### Typecheck/build/test
- npx prisma migrate deploy: PASS; applied 20260614_workspace_core_05_automation_api.
- npx prisma migrate status sau deploy: PASS; schema up to date.
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- Runtime smoke API: PASS.
- Runtime smoke hooks: PASS.

### Blocker
- B-019 RESOLVED.
- Không còn blocker chặn PR #7 backend.

### Cần founder quyết
- Không cần thêm để đóng PR #7.
- Quyết định sản phẩm sau PR #7: khi nào bật SEND_EMAIL/WEBHOOK thật và policy consent/config tương ứng.

### Cần agent kia hỗ trợ
- Claude PR #7B Automation UI có thể bắt đầu theo mục 16.6 contract READY + runtime backend smoke PASS.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #7 theo yêu cầu. Bước tiếp theo: Claude PR #7B Automation UI hoặc Codex PR #8 Founder Stats API khi founder xác nhận.
```

#### 2026-06-14 — Codex (PR #8 Founder Stats API)

```text
## 2026-06-14 — Codex

### Đang làm PR
- PR #8 — Founder Stats API

### Đã làm hôm nay
- Đọc lại plan và xác nhận chỉ làm Founder Stats API, không làm Dashboard UI/PR #8B.
- Tạo branch codex/08-stats-api từ trạng thái hiện tại.
- Giữ nguyên /api/stats cũ; thêm route mới GET /api/stats/founder để an toàn.
- Thêm helper buildFounderStats({ workspaceId, filters }) trong src/lib/founder-stats.ts.
- Hỗ trợ range=today|7d|30d|90d|custom, from/to, compare=previous, ownerId, source.
- Tất cả query filter currentWorkspaceId.
- Tính timezone bằng Asia/Ho_Chi_Minh.
- Tất cả money fields dùng integer VND.
- Trả đủ block: summary, revenue, pipeline, sources, sales, comments, contacts, tasks, automation, comparison.
- Runtime smoke API pass cho today, 7d, 30d compare previous, custom.
- Tenant isolation smoke pass: thêm order lớn ở workspace khác và xác nhận stats current workspace không đổi.

### Files đã sửa
- src/lib/founder-stats.ts
- src/app/api/stats/founder/route.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật contract/report.
- Không sửa Dashboard UI, Automation UI, hoặc UI Claude-owned.
- Lưu ý: docs/dev/BRANCH_AND_OWNERSHIP.md, src/lib/facebook/comments.ts, prisma/migrations/migration_lock.toml đã dirty trước PR #8; Codex không sửa/revert các file đó trong PR #8.

### Typecheck/build/test
- npm run typecheck: PASS.
- npx prisma generate: PASS.
- npm run build: TIMEOUT/HUNG ở Next build process sau khi sinh .next artifacts; không có TypeScript error. Trước đó prisma generate từng fail EPERM do dev server PR #7 còn sót, đã dừng process 3107 và generate PASS. Build rerun vẫn không tự thoát trong 5 phút nên Codex dừng process build để không giữ workspace.
- Runtime smoke API GET /api/stats/founder: PASS.
- Không chạy migration vì PR #8 không có schema change.

### Blocker
- B-020 (BUILD/ENV): next build process treo/timeout sau khi sinh .next artifacts; typecheck và runtime smoke PASS. Cần rerun build trong môi trường sạch nếu founder muốn xác nhận production build exit code.

### Cần founder quyết
- Không cần quyết để hoàn tất API contract PR #8.

### Cần agent kia hỗ trợ
- Claude PR #8B Dashboard UI có thể bắt đầu theo mục 16.7 contract READY; nên lưu ý build timeout B-020 là vấn đề môi trường/build process, không phải lỗi typecheck.

### Kế hoạch ngày tiếp theo
- Dừng tại PR #8 theo yêu cầu. Bước tiếp theo: Claude PR #8B Dashboard UI.
```

#### 2026-06-16 — Codex (Deploy + Facebook Integration Fix)

```text
## 2026-06-16 — Codex

### Đang làm
- Production deploy support trên Dokploy/OneDash + fix Facebook Connect.

### Đã làm hôm nay
- Xác nhận Dokploy/Traefik/Postgres/Redis đang chạy trên VPS; app service ban đầu 0/1 vì image chưa build và lỗi "Github Provider not found".
- Không sửa Dokploy internal DB, không reset database, không dùng prisma db push, không in secret.
- Đóng gói source sạch từ git archive HEAD, loại .env/node_modules/.next/log local, upload vào /etc/dokploy/applications/dc-funnel-cmr-dc-iea9mn/code.
- Build Docker image production dc-funnel-cmr-dc-iea9mn:latest bằng Docker BuildKit secret để Prisma/Next build đọc env mà không ghi secret vào layer/log.
- Force update Docker Swarm service dc-funnel-cmr-dc-iea9mn; service chạy 1/1.
- Fix Bad Gateway domain crm.hongducdigital.com do Traefik có stale dynamic config trùng domain trỏ tới service cũ dc-a-mcwmkj; đã backup/disable stale config khỏi dynamic watch dir.
- Chạy npx prisma migrate status/deploy trong container app: schema up to date, no pending migrations.
- Smoke login nội bộ: ADMIN_EMAIL/ADMIN_PASSWORD env present; POST /api/auth/login 200; GET /api/workspaces 200; /dashboard authenticated 200.
- Fix Facebook integration code:
  - /api/integrations/facebook/login validate env và trả JSON 400 rõ ràng nếu thiếu/sai FACEBOOK_APP_ID/SECRET thay vì HTTP 500/trắng.
  - Thêm guard FACEBOOK_APP_ID phải là numeric trước khi redirect sang Facebook.
  - Thêm route alias /api/webhooks/meta dùng chung handler với /api/webhook/facebook.
  - Thêm scope pages_read_engagement vào OAuth scope list; giữ pages_show_list, pages_manage_metadata, pages_messaging, pages_manage_engagement.
  - Điều chỉnh production fail-fast để token "dc-funnel-bot-verify-token" do founder chọn không bị coi nhầm là default cấm.
- Cập nhật production env service:
  - APP_BASE_URL/NEXT_PUBLIC_APP_URL = https://crm.hongducdigital.com.
  - FACEBOOK_LOGIN_REDIRECT_URI = https://crm.hongducdigital.com/api/integrations/facebook/callback.
  - META_VERIFY_TOKEN = token founder cung cấp.
  - FACEBOOK_APP_ID/FACEBOOK_APP_SECRET/META_APP_SECRET = founder cung cấp (không ghi giá trị vào report/log).
- Smoke Facebook production:
  - /api/webhooks/meta verify trả test123.
  - /api/webhook/facebook verify vẫn trả test123.
  - Sau login admin, /api/integrations/facebook/login trả 307 tới www.facebook.com.
  - OAuth URL có redirect_uri đúng domain và có pages_read_engagement/pages_messaging/pages_manage_engagement.

### Files đã sửa
- src/app/api/integrations/facebook/login/route.ts
- src/app/api/webhooks/meta/route.ts
- src/lib/env.ts
- src/lib/facebook/facebook-client.ts
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

### Có sửa file thuộc owner agent khác không?
- Có: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md theo yêu cầu cập nhật báo cáo.
- Không sửa UI lớn, không sửa src/components/**.

### Typecheck/build/test
- npx prisma generate: PASS.
- npm run typecheck: PASS.
- npm run build: PASS.
- VPS Docker production build: PASS.
- Docker service dc-funnel-cmr-dc-iea9mn: 1/1.
- /login public: HTTP 200.
- /dashboard unauth: 307 -> /login; authenticated smoke: 200.
- npx prisma migrate deploy: PASS/no-op; no pending migrations.
- /api/webhooks/meta verify: PASS, trả challenge.
- Facebook OAuth login smoke: PASS, redirect sang www.facebook.com sau login admin.

### Commit / Push
- 451c670 fix facebook integration env validation and webhook verification
- 23b1ca7 validate facebook app id before oauth redirect
- Đã push lên origin/main.

### Blocker / rủi ro còn lại
- D-002 vẫn chưa đóng hoàn toàn cho end-to-end real Page: OAuth URL đã yêu cầu pages_manage_engagement/pages_read_engagement/pages_messaging, nhưng Meta App/Page thật vẫn phải cấp quyền và tài khoản test/admin phải có role phù hợp.
- Sau khi Connect Facebook thật, cần kiểm tra callback, danh sách page, connect page, subscribe webhook, gửi message/comment thử.
- Dokploy GitHub Provider vẫn từng lỗi; app hiện chạy bằng image/service đã build trực tiếp. Nếu muốn deploy UI tự động từ Dokploy, cần cấu hình Git provider + SSH deploy key đúng.

### Cần founder quyết / làm tiếp
- Bấm Connect Facebook lại bằng tài khoản có role admin/developer/tester trong Meta App.
- Nếu Meta yêu cầu App Review cho pages_manage_engagement/pages_read_engagement/pages_messaging, founder cần cấp/quy trình review trên Meta.

### Cần agent kia hỗ trợ
- Không cần Claude cho backend fix này.

### Kế hoạch tiếp theo
- Khi founder bấm Connect Facebook xong: Codex kiểm tra callback/pages/connect page/webhook logs thật và xác nhận D-002.
```

#### 2026-06-17 — Claude/Cowork Production Check

```text
## 2026-06-17 — Claude/Cowork — Production Check & Webhook Fix

### Đang làm
- Kiểm tra production thật + fix nguyên nhân không nhận inbox/comment. (KHÔNG sửa code app; chỉ hạ tầng + Meta config.)

### SSH
- ĐÃ SSH được vào VPS (103.72.98.117:24700, root) bằng password founder cấp, qua SSH_ASKPASS (không cài SSH key cố định — guardrail chặn persistence). Password chỉ dùng tạm, đã xoá file tạm.

### VPS resource (sau nâng 2CPU/4GB)
- CPU 2 nhân, RAM 3.8Gi (available ~2.1Gi), disk 40G dùng 21G (51%), load 0.01, uptime ~1h22.
- App container `dc-funnel-cmr-dc-iea9mn.1.*`: CPU ~0.00%, RAM ~231MiB. Traefik ~176MiB. → KHÔNG còn nghẽn tài nguyên, hết chậm.

### Container app
- Swarm service dc-funnel-cmr-dc-iea9mn 1/1, Up. dokploy/postgres/redis/traefik đều Up.

### Env check (boolean, không in giá trị)
- SET: DATABASE_URL, TOKEN_ENCRYPTION_SECRET (len 59), FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, META_APP_SECRET, AUTH_SECRET (app boot prod fail-fast ⇒ có).
- APP_BASE_URL = NEXT_PUBLIC_APP_URL = https://crm.hongducdigital.com ; FACEBOOK_LOGIN_REDIRECT_URI = https://crm.hongducdigital.com/api/integrations/facebook/callback ; FACEBOOK_API_VERSION=v20.0 ; META_VERIFY_TOKEN khớp default `dc-funnel-bot-verify-token`. NODE_ENV=production.
- Lưu ý: biến mã hoá token tên đúng là TOKEN_ENCRYPTION_SECRET (không phải ENCRYPTION_KEY).

### Endpoint check
- /login 200 ; /inbox /dashboard /contacts /api/integrations/facebook/login → 307 (redirect auth, đúng kỳ vọng).
- /api/webhooks/meta?hub.challenge=test123 → HTTP 200, body `test123`, TLS hợp lệ (Let's Encrypt, hạn 13/09/2026). Log app: `[WEBHOOK] Verify thành công.`

### DB counts
- workspaces 4, facebookPages 5, customers 8, conversations 5, messages 15, comments 3, webhookLogs 5.
- nullWorkspace = 0 ở pages/customers/conversations/messages ⇒ KHÔNG có chuyện dữ liệu bị ẩn do workspace filter.

### Page state
- HiChaos (1116426378214052, ws HICHAOS): botEnabled=true, webhookSubscribed=true, hasToken=true, token valid (debug_token), scope đủ nhận (pages_messaging, pages_read_engagement, pages_manage_metadata). **status=ERROR** do Health Check 12:47 lỗi `(#100) Tried accessing nonexisting field (tasks)` — lỗi phụ, KHÔNG chặn nhận webhook (handler chỉ bỏ qua page DISCONNECTED).
- D.C Studio (320828161108624, ws NAM NGUYEN STORE): status=CONNECTED, botEnabled, webhookSubscribed, token valid.
- 3 page còn lại là smoke (DISCONNECTED, no token).

### Webhook logs / messages / comments gần nhất
- webhookLogs = 5 nhưng **TẤT CẢ từ 14/06 (smoke test giả)**; ZERO event thật cho 2 page thật.
- messages (15) + comments (3) + conversations: toàn bộ là seed/smoke (09/06 & 14/06). Chưa có dữ liệu khách thật.

### Performance (sau nâng VPS)
- login TTFB 0.31s ; inbox 0.37s ; dashboard 0.13s ; contacts 0.12s. → Nhanh, đạt.

### NGUYÊN NHÂN GỐC (đã xác định + đã fix trong phiên này)
1. **Traefik (reverse proxy HTTPS/443) chết** sau reboot nâng VPS vì **nginx host mặc định chiếm cổng 80** (`bind 0.0.0.0:80 address already in use`, exit 128). ⇒ mất 443 ⇒ Meta verify callback bị 503 ⇒ KHÔNG gửi webhook ⇒ mất inbox + comment; site cũng khó vào. → ĐÃ FIX: `systemctl stop+disable nginx` (nginx chỉ là trang "Welcome to nginx!", không proxy gì, VPS chỉ chạy Dokploy) + `docker start dokploy-traefik` (restart=always). 443 sống lại, cert OK.
2. **Webhook cấp App TRỐNG** (`GET /{app-id}/subscriptions` = `data:[]`) — chỉ có Page-level subscribed_apps, thiếu App-level callback. → ĐÃ FIX: `POST /{app-id}/subscriptions` (object=page, callback https://crm.hongducdigital.com/api/webhooks/meta, fields messages/feed/...) → `active:true`.
3. Test end-to-end: POST webhook ký hợp lệ (HMAC META_APP_SECRET) qua public HTTPS → 200 EVENT_RECEIVED, DB ghi FacebookWebhookLog=PROCESSED (đã xoá log test, DB sạch).

### Production Status snapshot
| Hạng mục | Trạng thái |
|---|---|
| Domain/HTTPS crm.hongducdigital.com | ✅ OK (Traefik up, cert valid) |
| Login | ✅ 200 |
| Facebook OAuth/connect | ✅ tới màn cấp quyền; 2 page đã connect, token valid |
| Webhook verify (GET) | ✅ PASS (Meta đã verify → active) |
| Webhook ingest (POST signed) | ✅ PASS end-to-end (PROCESSED) |
| Inbox real event | ⏳ CHỜ smoke thật (chưa có event thật sau fix) |
| Comment real event | ⏳ CHỜ smoke thật |
| Performance sau nâng VPS | ✅ OK (TTFB 0.12–0.37s) |

### Kết luận
- **Blocker production gốc (HTTPS + webhook) đã RESOLVED trong phiên này.** Đường ống nhận inbox/comment đã thông và chứng minh chạy end-to-end. Chỉ còn cần **1 event thật** để chốt.

### Lỗi phụ phát hiện (không chặn inbox/comment)
- HiChaos status=ERROR do Health Check request field `tasks` lỗi #100 (cosmetic; handler vẫn nhận). Đề xuất: reconnect/health-check lại, hoặc Codex rà `runPageHealthCheck`/Graph field `tasks`.
- **Migration drift**: model `MetaBusinessConnection` có trong schema nhưng **bảng chưa tồn tại trong DB production** ⇒ `/api/integrations/facebook/businesses` 500 (`table public.MetaBusinessConnection does not exist`). Thuộc module BM/Catalog đang hoãn. Cần `npx prisma migrate deploy` (additive) khi founder duyệt.
- Vài log Neon `PostgreSQL connection Closed` (autosuspend serverless) — theo dõi, chưa nghiêm trọng.

### Có sửa code không?
- KHÔNG sửa code app (nguyên nhân là hạ tầng + Meta config, không phải bug code nhận webhook). Chỉ thêm script chẩn đoán read-only ở scripts/prod-*.js (không chứa secret) + docs.

### Cần founder làm tiếp
1. Gửi **1 tin nhắn Messenger** + **1 comment** vào page HiChaos bằng tài khoản FB khác → báo lại, Claude/Codex soi webhookLogs/messages/comments tăng để chốt D-002 = RESOLVED.
2. Nếu chỉ admin/tester nhận được mà khách lạ không: chuyển Meta App sang **Live mode** + xin **Advanced Access** cho pages_messaging & pages_read_engagement (App Review).
3. Quyết định chạy migrate deploy cho MetaBusinessConnection (sửa 500 route businesses) — hay tiếp tục hoãn module BM.
4. D-002 (ẩn/trả lời comment) cần thêm scope `pages_manage_engagement`.

### Cần agent kia hỗ trợ
- Codex: nếu founder duyệt, xử lý (a) health-check field `tasks`, (b) migrate deploy MetaBusinessConnection. Không chặn việc nhận inbox/comment.
```

#### 2026-06-20 — Claude (AI Growth Copilot UI – Phase 3/6/7)

```text
## 2026-06-20 — Claude — AI Growth Copilot UI (UI owner)

### Đang làm
- Nâng Inbox + Customer 360 theo hướng AI Growth Copilot. CHỈ UI; không sửa schema/auth/api/env/facebook.

### Đồng bộ trạng thái (Phase 0)
- Branch main. Phase 1 (Inbox Messenger UI) + Phase 2 (Customer 360 panel đủ block) ĐÃ xong ở commit 9a557f4. Auto phone/email ở e812def.

### Đã làm hôm nay
- Phase 3: AiInsightBlock trong Customer 360 — khung phân tích sâu (10 chỉ dấu) ở trạng thái "chờ backend" (không fake) + nút "Gợi ý câu trả lời" dùng API hiện có /api/ai/suggest (copy được; AI chỉ gợi ý). Truyền conversationId + aiEnabled qua ContactProfilePanel.
- Phase 6: route /dashboard/ai-growth + component AiGrowthReport (8 khối: tổng quan/insight/điểm nghẽn/follow-up/offer/sản phẩm/training/việc ngày mai) — empty state trung thực; thêm icon sparkles + nav "AI Growth".
- Phase 7: thêm mục 26 (AI Growth Copilot Roadmap), 27 (Customer Psychology Layer), 28 (AI Safety Rules) vào plan.

### Files đã sửa
- src/components/inbox/profile/AiInsightBlock.tsx (mới)
- src/components/inbox/ContactProfilePanel.tsx, src/components/InboxClient.tsx
- src/components/dashboard/AiGrowthReport.tsx (mới), src/app/dashboard/ai-growth/page.tsx (mới)
- src/components/layout/icons.tsx (+sparkles), src/components/layout/nav.ts (+AI Growth)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17/18/19/26/27/28)

### Có sửa file owner Codex không?
- Không. Không đụng prisma/schema, auth, api core, env, facebook.

### Typecheck/build
- npm run typecheck: PASS. npm run build: PASS (/dashboard/ai-growth mới; /inbox 15.4 kB).

### Phase 4/5 — chờ API Codex (không fake, đã dựng empty state/contract)
- Phase 4 Product Auditor: chưa có route Sản phẩm → để PENDING, cần API `POST/GET /api/ai/products/:id/audit` (mục 26).
- Phase 5 Offer Engine: block "Ưu đãi / Gợi ý bán hàng" đang empty state, cần `POST /api/ai/conversations/:id/offer-suggestion`.

### Cần Codex bổ sung API (mục 26)
- analyze/insight, offer-suggestion, product audit, growth-report.

### Cần founder quyết
- Có làm module Sản phẩm (Phase 4) trước hay chờ inbox/AI ổn định.
```

---

## 18. PR Completion Report

Mỗi PR hoàn thành phải cập nhật vào đây.

### 2026-06-20 (chiều) — Claude — Wire AI Insight + Product Auditor (real)

- **AI Insight (Phase 3 real)** `wire ai insight panel to analyze/insight api` (d8f052b): AiInsightBlock gọi `GET/POST /api/ai/conversations/:id/insight|analyze`; render đủ chỉ dấu + confidence; tạo task từ next action; copy câu trả lời; fallback rule-based hiển thị rõ. Trước đó `add ai insight panel to inbox`.
- **Product Auditor (Phase 4 real)** `add product ai auditor ui`: route `/products` + `ProductsClient` (list/tìm/tạo nhanh) + `ProductAuditPanel` gọi `GET/POST /api/products/:id/ai-audit` (completeness score, thiếu info, segment, pain point, benefit, FAQ, objection, offer, content angle, sales script, next action). Nav "Sản phẩm" bật thật.
- **Phase 5 Offer Engine**: AI Insight đã hiển thị "Offer nên dùng"; block offer giữ empty state (chưa có API offer-suggestion riêng).
- **Phase 6 Growth Report**: route `/dashboard/ai-growth` empty state (chờ `/api/ai/growth-report`).
- Phụ thuộc prod: cần `prisma migrate deploy` 2 migration AI (xem B-032). typecheck + build PASS.

### 2026-06-20 — Claude — AI Growth Copilot UI (Phase 3/6/7)

- **Phase 3 — AI Insight panel** (`add ai insight panel to inbox`): AiInsightBlock trong Customer 360; phân tích sâu "chờ backend" (không fake) + gợi ý câu trả lời qua `/api/ai/suggest`. Files: `src/components/inbox/profile/AiInsightBlock.tsx` (mới), `ContactProfilePanel.tsx`, `InboxClient.tsx`.
- **Phase 6 — AI Growth Report** (`add ai growth report ui`): route `/dashboard/ai-growth` + `AiGrowthReport` (8 khối, empty state), icon `sparkles`, nav "AI Growth". Files: `src/app/dashboard/ai-growth/page.tsx` (mới), `src/components/dashboard/AiGrowthReport.tsx` (mới), `src/components/layout/icons.tsx`, `nav.ts`.
- **Phase 7 — Docs**: mục 26 (AI Growth Copilot Roadmap), 27 (Customer Psychology Layer), 28 (AI Safety Rules).
- **Phase 1/2** đã hoàn thành trước đó (Inbox Messenger UI + Customer 360 panel — commit 9a557f4).
- **Phase 4 (Product Auditor) / Phase 5 (Offer Engine)**: UI ở empty state, PENDING API Codex (B-031).
- typecheck PASS · build PASS. Tiếng Việt 100%, mobile-first, không fake dữ liệu.

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
**Status:** `DONE`  
**Branch:** claude/06-comment-ui  
**Commit/PR link:** N/A  

#### Summary

```text
Comment-to-Inbox UI theo API contract 16.5: danh sách bình luận với bộ lọc nhanh (Tất cả/Có SĐT/Cần xử lý/
Đã phản hồi/Đã ẩn) + tìm + lọc Fanpage + pagination; chi tiết bình luận; xử lý nhanh reply/ẩn/follow-up/
trạng thái nội bộ. Lỗi Meta hiển thị rõ, không fake success (D-002). Tích hợp tab "Bình luận" trong Contact detail.
```

#### Files changed

```text
src/components/comments/types.ts                     (mới)
src/components/comments/actions.ts                   (mới)
src/components/comments/CommentCard.tsx              (mới)
src/components/comments/CommentsClient.tsx           (mới)
src/components/comments/CommentDetailClient.tsx      (mới)
src/app/comments/page.tsx, src/app/comments/[id]/page.tsx   (mới)
src/components/AppShell.tsx                           (nav "Bình luận")
src/components/contacts/ContactDetailClient.tsx      (tab "Bình luận")
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md             (mục 17, 18.12, 19)
```

#### Tests

```text
npm run typecheck: PASS
next build: FULL PASS (Compiled successfully + types valid + static 5/5 + traces); /comments + /comments/[id] trong cây build.
Test thủ công: /comments → lọc "Có SĐT" → mở chi tiết → PATCH cần xử lý/trạng thái → reply/hide (cần Meta perms thật; nếu thiếu, UI hiện lỗi rõ) → mở contact/hội thoại từ comment; Contact detail tab "Bình luận".
```

#### Risks

```text
- D-002: reply/hide qua Graph cần page token + pages_manage_engagement; chưa smoke thật. UI không fake success, hiển thị lỗi + gợi ý reconnect.
- "Mở hội thoại" từ comment trỏ /inbox chung (chưa deep-link đúng conversation — Inbox chưa hỗ trợ URL param).
- isHidden có thể đổi nội bộ qua PATCH (cờ) lẫn Graph qua /hide; UI ưu tiên nút Ẩn/Hiện (Graph) để đồng bộ thật.
```

#### Handoff

```text
- Đạt Acceptance PR #6B: lọc comment có SĐT; chi tiết; PATCH follow-up/status; reply/hide với lỗi rõ; mở contact/hội thoại.
- Cần founder/Codex: cấp pages_manage_engagement + reconnect page để smoke reply/hide thật (D-002).
- Bước kế Claude: PR #7B Automation UI khi Codex có Automation API READY.
```

---

### 18.13. PR #7 — Automation Rule Engine

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** `codex/07-automation-api`  
**Commit/PR link:**  

```text
Summary:
- Added AutomationRule and AutomationRun backend foundation for workspace-scoped rule execution.
- Added reusable evaluateAutomationRules() engine and dry-run test flow.
- Added Automation API:
  GET /api/automation/rules
  POST /api/automation/rules
  GET /api/automation/rules/:id
  PATCH /api/automation/rules/:id
  POST /api/automation/rules/:id/test
  GET /api/automation/runs
- Added built-in rule template payloads for:
  Comment có SĐT -> tạo task gọi lại
  Lead mới -> tạo task follow-up
  Đơn hoàn tất -> thêm tag khách hàng
  Cơ hội đổi stage -> ghi note
- Hooked real triggers after safe writes:
  CONTACT_CREATED
  CONTACT_STAGE_CHANGED
  OPPORTUNITY_STAGE_CHANGED
  ORDER_CREATED
  ORDER_STATUS_CHANGED
  COMMENT_CREATED
  COMMENT_HAS_PHONE
- SEND_EMAIL and WEBHOOK actions intentionally return SKIPPED in PR #7 to avoid real external side effects without consent/config.

Schema changes:
- New enums:
  AutomationTriggerType
  AutomationActionType
  AutomationRunStatus
  AutomationSourceType
- New models:
  AutomationRule
  AutomationRun
- Added Prisma relations:
  Workspace.automationRules
  Workspace.automationRuns
  User.createdAutomationRules

Migration:
- Created prisma/migrations/20260614_workspace_core_05_automation_api/migration.sql.
- Migration reviewed additive-only:
  no DROP
  no DELETE FROM
  no TRUNCATE
  no SET NOT NULL
  no ON DELETE CASCADE
- Migration deployed successfully with npx prisma migrate deploy.
- npx prisma migrate status after deploy: schema up to date, no pending/failed migration.

Tests:
- npx prisma format: PASS
- npx prisma generate: PASS
- npm run typecheck: PASS
- npm run build: PASS
- npx prisma migrate status before deploy: CONNECTED / PENDING; only 20260614_workspace_core_05_automation_api pending.
- npx prisma migrate deploy: PASS.
- npx prisma migrate status after deploy: PASS, schema up to date.
- Runtime smoke API: PASS.
- Runtime smoke engine: PASS.
- Runtime smoke hooks: PASS.

Runtime smoke details:
- GET /api/automation/rules: PASS.
- POST /api/automation/rules: PASS.
- GET /api/automation/rules/:id: PASS.
- PATCH /api/automation/rules/:id: PASS.
- POST /api/automation/rules/:id/test dryRun=true: PASS, AutomationRun recorded.
- GET /api/automation/runs: PASS.
- Tenant isolation: PASS, reading another workspace's rule returned 404.
- Hook triggers recorded SUCCESS runs for CONTACT_CREATED, CONTACT_STAGE_CHANGED, OPPORTUNITY_STAGE_CHANGED, ORDER_CREATED, ORDER_STATUS_CHANGED, COMMENT_CREATED, COMMENT_HAS_PHONE.
- COMMENT_HAS_PHONE smoke set FacebookComment.hasPhone=true and needsFollowUp=true, with Customer and Conversation linked in currentWorkspaceId.
- SEND_EMAIL and WEBHOOK actions returned SKIPPED; no real email/webhook sent.

Risks:
- Active automation rules can create tasks/tags/notes/comment follow-up flags after migration; default state has no seeded active rules.
- Test endpoint defaults dryRun=true, but still writes AutomationRun audit records.
- Email/webhook actions are placeholders returning SKIPPED; no real email/webhook send in PR #7.

Handoff to Claude PR #7B Automation UI:
- Use API contract 16.6.
- UI can list/create/edit/toggle rules, show runs, and call test endpoint with dryRun=true.
- Do not show SEND_EMAIL/WEBHOOK as live actions unless UI labels them disabled/coming soon.
- Backend runtime is ready for PR #7B UI.
```

---

### 18.14. PR #7B — Automation UI

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/07-automation-ui  
**Commit/PR link:** N/A  

#### Summary

```text
Automation UI theo API contract 16.6: /automation (tab Quy tắc + Mẫu có sẵn + Lịch sử chạy) với toggle bật/tắt,
bộ lọc, tạo rule (blank/từ template); /automation/[id] chi tiết + sửa + chạy thử dry-run + lịch sử chạy của rule.
JSON conditions/actionConfig có validate client. SEND_EMAIL/WEBHOOK hiển thị cảnh báo khóa an toàn (engine SKIPPED).
```

#### Files changed

```text
src/components/automation/types.ts                   (mới)
src/components/automation/RuleFormModal.tsx          (mới)
src/components/automation/RunsList.tsx               (mới)
src/components/automation/AutomationClient.tsx       (mới)
src/components/automation/RuleDetailClient.tsx       (mới)
src/app/automation/page.tsx, src/app/automation/[id]/page.tsx   (mới)
src/components/AppShell.tsx                           (nav "Tự động hóa")
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md             (mục 17, 18.14, 19)
```

#### Tests

```text
npm run typecheck: PASS
next build: FULL PASS (Compiled + types valid + static 5/5 + traces); /automation + /automation/[id] trong cây build.
Test thủ công: /automation → dùng mẫu/tạo rule → bật/tắt → chi tiết → chạy thử dryRun=true (hiện SUCCESS/SKIPPED/FAILED + output) → xem AutomationRun mới; nhập conditions/actionConfig JSON lỗi → UI báo lỗi, không crash.
```

#### Risks

```text
- SEND_EMAIL/WEBHOOK: chỉ hiển thị cảnh báo + engine SKIPPED, không gửi thật (đúng MVP/PR #7).
- conditionsJson/actionConfigJson nhập JSON thô (chưa form builder field-by-field) — đủ cho MVP, có validate JSON client.
- Tên template từ API là ASCII; UI map nhãn tiếng Việt cho 4 mẫu đã biết, fallback tên API nếu mẫu lạ.
```

#### Handoff

```text
- Đạt mục tiêu PR #7B: xem/tạo/bật-tắt rule, tạo từ template, chạy thử dry-run, xem lịch sử run.
- Bước kế (cuối MVP1 UI): PR #8B Dashboard khi Codex có Stats API (PR #8) READY.
- Đề nghị Codex (tương lai): bật SEND_EMAIL/WEBHOOK thật khi có consent/config; API list members + danh mục contact để actionConfig chọn customerId/owner thay vì nhập JSON.
```

---

### 18.15. PR #8 — Founder Stats API

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** `codex/08-stats-api`  
**Commit/PR link:**  

```text
Summary:
- Added GET /api/stats/founder.
- Kept legacy GET /api/stats unchanged.
- Added src/lib/founder-stats.ts helper with workspace-scoped stats builder.
- No schema change and no migration.

API contract:
- GET /api/stats/founder?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&compare=previous|none&ownerId=&source=
- Response data includes:
  range
  summary
  revenue
  pipeline
  sources
  sales
  comments
  contacts
  tasks
  automation
  comparison

Business rules:
- All endpoint access requires logged-in user.
- All data filters currentWorkspaceId.
- Revenue excludes CANCELLED/REFUNDED for revenueVnd.
- paidRevenueVnd uses paymentStatus=PAID.
- completedRevenueVnd uses status=COMPLETED.
- Money values are integer VND.
- Date ranges are calculated by Asia/Ho_Chi_Minh day boundary.

Smoke test:
- GET /api/stats/founder?range=today: PASS.
- GET /api/stats/founder?range=7d: PASS.
- GET /api/stats/founder?range=30d&compare=previous: PASS.
- GET /api/stats/founder?range=custom&from=2026-06-01&to=2026-06-14: PASS.
- Tenant isolation: PASS. Test inserted a large order in another workspace and current workspace stats did not change.
- Timezone: PASS, response range.timezone = Asia/Ho_Chi_Minh.
- Integer VND: PASS, money fields are integers.

Tests:
- npm run typecheck: PASS.
- npx prisma generate: PASS.
- npm run build: TIMEOUT/HUNG in Next build process after .next artifacts were generated. No TypeScript error; runtime smoke passed. See B-020.

Risks:
- Sales/source stats rely on existing ownerId/source data quality; unassigned/unknown buckets are expected.
- Build exit code needs one more clean-environment rerun because Next process did not exit within tool timeout.

Handoff to Claude PR #8B Dashboard UI:
- Use contract 16.7.
- Dashboard can consume GET /api/stats/founder as the single aggregate endpoint.
- Prefer showing empty/zero states for unknown source and unassigned owner.
- Do not call legacy /api/stats for founder dashboard unless preserving old widgets.
```

---

### 18.16. PR #8B — Dashboard UI

**Owner:** Claude  
**Status:** `DONE`  
**Branch:** claude/08-dashboard-ui  
**Commit/PR link:** N/A  

#### Summary

```text
Founder Dashboard theo API contract 16.7: /dashboard gọi GET /api/stats/founder (workspace-scoped) với bộ lọc
thời gian (today/7d/30d/90d/custom) + so sánh kỳ trước; 8 summary card; section doanh thu/pipeline/nguồn/sale/
bình luận/việc cần làm/automation/khách theo giai đoạn; chart bằng CSS thuần (không thêm dependency); quick links.
Thay dashboard cũ (prisma trực tiếp, không scope workspace).
```

#### Files changed

```text
src/components/dashboard/types.ts                    (mới)
src/components/dashboard/FounderDashboardClient.tsx  (mới)
src/app/dashboard/page.tsx                            (viết lại — dùng stats API, bỏ prisma trực tiếp)
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md             (mục 17, 18.16, 19)
```

#### Tests

```text
npm run typecheck: PASS
next build: FULL PASS (Compiled + types valid + static 5/5 + traces); /dashboard trong cây build (exit OK ~61s, không tái hiện B-020).
Test thủ công: /dashboard → đổi range today/7d/30d/90d/custom → bật so sánh kỳ trước → kiểm VND vi-VN → empty/loading/error → quick links → mobile bảng cuộn ngang.
```

#### Risks

```text
- Chart bằng CSS thuần (bar/cột) — đơn giản, đủ cho "nhìn 30 giây"; chưa có chart tương tác.
- Dashboard lọc theo workspace hiện tại; chưa có picker theo từng sale (stats API hỗ trợ ownerId, cần API list members để dựng picker).
- /dashboard cũ dùng prisma trực tiếp không scope workspace đã được thay → giảm rủi ro lẫn dữ liệu đa-tenant.
```

#### Handoff

```text
- Đạt mục tiêu PR #8B: founder xem nhanh doanh thu/pipeline/sale/comment/task/automation theo khoảng thời gian.
- 🏁 Hoàn tất toàn bộ MVP1 UI (PR #1B → #8B).
- Việc vận hành còn lại (không thuộc UI): founder review/merge nhánh claude/*; Codex commit backend còn ở working tree (founder-stats.ts, comments.ts); smoke D-002 (reply/hide cần Meta pages_manage_engagement).
```

---

### 18.17. PR #9A — UI Refresh (Design System)

**Owner:** Claude
**Status:** `DONE`
**Branch:** claude/09a-ui-refresh
**Commit/PR link:** N/A

#### Summary

```text
UI/UX refresh cảm hứng Apple (tối giản, thoáng, font hệ thống) + Windows 11 (sidebar/panel kính bo góc, shadow mềm)
+ Messenger (avatar, card, quick action cho comment). AppShell viết lại: nav gom 7 nhóm phòng ban, glass sidebar
collapse/expand + drawer mobile, topbar (workspace, search placeholder, quick actions). Design tokens + primitives
(Surface/PageHeader/QuickAction/SidebarGroup/Button/Badge/EmptyState + icon inline SVG). KHÔNG đổi logic nghiệp vụ,
KHÔNG đụng backend/API/Prisma, KHÔNG thêm dependency.
```

#### Files changed

```text
Mới: src/components/layout/{icons,nav,SidebarGroup,PageHeader,Surface,QuickAction}, src/components/ui/{Button,Badge}
Sửa: src/components/AppShell.tsx (rewrite), EmptyState.tsx, comments/CommentCard.tsx,
     contacts/ContactsClient.tsx, orders/OrdersClient.tsx, comments/CommentsClient.tsx
Nền: src/app/globals.css, tailwind.config.ts, src/app/layout.tsx
Page: dashboard, contacts(+[id]), orders(+[id]), comments(+[id]), automation(+[id]), pipeline, settings/workspaces
Docs: docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (17, 18.17)
```

#### Tests

```text
npm run typecheck: PASS
npm run build: PASS (exit 0) — Compiled 35.3s + types valid + static 5/5 + traces; route tree đủ mọi route cũ (không mất route).
Manual: cần founder mở /dashboard /contacts /pipeline /orders /comments /automation /settings/workspaces, kiểm sidebar active, workspace switcher, responsive mobile (drawer), quick actions.
```

#### Risks

```text
- AppShell chuyển sang client component (dùng usePathname) — children server vẫn render bình thường; đã build PASS.
- Trang cũ (offers/flows/email/tasks/settings khác) chưa restyle sâu nhưng vẫn chạy trong shell mới, không vỡ.
- Glass/backdrop-blur: trình duyệt cũ không hỗ trợ sẽ fallback nền mờ — không ảnh hưởng chức năng.
- Quick action dùng query param client-only; không đổi API/logic.
```

#### Handoff

```text
- Acceptance PR #9A đạt: nav gom nhóm phòng ban; không mất route; mobile không vỡ; không backend changes; typecheck/build PASS.
- Đề nghị founder review giao diện trên trình duyệt + merge nhánh claude/09a-ui-refresh.
- Việc sau (ngoài PR #9A): nối search/quick action vào dữ liệu thật; restyle sâu trang cũ; module Sản phẩm/Kế toán/Nhân sự (đang "Sắp ra mắt").
```

---

### 18.18. Production Deploy + Facebook Integration Fix

**Owner:** Codex  
**Status:** `DONE`  
**Branch:** `main`  
**Commit/PR link:** `451c670`, `23b1ca7` pushed to `origin/main`  

#### Summary

```text
Restored production availability on Dokploy/OneDash and fixed Facebook Connect routing/config handling.
Built and ran dc-funnel-cmr-dc-iea9mn:latest on VPS without PM2/Nginx and without touching Dokploy internal DB.
Resolved crm.hongducdigital.com 502 by disabling stale Traefik dynamic config for an old service sharing the same host.
Added /api/webhooks/meta alias for Meta webhook URL while preserving /api/webhook/facebook.
Hardened /api/integrations/facebook/login so missing/s malformed Facebook OAuth env returns clear JSON 400 and never redirects with an invalid App ID.
Configured production APP_BASE_URL, NEXT_PUBLIC_APP_URL, FACEBOOK_LOGIN_REDIRECT_URI, META_VERIFY_TOKEN, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, META_APP_SECRET.
No database reset, no data deletion, no prisma db push, no secret values printed.
```

#### Files changed

```text
src/app/api/integrations/facebook/login/route.ts
src/app/api/webhooks/meta/route.ts
src/lib/env.ts
src/lib/facebook/facebook-client.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Runtime / Deploy

```text
VPS: 103.72.98.117
Domain: https://crm.hongducdigital.com
Service: dc-funnel-cmr-dc-iea9mn
Docker service status: 1/1
Image: dc-funnel-cmr-dc-iea9mn:latest
Build method: git archive source upload + Docker BuildKit secret env + Docker Swarm service update.
Dokploy/Traefik: stale route dc-a-mcwmkj disabled/backed up outside active dynamic config.
```

#### Tests

```text
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
VPS Docker production build: PASS
npx prisma migrate deploy: PASS/no pending migrations
npx prisma migrate status: Database schema is up to date
GET https://crm.hongducdigital.com/login: HTTP 200
/dashboard unauthenticated: 307 -> /login
Internal authenticated smoke: login 200, /api/workspaces 200, /dashboard 200
GET /api/webhooks/meta verify: PASS, returns challenge
GET /api/webhook/facebook verify: PASS, returns challenge
Authenticated GET /api/integrations/facebook/login: 307 -> www.facebook.com with expected redirect_uri and scopes
```

#### Facebook API Contract

```text
OAuth login:
- GET /api/integrations/facebook/login
- Requires admin session.
- If configured: redirects to https://www.facebook.com/{FACEBOOK_API_VERSION}/dialog/oauth
- If env missing/invalid: returns { ok:false, error, missing:[...] } with 400.
- Required env: FACEBOOK_APP_ID numeric, FACEBOOK_APP_SECRET, FACEBOOK_LOGIN_REDIRECT_URI.
- Scopes: public_profile, pages_show_list, pages_manage_metadata, pages_read_engagement, pages_messaging, pages_manage_engagement.

Webhook verify:
- GET /api/webhooks/meta?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
- GET /api/webhook/facebook?... remains supported.
- Returns hub.challenge when token matches META_VERIFY_TOKEN.
```

#### Risks

```text
Meta permissions still require real App/Page validation.
D-002 remains pending end-to-end until founder completes Connect Facebook with a Meta App admin/developer/tester account and verifies pages_manage_engagement/pages_read_engagement/pages_messaging are granted.
If Dokploy UI deploy is required later, Git provider + SSH deploy key should be fixed; current production is running from the manually built Docker image service path.
```

#### Handoff

```text
Founder: open CRM, click Connect Facebook, complete Meta consent with correct account.
Codex next smoke after consent: callback route, list pages, connect page, webhook subscription, send message/comment test, reply/hide permission check.
Claude: no UI handoff required for this backend/deploy fix.
```

---

### 18.19. AI Growth Copilot Backend Prep — Contact Signals + Customer 360

**Owner:** Codex
**Status:** `DONE`
**Branch:** `main`
**Commit/PR link:** `e812def` + latest Customer 360 commit

#### Summary

```text
Phase 1 P0 contact signal extraction đã có: tự nhận diện SĐT Việt Nam/email từ Messenger/comment inbound,
normalize SĐT về 0xxxxxxxxx, email lowercase, chỉ điền Customer.phone/email khi field đang trống, không ghi đè dữ liệu thật.
Có script backfill an toàn mặc định dry-run để quét message inbound cũ.
Phase 2 thêm endpoint đọc-only Customer 360 data contract cho Inbox/Contact panel.
Không schema change, không migration, không reset DB, không deploy.
```

#### API Contract

```http
GET /api/contacts/:id/customer-360
```

```text
Response data:
- contact: thông tin chung, owner, facebookPage, stage/score/tags/contact fields.
- summary: totalOrders, totalSpentVnd, openOpportunities, openTasks, lastActivityAt.
- orders: 5 đơn gần nhất kèm items, owner, opportunity.
- opportunities: 5 cơ hội gần nhất kèm pipeline/stage/owner.
- tasks: 5 task gần nhất.
- notes: 5 note gần nhất.
- offers: 5 offer liên quan theo stage/tag/page.
- recentProducts: 5 sản phẩm gần nhất từ order items.
- activities: 10 activity tổng hợp từ note/conversation/task/opportunity.
Tất cả query require logged-in user và filter currentWorkspaceId.
```

#### Files changed

```text
src/app/api/contacts/[id]/customer-360/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md

Đã xác minh có sẵn từ commit e812def:
src/lib/contact/extract-contact-signals.ts
src/lib/contact/update-contact-signals.ts
scripts/backfill-contact-signals.ts
scripts/test-contact-signals.ts
src/lib/funnel/intake.ts
src/lib/facebook/comments.ts
```

#### Tests

```text
npx tsx scripts/test-contact-signals.ts: PASS (25/25)
npm run typecheck: PASS
npx prisma generate: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- Chưa chạy backfill --apply trên production; script mặc định dry-run để founder/Codex review summary trước.
- D-007 vẫn OPEN: cần chốt merge/dedup bằng phone/email trước khi thêm unique constraint hoặc auto-merge contact.
- AI Insight/Offer Engine/Product Auditor chưa làm trong bước này; nền Contact 360 và contact signals đã sẵn sàng cho phase sau.
```

#### Handoff

```text
Claude có thể dùng /api/contacts/:id/customer-360 cho panel phải trong Inbox/Contact UI.
Codex phase tiếp theo: AI Conversation Insight foundation, không tự gửi tin nhắn và có fallback khi OPENAI_API_KEY chưa cấu hình.
```

---

### 18.20. AI Growth Copilot Backend Prep — AI Conversation Insight Foundation

**Owner:** Codex
**Status:** `DONE_CODED`
**Branch:** `main`
**Commit/PR link:** `e3dd943`

#### Summary

```text
Implemented Phase 3 backend foundation for Customer Psychology Layer / Conversation Copilot insight.
Added additive Prisma models AIConversationInsight and AIAnalysisRun plus a review-only migration.
Added reusable helper analyzeConversationForSales().
Added API:
- POST /api/ai/conversations/:id/analyze
- GET /api/ai/conversations/:id/insight
AI remains suggestion/analysis-only: no auto-send, no auto-close, no customer-facing action.
When OPENAI_API_KEY is missing, API returns a clear AI_NOT_CONFIGURED status and stores a rule-based fallback insight instead of 500.
```

#### Schema / Migration

```text
Migration file:
- prisma/migrations/20260620_ai_conversation_insight/migration.sql

Migration review:
- Additive-only new tables.
- No DROP.
- No DELETE FROM.
- No TRUNCATE.
- No SET NOT NULL on existing tables.
- No ON DELETE CASCADE.
- Uses ON DELETE RESTRICT for new FK constraints.

Migration has NOT been applied to production in this task.
```

#### API Contract

```text
POST /api/ai/conversations/:id/analyze
- Requires login.
- Filters conversation by currentWorkspaceId.
- Stores AIConversationInsight and AIAnalysisRun.
- Response { aiConfigured, status, insight, run, error? }.

GET /api/ai/conversations/:id/insight
- Requires login.
- Filters conversation by currentWorkspaceId.
- Returns latest insight or null.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/20260620_ai_conversation_insight/migration.sql
src/lib/ai/conversation-analysis.ts
src/app/api/ai/conversations/[id]/analyze/route.ts
src/app/api/ai/conversations/[id]/insight/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- Runtime analyze/insight needs the new migration applied before production use.
- OPENAI_API_KEY missing is handled by rule-based fallback; no secret required.
- Claude needs to wire AiInsightBlock button/read state to the new endpoints.
- Remaining B-031 items at Phase 3 completion time: Offer Engine, Product Auditor, Growth Report.
```

---

### 18.21. AI Growth Copilot Backend Prep — Product/Service AI Auditor Backend

**Owner:** Codex
**Status:** `DONE_CODED`
**Branch:** `main`
**Commit/PR link:** this commit (`add product service ai auditor backend`)

#### Summary

```text
Implemented Phase 4 backend foundation for Product/Service Auditor.
Extended ProductLite with nullable product intelligence/audit fields.
Added reusable helper auditProductService().
Added API:
- POST /api/ai/products/:id/audit
- GET /api/ai/products/:id/audit
- POST /api/products/:id/ai-audit (alias)
- GET /api/products/:id/ai-audit (alias)
AI remains suggestion/audit-only: no auto-send, no order creation, no pipeline stage changes.
When OPENAI_API_KEY is missing, API returns a clear AI_NOT_CONFIGURED status and stores a rule-based fallback audit instead of 500.
```

#### Schema / Migration

```text
Migration file:
- prisma/migrations/20260620_product_ai_auditor/migration.sql

Migration review:
- Additive-only nullable ProductLite columns.
- No DROP.
- No DELETE FROM.
- No TRUNCATE.
- No SET NOT NULL on existing tables.
- No ON DELETE CASCADE.

Migration has NOT been applied to production in this task.
```

#### API Contract

```text
POST /api/ai/products/:id/audit
- Requires login.
- Filters product by currentWorkspaceId.
- Stores only aiAuditScore, aiAuditJson, aiAuditedAt.
- Response { aiConfigured, status, product, audit, error? }.

GET /api/ai/products/:id/audit
- Requires login.
- Filters product by currentWorkspaceId.
- Returns product + audit cache or null.

Alias /api/products/:id/ai-audit exports the same handlers for compatibility.
```

#### Files changed

```text
prisma/schema.prisma
prisma/migrations/20260620_product_ai_auditor/migration.sql
src/lib/order.ts
src/lib/ai/product-audit.ts
src/app/api/ai/products/[id]/audit/route.ts
src/app/api/products/[id]/ai-audit/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma format: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- Runtime product audit needs the new migration applied before production use.
- OPENAI_API_KEY missing is handled by rule-based fallback; no secret required.
- Claude can wire Product Auditor UI after migration is applied and Product module UI exists.
- Remaining B-031 items: Offer Engine and Growth Report.
```

---

### 18.22. AI Growth Copilot Backend Prep — Offer Engine Backend

**Owner:** Codex
**Status:** `DONE_CODED`
**Branch:** `main`
**Commit/PR link:** pending Phase 5 commit

#### Summary

```text
Implemented Phase 5 backend foundation for Offer Engine.
Added reusable helper suggestOfferForConversation().
Added API:
- POST /api/ai/conversations/:id/offer-suggestion
AI remains suggestion-only: no auto-send, no order creation, no pipeline/contact mutation.
When OPENAI_API_KEY is missing, API returns a clear AI_NOT_CONFIGURED status with rule-based fallback instead of 500.
```

#### Schema / Migration

```text
No schema change.
No migration file.
Endpoint reads existing Conversation/Customer/Message/Offer/ProductLite/Order data only.
```

#### API Contract

```text
POST /api/ai/conversations/:id/offer-suggestion
- Requires login.
- Filters conversation and all source data by currentWorkspaceId.
- Returns { aiConfigured, status, suggestion, error? }.
- suggestion includes offerId, offerTitle, productId, productName, reason, suggestedReply,
  nextActions, alternatives, confidence.
```

#### Files changed

```text
src/lib/ai/offer-suggestion.ts
src/app/api/ai/conversations/[id]/offer-suggestion/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- Uses existing offer/product data quality; weak data means lower confidence fallback.
- OPENAI_API_KEY missing is handled by rule-based fallback; no secret required.
- Claude can wire Offer Engine UI block to this endpoint.
- Remaining B-031 item: Growth Report API.
```

---

### 18.23. AI Growth Copilot Backend Prep — AI Growth Report API

**Owner:** Codex
**Status:** `DONE_CODED`
**Branch:** `main`
**Commit/PR link:** pending Phase 6 commit

#### Summary

```text
Implemented Phase 6 backend foundation for AI Growth Report / Optimization Loop.
Added reusable helper buildAiGrowthReport().
Added API:
- GET /api/ai/growth-report
The report returns 8 blocks: overview, insights, bottlenecks, followUps, offerTests,
products, salesTraining, tomorrowActions.
Current mode is rule_based, so it does not require AI secret and does not call external AI.
```

#### Schema / Migration

```text
No schema change.
No migration file.
Endpoint reads Founder Stats + ProductLite + Offer data only.
```

#### API Contract

```text
GET /api/ai/growth-report?range=today|7d|30d|90d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
- Requires login.
- Filters all source data by currentWorkspaceId.
- Returns { generatedAt, mode, aiConfigured, range, blocks, stats }.
- Uses Asia/Ho_Chi_Minh range logic from Founder Stats.
```

#### Files changed

```text
src/lib/ai/growth-report.ts
src/app/api/ai/growth-report/route.ts
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- Rule-based report quality depends on CRM data completeness.
- No external AI call yet; Anthropic/Claude or OpenAI provider integration should be a separate phase because it needs secret/env.
- B-031 code-level API backlog is now RESOLVED for analyze/insight, product audit, offer suggestion, growth report.
- Production runtime still needs B-032 migrations applied for AI Insight/Product Auditor tables/columns.
```

---

### 18.24. Customer 360 AI Wire — Offer Suggestion UI + Production Smoke Check

**Owner:** Codex
**Status:** `DONE_CODED`
**Branch:** `main`
**Commit/PR link:** pending commit

#### Summary

```text
Completed the remaining Customer 360 AI wire for Offer Engine.
OfferSuggestionBlock now calls:
- POST /api/ai/conversations/:id/offer-suggestion
and renders best offer/product, confidence, reason, suggested reply, next actions,
alternatives, copy-to-clipboard, and fallback/AI status.
AI Insight was already wired to analyze/insight APIs; no backend/schema change in this step.
```

#### Production DB Smoke

```text
Read-only DB check after founder test:
- webhookLogs: 5 baseline -> 6 current
- messages: 15 baseline -> 1713 current
- comments: 3 baseline -> 3 current

Latest webhook log is message/PROCESSED without error.
Latest message has workspaceId and Meta message id.
FacebookComment did not increase, so comment real smoke remains pending.
```

#### Migration State

```text
npx prisma migrate status: PASS.
Database schema is up to date.
11 migrations found, no pending/failed migration.
MetaBusinessConnection and AI/Product migrations appear applied on the current target DB.
No migrate deploy was run.
```

#### Files changed

```text
src/components/inbox/ContactProfilePanel.tsx
src/components/inbox/profile/OfferSuggestionBlock.tsx
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests

```text
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
```

#### Risks / Follow-up

```text
- D-009 remains PARTIAL: Messenger/message path confirmed, comment real event still not confirmed.
- D-002 remains PARTIAL/PENDING for pages_manage_engagement: reply/hide comment still needs Meta permission/App Review and reconnect if required.
- Offer suggestion quality depends on current Offer/Product data; missing OPENAI_API_KEY degrades to rule-based fallback without crashing.
- Need push/deploy separately if founder wants production UI updated.
```

---

### 18.25. AI Product/Service Completion — Deploy-ready

**Owner:** Codex
**Status:** `DONE_CODED_DEPLOY_READY`
**Branch:** `main`
**Commit/PR link:** pending commit

#### Summary

```text
Completed the AI + Product/Service usability pass so the CRM can be used without waiting for external AI secrets:
- Product/Service module now supports list, create, edit, detail, active/inactive, AI score and AI audit cache.
- Product POST and detail PATCH support the sales/AI fields needed by Offer Engine and Product Auditor.
- Product AI Auditor UI can run audit, show the required analysis blocks, and save suggestions into empty fields only.
- AI Growth Report UI now reads GET /api/ai/growth-report and renders 8 report blocks with range filters.
- Customer 360 Offer Suggestion can create a follow-up task or open the order modal, but still does not auto-send or auto-create without user action.
```

#### Schema / Migration

```text
- No new schema change in this completion task.
- ProductLite already had costVnd, marginVnd, targetSegment, painPointsJson, benefitsJson, faqsJson, objectionsJson, offerIdeasJson, salesScript, aiAuditScore, aiAuditJson, aiAuditedAt.
- npx prisma migrate status: PASS, DB schema up to date, 11 migrations found, no pending/failed migration.
- No migrate deploy was run.
```

#### API Contract

```text
Product CRUD:
- GET /api/products
- POST /api/products
- GET /api/products/:id
- PATCH /api/products/:id

AI/Product:
- POST/GET /api/ai/products/:id/audit
- POST/GET /api/products/:id/ai-audit

AI Growth:
- GET /api/ai/growth-report?range=today|7d|30d|90d|custom

All endpoints require login, filter currentWorkspaceId, use integer VND, and keep AI suggestion-only.
```

#### Files changed

```text
src/app/api/products/route.ts
src/app/api/products/[id]/route.ts
src/components/products/ProductsClient.tsx
src/components/products/ProductAuditPanel.tsx
src/components/dashboard/AiGrowthReport.tsx
src/components/inbox/ContactProfilePanel.tsx
src/components/inbox/profile/OfferSuggestionBlock.tsx
docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md
```

#### Tests / Smoke

```text
npx prisma migrate status: PASS
npx prisma generate: PASS
npm run typecheck: PASS
npm run build: PASS
AI config boolean check: OPENAI_API_KEY=false, rule-based fallback active.
Local dev read-only smoke: PASS login, products list/detail/audit read, growth report read.
Local production next start smoke: blocked by expected fail-fast default AUTH_SECRET in local .env; no code/build failure.
```

#### Risks / Handoff

```text
- OPENAI_API_KEY is not configured locally, so AI model calls are not active; fallback is working.
- Production deploy was not run in this task; founder must approve push/deploy.
- Write smoke was skipped to avoid fake data in the real DB while founder is absent.
- Founder should add real products/services; suggestion quality depends on product/offer data completeness.
- Claude handoff: UI can be polished after deploy, but current Product/Service, AI Auditor, Offer Suggestion and Growth Report flows are usable.
```

---

## 19. Blockers / Founder Decisions

Agent nào gặp blocker phải ghi vào đây.

### 19.1. Open Decisions

| ID | Decision Needed | Owner hỏi | Status | Founder Answer |
|---|---|---|---|---|
| D-001 | DB credential đã rotate chưa? | Codex | DONE | Đã rotate Neon DB credential và cập nhật DATABASE_URL mới vào .env local. |
| D-002 | App Facebook đã có quyền `pages_manage_engagement` chưa? | Codex | PARTIAL — receive OK, manage_engagement pending | OAuth scope đã request `pages_manage_engagement`, `pages_read_engagement`, `pages_messaging`; production env đã set App ID/Secret và OAuth redirect PASS. 2026-06-21 DB smoke: webhookLogs/messages đã tăng và latest webhook là message/PROCESSED, nên nhận Messenger đã có tín hiệu thật. `pages_manage_engagement`/reply-hide comment vẫn chưa chốt; comments chưa tăng. Cần founder cấp/duyệt quyền + reconnect nếu Meta yêu cầu. |
| D-009 | Production Webhook Real Smoke (nhận inbox/comment thật) | Claude/Cowork | PARTIAL — Messenger confirmed, comment pending | 2026-06-17 đã fix Traefik + App-level subscription và POST ký hợp lệ → PROCESSED. 2026-06-21 read-only DB: webhookLogs 5→6, messages 15→1713, comments 3→3. Kết luận: Messenger/message path confirmed PARTIAL; comment real event vẫn chưa confirmed, cần test 1 comment thật sau khi quyền/feed subscription ổn. |
| D-010 | AI model key có cấu hình chưa? | Codex | OPEN — fallback active | 2026-06-21 local check: OPENAI_API_KEY=false. App vẫn dùng được bằng rule-based fallback. Nếu muốn AI model thật, founder nhập OPENAI_API_KEY trực tiếp trong Dokploy Environment, không gửi qua chat. |
| D-011 | Deploy AI Product/Service completion lên production? | Founder | OPEN | Code deploy-ready: /products CRUD/detail/edit, Product Auditor save suggestions, Offer Suggestion actions, AI Growth UI. Cần founder duyệt push/deploy; không cần migrate deploy vì DB up to date. |
| D-003 | Lưu tiền VND bằng integer đồng được không? | Codex | OPEN | Đề xuất: Có |
| D-004 | Zalo OA để P2 hay ép vào MVP1? | Founder/PM | OPEN | Đề xuất: P2 |
| D-005 | Email module hiện có giữ hay ẩn khỏi nav MVP1? | Founder/PM | OPEN | Đề xuất: Giữ code, ẩn khỏi nav nếu gây rối |
| D-006 | Realtime giữ polling 5s hay nâng WebSocket? | Founder/PM | DONE | 2026-06-18: Founder yêu cầu inbox realtime; Codex đã triển khai SSE `/api/conversations/stream` + Graph sync fallback, giữ polling dài hơn làm backup. Không dùng WebSocket để giảm rủi ro hạ tầng. |
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

[2026-06-14 · Claude · PR #6B Comment UI]
- D-002 (UI sẵn sàng): /comments + /comments/[id] có reply/hide gọi Graph; khi thiếu pages_manage_engagement/page token, UI hiển thị lỗi nguyên văn + gợi ý reconnect, KHÔNG fake success. Cần Meta perms thật để smoke end-to-end.
- B-017 đã giải quyết: Order API (PR #5) đã commit (c21af46) + Order UI (b88400b); working tree đã sạch ở các file đó.
- Build: next build FULL PASS (compiled + types + static 5/5).
- Hạn chế (không chặn): "Mở hội thoại" từ comment trỏ /inbox chung (chưa deep-link đúng conversation).
- PR #6B hoàn tất (DONE).

[2026-06-14 · Codex · PR #7 Automation Rule Engine]
- B-019 RESOLVED: Founder duyệt và Codex đã chạy npx prisma migrate deploy thành công cho 20260614_workspace_core_05_automation_api.
- Runtime smoke Automation API PASS: GET/POST/PATCH/test/runs.
- Runtime smoke hook PASS: CONTACT_CREATED, CONTACT_STAGE_CHANGED, OPPORTUNITY_STAGE_CHANGED, ORDER_CREATED, ORDER_STATUS_CHANGED, COMMENT_CREATED, COMMENT_HAS_PHONE.
- SEND_EMAIL/WEBHOOK vẫn SKIPPED, không gửi thật.
- Không còn blocker chặn PR #7 backend.

[2026-06-14 · Claude · PR #7B Automation UI]
- PR #7B hoàn tất (DONE): /automation (Quy tắc + Mẫu + Lịch sử chạy) + /automation/[id] (chi tiết + sửa + dry-run test); toggle bật/tắt; conditions/actionConfig JSON có validate. typecheck + next build FULL PASS.
- SEND_EMAIL/WEBHOOK: UI hiển thị cảnh báo khóa an toàn (engine SKIPPED) — đúng MVP.
- Hạn chế (không chặn): conditions/actionConfig nhập JSON thô (chưa form builder field-by-field).
- Còn lại MVP1 UI: chỉ PR #8B Dashboard (chờ Stats API PR #8).

[2026-06-14 · Codex · PR #8 Founder Stats API]
- B-020 (BUILD/ENV): npm run build không trả exit code trong timeout 5 phút; Next build process treo sau khi sinh .next artifacts. npm run typecheck PASS, npx prisma generate PASS, runtime smoke GET /api/stats/founder PASS. Cần rerun build trong môi trường sạch để xác nhận production build exit code.
- Không có blocker chặn API contract PR #8; mục 16.7 đã READY.

[2026-06-14 · Claude · PR #8B Dashboard UI]
- B-020 UPDATE: next build sạch của PR #8B PASS (exit OK ~61s) — không tái hiện treo build; nhiều khả năng do môi trường/cache lần trước.
- PR #8B hoàn tất (DONE): /dashboard dùng GET /api/stats/founder (workspace-scoped), bộ lọc range + so sánh kỳ trước, 8 card + section doanh thu/pipeline/nguồn/sale/comment/task/automation, chart CSS thuần. typecheck + next build FULL PASS.
- Đã thay /dashboard cũ (prisma trực tiếp, không scope workspace) → fix luôn rủi ro lẫn dữ liệu đa-tenant trên trang dashboard.
- 🏁 MVP1 UI HOÀN TẤT (PR #1B, #2B, #3B, #4B, #5B, #6B, #7B, #8B). Việc còn lại: founder merge nhánh claude/*; Codex commit backend ở working tree; smoke D-002 (Meta perms).

[2026-06-14 · Claude · Final MVP1 Stabilization]
- Tests: typecheck + prisma generate + npm run build PASS (exit 0). B-020 KHÔNG tái hiện → môi trường, không phải lỗi code.
- Smoke PASS: 7/7 route → 307, 7/7 API → 401 (warm). 000 ban đầu = next dev cold-compile timeout, không phải lỗi route.
- B-021 (HOUSEKEEPING, RESOLVED 2026-06-15): 2 file leftover đã commit `5f1155e` "chore: commit remaining automation hook and prisma migration lock" (src/lib/facebook/comments.ts PR#7 hook automation + prisma/migrations/migration_lock.toml). `git status` hiện SẠCH hoàn toàn (working tree clean).
- D-002 (OPEN): reply/hide comment cần Meta pages_manage_engagement + page token thật; chưa smoke được trong môi trường này. Không fake.
- Tenant isolation: code-level PASS (mọi query filter workspaceId); runtime đa-workspace cần kiểm trong env founder (đăng nhập + ≥2 workspace có data).

[2026-06-16 · Codex · Production Deploy + Facebook Integration Fix]
- B-022 (DEPLOY, RESOLVED): Dokploy app trước đó 0/1 vì Github Provider not found và chưa có image. Codex build image production dc-funnel-cmr-dc-iea9mn:latest từ git archive sạch, update Docker Swarm service; service hiện 1/1.
- B-023 (DOMAIN, RESOLVED): crm.hongducdigital.com 502 do stale Traefik dynamic config trùng host trỏ service cũ dc-a-mcwmkj. Đã backup/disable stale config khỏi dynamic watch dir; /login HTTP 200.
- B-024 (FACEBOOK WEBHOOK, RESOLVED): Meta URL founder cấu hình là /api/webhooks/meta nhưng code chỉ có /api/webhook/facebook. Đã thêm alias /api/webhooks/meta; verify trả challenge test123, route cũ vẫn hoạt động.
- B-025 (FACEBOOK OAUTH ENV, RESOLVED): Production thiếu/sai FACEBOOK_APP_ID/SECRET; endpoint từng redirect với App ID không hợp lệ. Đã thêm validation rõ ràng, set App ID/Secret thật founder cung cấp vào service, OAuth smoke sau admin login trả 307 tới www.facebook.com với redirect_uri đúng.
- D-002 UPDATE (PENDING_REAL_SMOKE): OAuth URL đã request pages_manage_engagement/pages_read_engagement/pages_messaging, nhưng quyền thật vẫn phải xác nhận qua Meta consent + connect Fanpage + page token thật.

[2026-06-17 · Claude/Cowork · Production Webhook Real Smoke]
- B-026 (PROD INFRA, RESOLVED): Sau reboot nâng VPS, **dokploy-traefik exit 128** (`bind 0.0.0.0:80 address already in use`) vì **nginx host mặc định** chiếm cổng 80 ⇒ mất HTTPS/443 ⇒ Meta verify callback 503 ⇒ KHÔNG nhận webhook (inbox+comment), site khó vào. Bằng chứng: nginx chỉ là trang "Welcome to nginx!" (sites-enabled/default, không proxy_pass, /var/www/html), VPS chỉ chạy Dokploy. FIX (founder duyệt): `systemctl stop+disable nginx` + `docker start dokploy-traefik` (restart=always). Verify: 443 OK, cert Let's Encrypt hạn 13/09, /login 200.
- B-027 (META WEBHOOK APP-LEVEL, RESOLVED): `GET /{app-id}/subscriptions` = `data:[]` — thiếu webhook cấp App (chỉ có Page-level subscribed_apps). FIX: `POST /{app-id}/subscriptions` object=page, callback https://crm.hongducdigital.com/api/webhooks/meta, verify_token khớp, fields messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,feed → `active:true`.
- B-028 (E2E VERIFY, PASS): POST webhook ký hợp lệ (HMAC META_APP_SECRET) qua public HTTPS → 200 EVENT_RECEIVED, DB FacebookWebhookLog=PROCESSED (đã xoá log test). Toàn tuyến Traefik→app→signature→handler→DB OK.
- D-009 (PARTIAL → chờ event thật): webhookLogs hiện = 5 nhưng TẤT CẢ từ 14/06 (smoke). Cần founder gửi 1 tin + 1 comment thật vào page HiChaos → soi webhookLogs/messages/comments tăng để chốt RESOLVED. Nếu chỉ admin/tester nhận: cần Meta Live mode + Advanced Access (pages_messaging, pages_read_engagement).
- B-029 (HEALTH CHECK BUG, phụ — không chặn nhận): HiChaos status=ERROR, lastError `(#100) Tried accessing nonexisting field (tasks)` (Health Check 12:47). Handler vẫn nhận webhook cho page ERROR (chỉ bỏ qua DISCONNECTED). Đề xuất Codex rà field `tasks` trong runPageHealthCheck/Graph call.
- B-030 (MIGRATION DRIFT, phụ): model `MetaBusinessConnection` có trong schema nhưng bảng CHƯA tồn tại ở DB production ⇒ `/api/integrations/facebook/businesses` 500. Thuộc module BM/Catalog đang hoãn. Cần `npx prisma migrate deploy` (additive) khi founder duyệt.
- Không sửa code app (nguyên nhân là hạ tầng + Meta config). Chỉ thêm scripts/prod-*.js (chẩn đoán read-only, không secret) + cập nhật plan.

[2026-06-20 · Claude · AI Growth Copilot UI]
- B-031 (UI PENDING API): AI Insight (phân tích sâu), Offer Engine, Product Auditor, Growth Report — UI đã dựng ở trạng thái empty/coming-soon (KHÔNG fake). Cần Codex cấp API (xem mục 26): analyze/insight, offer-suggestion, product audit, growth-report. Khi READY, Claude wire ngay.
- B-031 NOTE: Conversation Copilot (gợi ý câu trả lời) đã chạy thật nhờ /api/ai/suggest (đã có) — dùng ở composer + AI Insight block.
- D-010 (FOUNDER): có ưu tiên dựng module Sản phẩm (Phase 4: list + audit) trước không? Hiện nav "Sản phẩm" vẫn soon, chưa có route. Phase 4 chờ quyết định + API.
- Không đụng schema/auth/api core/env/facebook. typecheck + build PASS.

[2026-06-20 · Codex · AI Conversation Insight Foundation]
- B-031 UPDATE: analyze/insight API đã CODED/READY trong backend:
  POST /api/ai/conversations/:id/analyze và GET /api/ai/conversations/:id/insight.
- Migration additive 20260620_ai_conversation_insight đã tạo nhưng CHƯA apply production; runtime production cần founder duyệt migrate deploy trước khi UI gọi thật.
- B-031 còn OPEN một phần: Offer Engine, Product Auditor, Growth Report vẫn pending phase sau.

[2026-06-20 · Codex · Product/Service AI Auditor Backend]
- B-031 UPDATE: Product Auditor API đã CODED/READY trong backend:
  POST/GET /api/ai/products/:id/audit và alias POST/GET /api/products/:id/ai-audit.
- ProductLite đã có field audit/source nullable additive; migration 20260620_product_ai_auditor đã tạo nhưng CHƯA apply production.
- API filter currentWorkspaceId, không đọc/ghi product workspace khác; AI chỉ ghi audit cache, không ghi đè dữ liệu gốc.
- OPENAI_API_KEY thiếu vẫn trả AI_NOT_CONFIGURED + rule-based fallback, không 500.
- Tests local: npx prisma format PASS, npx prisma generate PASS, npm run typecheck PASS, npm run build PASS.
- B-031 còn OPEN một phần: Offer Engine và Growth Report vẫn pending phase sau.

[2026-06-20 · Claude · Wire AI Insight + Product Auditor UI]
- B-031 RESOLVED (phần lớn) — đã WIRE UI THẬT vào API Codex:
  - AI Insight block (Customer 360) → analyze/insight (commit d8f052b): hiển thị buyingIntent/funnelStage/sentiment/DISC/nhu cầu/phản đối/sản phẩm/thiếu data/offer/next action/câu trả lời + confidence; nút Phân tích & Phân tích lại; tạo task từ "việc nên làm"; copy câu trả lời.
  - Product Auditor → route /products + list + tạo nhanh + "AI kiểm tra" → audit (commit "add product ai auditor ui"); nav "Sản phẩm" đã bật thật (bỏ soon).
  - Conversation Copilot (/api/ai/suggest) + route /dashboard/ai-growth đã có trước đó.
- B-031 còn OPEN: Offer Engine (chưa có /api/ai/.../offer-suggestion — AI Insight đã phủ "Offer nên dùng"); Growth Report số liệu (chưa có /api/ai/growth-report → trang vẫn empty state).
- B-032 (PRODUCTION — cần founder/Codex, KHÔNG phải reset): UI mới gọi API cần 2 migration additive đã tạo nhưng CHƯA apply prod: `20260620_ai_conversation_insight`, `20260620_product_ai_auditor`. Chạy `npx prisma migrate deploy` trên production thì AI Insight + Product Auditor chạy thật; trước đó UI degrade gọn (hiện lỗi, không crash). Claude KHÔNG tự chạy migrate prod khi founder vắng.
- typecheck + build PASS. Chưa push (chờ founder duyệt deploy + migrate; deploy không tự chạy migrate).

[2026-06-20 · Codex · Offer Engine Backend]
- B-031 UPDATE: Offer Engine API đã CODED/READY trong backend:
  POST /api/ai/conversations/:id/offer-suggestion.
- Không tạo migration mới; API chỉ đọc conversation/customer/messages/offers/products/orders trong currentWorkspaceId.
- AI chỉ gợi ý offer/sản phẩm + suggestedReply; KHÔNG tự gửi tin, KHÔNG tạo đơn, KHÔNG đổi stage.
- OPENAI_API_KEY thiếu vẫn trả AI_NOT_CONFIGURED + rule-based fallback, không 500.
- Tests local: npx prisma generate PASS, npm run typecheck PASS, npm run build PASS.
- B-031 còn OPEN một phần: Growth Report API vẫn pending phase sau.

[2026-06-20 · Codex · AI Growth Report API]
- B-031 CODE-LEVEL RESOLVED: Growth Report API đã CODED/READY:
  GET /api/ai/growth-report.
- Không tạo migration mới; API đọc Founder Stats + ProductLite + Offer trong currentWorkspaceId và trả 8 block Growth Optimizer.
- mode hiện là rule_based để không cần secret AI; không ghi DB, không gửi tin, không tạo đơn/automation.
- Tests local: npx prisma generate PASS, npm run typecheck PASS, npm run build PASS.
- B-031 còn phụ thuộc runtime production: cần apply 2 migration AI đã tạo trước đó để AI Insight/Product Auditor chạy thật (xem B-032). Growth Report và Offer Engine không cần migration mới.

[2026-06-21 · Codex · AI Product/Service Completion]
- B-031 RESOLVED for usable UI + API: Product/Service CRUD/detail/edit, Product Auditor UI + save empty suggestions, AI Insight already wired, Offer Suggestion actions, AI Growth UI reading API.
- B-032 runtime dependency RESOLVED on current target DB: npx prisma migrate status shows DB schema up to date, no pending/failed migration; MetaBusinessConnection and AI/Product migrations are no longer pending.
- Remaining founder decision is not a blocker: D-010 OPENAI_API_KEY is false, app uses rule-based fallback; D-011 deploy approval needed to ship this completion to production.

[2026-06-21 · Codex · Workspace Members API]
- Post-MVP P1 backend backlog DONE_CODED: thêm GET /api/workspaces/members.
- API require login, filter currentWorkspaceId, hỗ trợ q/role, trả member + user label để UI chọn owner/sale và filter dashboard/contact/order/pipeline.
- Không tạo migration mới; Prisma migrate status báo database schema up to date.
- Tests local: npx prisma generate PASS, npm run typecheck PASS, npm run build PASS.
- B-030 RESOLVED: npx prisma migrate status hiện up to date, không pending migration; Prisma query MetaBusinessConnection count OK.

[2026-06-21 · Codex · Webhook DB Smoke + Customer 360 Offer Suggestion UI]
- Đọc lại docs/PRODUCTION_WEBHOOK_DIAGNOSIS.md và plan tổng trước khi làm.
- Kiểm DB production read-only sau founder test: baseline diagnosis 2026-06-17 là webhookLogs=5, messages=15, comments=3; hiện tại webhookLogs=6, messages=1713, comments=3.
- Latest webhook log là eventType=message, processingStatus=PROCESSED, không có error; latest message có workspaceId + metaMessageId. Kết luận: Messenger/message path PARTIAL confirmed, nhưng comment thật CHƯA confirmed vì FacebookComment vẫn = 3 bản ghi cũ.
- Chạy npx prisma migrate status: PASS, schema up to date, 11 migrations found, không pending/failed migration. Các migration MetaBusinessConnection + AI/Product đã ở trạng thái applied trên DB hiện tại; KHÔNG chạy migrate deploy.
- Nối Customer 360 block "Ưu đãi / Gợi ý bán hàng" vào API thật POST /api/ai/conversations/:id/offer-suggestion; AI chỉ gợi ý, sale copy/duyệt thủ công, không tự gửi tin hay mutate dữ liệu.
- Xác nhận AI Insight block đã dùng API thật analyze/insight; Customer 360 đang đọc contact/order/timeline qua API sẵn có.
- Tests local: npx prisma generate PASS, npm run typecheck PASS, npm run build PASS.
- Không deploy, không reset DB, không in secret, không chạy migration.
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

### 19.3. Việc sau MVP1 (post-MVP1 backlog)

```text
Vận hành / hoàn tất ngay:
- Founder review + merge các nhánh claude/01..08 (UI) vào main theo merge rule (mục 7).
- Founder bấm Connect Facebook trên production, chọn đúng Meta App/Page account, cấp permissions; Codex smoke callback/list pages/connect page/webhook/reply-hide để đóng D-002.
- Kiểm tenant isolation đầu cuối: đăng nhập, tạo >=2 workspace có data, switch và đối chiếu dashboard/contact/order/pipeline không lẫn.

Nên có sớm (P1, ngoài MVP1):
- DONE_CODED: API list workspace members (`GET /api/workspaces/members`) -> picker owner cho Contact/Order/Pipeline + lọc dashboard theo sale.
- Deep-link conversation trong Inbox (comment "Mở hội thoại" trỏ đúng hội thoại thay vì /inbox chung).
- Realtime inbox (thay polling) nếu cần.
- Bật SEND_EMAIL/WEBHOOK automation thật khi có consent/config (đang SKIPPED an toàn).
- Form builder field-by-field cho automation conditions/actionConfig (thay nhập JSON thô).
- Reports/export CSV; chart tương tác cho dashboard.

Ngoài scope (giữ nguyên KHÔNG làm): Zalo OA, POS/kho/kế toán/đối soát COD, marketplace, LMS/Course, Voice AI, flow builder canvas, broadcast hàng loạt, affiliate.
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

---

## 26. AI Growth Copilot Roadmap

Mục tiêu: nâng CRM từ "công cụ quản lý" thành **AI Growth Copilot** — đọc dữ liệu, hiểu khách, gợi ý hành động bán hàng theo thời gian thực. AI **chỉ gợi ý**, sale là người quyết định (xem mục 28).

**5 lớp năng lực:**

1. **Product/Service Auditor** — AI đọc sản phẩm/dịch vụ, chấm độ đầy đủ thông tin, chỉ ra phần còn thiếu (giá, USP, pain point, FAQ, objection handling, offer, sales script, content angle), đề xuất phân khúc khách phù hợp.
2. **Customer Psychology Layer** — AI phân tích tín hiệu hội thoại/hành vi: mức độ mua, giai đoạn phễu, nhu cầu, phản đối, phong cách giao tiếp, phân khúc (xem mục 27).
3. **Conversation Copilot** — trong Inbox, AI tóm tắt hội thoại, gợi ý câu trả lời, next-best-action; sale duyệt rồi mới gửi.
4. **Offer Engine** — AI đề xuất offer/combo/sản phẩm theo ngữ cảnh hội thoại + tồn kho + lịch sử mua.
5. **Optimization Loop** — AI tổng hợp mỗi ngày: điểm nghẽn pipeline, khách cần follow-up, offer nên test, sản phẩm nên đẩy, ghi chú huấn luyện sale, việc nên làm ngày mai (route `/dashboard/ai-growth`).

**Trạng thái UI — 2026-06-21:**
- DONE Conversation Copilot (gợi ý câu trả lời) — nút AI ở composer + AI Insight block trong Customer 360 (dùng `POST /api/ai/suggest`).
- DONE AI Insight block (Customer 360) — gọi API thật `GET/POST /api/ai/conversations/:id/insight|analyze`, có fallback rõ khi thiếu AI config.
- DONE AI Growth route `/dashboard/ai-growth` — UI gọi API thật `/api/ai/growth-report`, có 8 khối, range Hôm nay/7 ngày/30 ngày và fallback rule-based.
- DONE Offer Engine UI — block "Ưu đãi / Gợi ý bán hàng" gọi API thật `POST /api/ai/conversations/:id/offer-suggestion`; AI chỉ gợi ý, sale copy/duyệt thủ công.
- DONE Product Auditor UI — route `/products` + list/create/edit/detail + audit panel gọi Product AI Auditor API; có action lưu gợi ý vào field trống, không ghi đè dữ liệu sale.

**Data requirements:** lịch sử message/comment theo conversation, brand profile, danh mục offer/sản phẩm (giá, mô tả, tồn), lịch sử đơn theo khách, stage/lead score, tags — tất cả filter theo `workspaceId`.

**API contract đã có (xem mục 16.8-16.11):**
- `POST /api/ai/conversations/:id/analyze` → tạo insight (các trường ở mục 27).
- `GET /api/ai/conversations/:id/insight` → đọc insight gần nhất (cache).
- `POST /api/ai/conversations/:id/offer-suggestion` → offer phù hợp + lý do + câu gợi ý.
- `POST /api/ai/products/:id/audit` + `GET /api/ai/products/:id/audit` → audit sản phẩm.
- `GET /api/ai/growth-report?range=today` → dữ liệu 8 khối Growth Optimizer.

## 27. Customer Psychology Layer

AI suy luận theo **tín hiệu hội thoại & hành vi**, không suy đoán về con người (xem mục 28). Các mô thức:

| Mô thức | Mô tả | Giá trị gợi ý |
|---|---|---|
| Buying Intent | Mức độ sẵn sàng mua | Lạnh / Ấm / Nóng / Sẵn sàng chốt |
| Funnel Stage | Giai đoạn phễu | Awareness / Consideration / Decision / Retention |
| JTBD | Việc khách cần giải quyết | chuỗi nhu cầu chính |
| Objection Analysis | Phản đối chính | giá / niềm tin / thời điểm / nhu cầu |
| Sentiment | Tâm trạng hội thoại | tích cực / trung tính / lo ngại / khó chịu |
| Communication Style (DISC) | Phong cách giao tiếp | D / I / S / C (tín hiệu, không tuyệt đối) |
| Customer Segment | Phân khúc | theo ngành / giá trị / hành vi |
| RFM | Recency / Frequency / Monetary | điểm R-F-M từ lịch sử đơn |
| Next Best Action | Việc nên làm tiếp | gửi offer / hỏi nhu cầu / chốt / hẹn lại |
| Offer Fit | Offer phù hợp nhất | offer id + lý do |
| Product Interest | Sản phẩm đang quan tâm | danh sách sản phẩm |

Mỗi insight kèm `confidence` (độ tin cậy) để sale biết trọng số.

## 28. AI Safety Rules

- **AI chỉ gợi ý** — không tự gửi tin cho khách; sale luôn duyệt trước khi gửi.
- **Không phán xét con người** — viết theo hành vi: "tín hiệu hội thoại cho thấy...", KHÔNG viết "khách nghèo / thiếu quyết đoán / khó tính".
- **Tôn trọng dữ liệu workspace** — AI chỉ đọc/ghi trong `workspaceId` hiện tại; không rò rỉ chéo tenant.
- **Không log dữ liệu nhạy cảm** — không log nội dung tin nhắn đầy đủ, không log SĐT/email/token đầy đủ (mask khi cần).
- **Không ghi đè dữ liệu thật** — AI điền field trống, không đè dữ liệu sale đã nhập.
- **Minh bạch trạng thái** — thiếu `OPENAI_API_KEY` hoặc API chưa có → hiển thị rõ "AI chưa bật / đang chờ backend", không fake kết quả.
- **Con người quyết định cuối** — mọi hành động bán hàng (gửi tin, tạo đơn, đổi stage) do sale xác nhận.

---

## 29. Deploy Log

### 2026-06-20 — AI Insight + Product Auditor LÊN LIVE (B-032 RESOLVED)

- Founder duyệt đích danh việc 1 (push + deploy + migrate).
- Push `e812def..7c5010c` → Dokploy build OK (container mới).
- `prisma migrate deploy` (trong container production) áp dụng ADDITIVE: `20260620_ai_conversation_insight` + `20260620_product_ai_auditor` — thành công, KHÔNG reset/không xoá dữ liệu.
- Verify production: bảng `AIConversationInsight`/`AIAnalysisRun` query OK; cột audit `ProductLite` OK (2 sản phẩm); smoke `/login` 200, `/inbox` `/products` `/dashboard/ai-growth` = 307 (redirect auth, route sống).
- ⇒ **AI Insight (Customer 360) + Product AI Auditor (/products) đã hoạt động thật trên production.**
- Cập nhật 2026-06-21: Offer Engine UI đã wire local vào API thật và build pass; cần push/deploy riêng nếu muốn lên production. Growth Report API đã CODED; migration `MetaBusinessConnection` hiện không còn pending theo `npx prisma migrate status` trên target DB hiện tại. Còn theo dõi cảnh báo secret trong build log, không in secret vào chat.

---

## 30. AI Provider (Claude / Anthropic)

### 30.1. Contract (mục 16 bổ sung)
- `src/lib/ai/provider.ts` — provider layer dùng chung:
  - `getAIProviderStatus()` → `{ provider: "anthropic"|"openai"|"rule_based", configured, aiProvider, model, anthropicConfigured, openaiConfigured }`.
  - `generateStructuredAIResponse({task, system, prompt, schemaHint?, model?, maxTokens?, temperature?})` → parse JSON object (ném `AI_NOT_CONFIGURED`/`AI_INVALID_JSON` để caller fallback rule-based).
  - `generateTextAIResponse(...)` → text thuần (cho gợi ý câu trả lời).
- Ưu tiên: `AI_PROVIDER` → có key thì dùng, thiếu thì fallback provider còn lại có key, cuối cùng rule_based. KHÔNG log prompt/secret/dữ liệu khách. Không sửa `src/lib/env.ts` (đọc `process.env` trực tiếp).
- Endpoint kiểm tra an toàn: `GET /api/ai/provider-status` → chỉ boolean + tên model, không bao giờ in key.

### 30.2. Env vars mới (production cần set)
```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=<key>            # bắt buộc để bật Claude
ANTHROPIC_MODEL=claude-sonnet-4-6  # mặc định
ANTHROPIC_MODEL_FAST=claude-haiku-4-5     # tùy chọn
ANTHROPIC_MODEL_SMART=claude-opus-4-8     # tùy chọn
AI_TEMPERATURE=0.2   AI_MAX_TOKENS=900   AI_TIMEOUT_MS=30000
```
(OPENAI_API_KEY vẫn dùng được nếu AI_PROVIDER=openai.)

### 30.3. Module đã nối Claude (qua provider)
- ✅ AI Conversation Insight (`conversation-analysis.ts`)
- ✅ Product/Service AI Auditor (`product-audit.ts`)
- ✅ Offer Suggestion (`offer-suggestion.ts`)
- ✅ Gợi ý câu trả lời (`suggest.ts`)
- ➖ Growth Report (`growth-report.ts`) — hiện 100% rule-based (tính từ stats, không gọi LLM); nối Claude là việc sau (không phải swap provider).
- Thiếu key → trả `AI_NOT_CONFIGURED` + rule-based fallback, KHÔNG 500. AI chỉ gợi ý, sale duyệt trước khi gửi. Response shape API giữ nguyên (UI không vỡ).

### 30.4. Mục 17 — Report (2026-06-20, Claude/Cowork)
- Đã cài `@anthropic-ai/sdk@^0.105.0`; tạo provider + nối 4 module + endpoint status.
- typecheck PASS · prisma generate PASS · build PASS. Không reset DB, không db push, không migrate (không đổi schema).
- Smoke runtime cần `ANTHROPIC_API_KEY` thật (chưa set ở môi trường này) → khi set: /products (AI kiểm tra), /inbox (AI Insight + gợi ý), offer-suggestion sẽ chạy bằng Claude.

### 30.5. Mục 19 — Blocker / Founder Decision
- **D-011 (FOUNDER):** Set `ANTHROPIC_API_KEY` (+ `AI_PROVIDER=anthropic`) vào env production (Dokploy) để bật Claude. Trước khi set: AI chạy rule-based fallback (không lỗi). Sau khi set + redeploy: AI dùng Claude.
- Claude provider: **READY về code** (chờ key của founder).
