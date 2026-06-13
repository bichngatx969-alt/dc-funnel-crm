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

**Status:** `NOT_READY / READY / CHANGED`  
**Owner:** Codex  
**Last updated:**  

```http
GET /api/workspaces
```

Response:

```json
{
  "items": [],
  "currentWorkspaceId": null
}
```

Notes:

```text
Điền sau khi Codex hoàn thành PR #2.
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

#### Risks

```text
Chưa cập nhật.
```

#### Handoff to Claude

```text
Chưa cập nhật.
```

---

### 18.4. PR #2B — Workspace UI

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

#### Risks

```text
Chưa cập nhật.
```

#### Handoff

```text
Chưa cập nhật.
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
- B-002 (BLOCKING cho PR #2B, không chặn hiện tại): Workspace API contract (mục 16.1) đang NOT_READY.
  Claude KHÔNG build Workspace Switcher/Settings thật cho tới khi Codex đặt 16.1 = READY (đúng cổng API contract).
- Không có blocker nào chặn PR #1B. PR #1B hoàn tất.

[2026-06-14 · Codex · PR #1]
- B-003 (RESOLVED trước PR #2): D-001 DONE. Founder xác nhận đã rotate Neon DB credential và cập nhật DATABASE_URL mới vào .env local.
- B-004 (RESOLVED trước PR #2): Đã git init và tạo branch codex/02-workspace-core.
- B-005 (SAFETY): Migration baseline chưa tạo/chạy trong PR #1 để tránh rủi ro với production DB credential chưa xác nhận đã rotate và repo chưa có migrations history.
- Không có blocker nào chặn hoàn tất PR #1 code hardening. PR #1 hoàn tất.
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
