# D.C Funnel Bot / D.C FUNNEL CRM — Codebase Audit & Update Plan

- **Ngày audit:** 2026-06-13
- **Phạm vi:** Chỉ kiểm tra & phân tích. Không sửa code, không chạy migration, không deploy. Đã chạy `npm run typecheck` (an toàn, pass).
- **Người thực hiện:** Senior Full-stack / Product Engineer / Technical PM (audit theo yêu cầu founder).
- **Mọi nhận định dẫn file thật trong repo.**

## Mục lục
1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Repo Structure](#2-tech-stack--repo-structure)
3. [Current Feature Inventory](#3-current-feature-inventory)
4. [Gap Analysis vs D.C FUNNEL CRM Spec](#4-gap-analysis-vs-dc-funnel-crm-spec)
5. [Database Schema Review](#5-database-schema-review)
6. [API / Backend Review](#6-api--backend-review)
7. [Frontend UI/UX Review](#7-frontend-uiux-review)
8. [Integration Review](#8-integration-review)
9. [Security & Multi-tenant Review](#9-security--multi-tenant-review)
10. [Priority Roadmap](#10-priority-roadmap)
11. [30-Day Update Plan](#11-30-day-update-plan)
12. [Recommended First Pull Request](#12-recommended-first-pull-request)
13. [Questions / Blockers](#13-questions--blockers)

---

## 1. Executive Summary

**Hệ thống hiện tại KHÔNG sơ khai — đây là một MVP "single-brand funnel bot" cho Facebook Messenger đã làm khá chắc tay.** Code sạch (`npm run typecheck` pass, exit 0), kiến trúc rõ ràng, tiếng Việt 100%, tích hợp Facebook ở mức gần production (OAuth thật, mã hóa token AES-256-GCM, verify chữ ký webhook, health check, audit log). Email automation (Resend) thậm chí vượt scope MVP mới.

**Nhưng định hướng sản phẩm mới (D.C FUNNEL CRM — CRM funnel multi-brand cho agency) lệch về bản chất so với sản phẩm hiện tại.** `README.md` ghi rõ: *"MVP không phải SaaS multi-tenant. Không có tenant, workspace, client hay switch brand."* Đây chính là khoảng cách lớn nhất, mang tính kiến trúc.

**3 rủi ro/khoảng trống lớn nhất:**

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 🔴 1 | **Credential Neon Postgres production THẬT đang nằm trong `.env`** (plaintext, password thật). Phải xoay (rotate) ngay. | Critical (an ninh) |
| 🟠 2 | **Không có multi-tenant**: không có `Organization / Workspace / WorkspaceMember`, không có `workspaceId` ở bất kỳ bảng nào. Spec mới bắt buộc agency quản lý nhiều brand, data không lẫn. | XL (kiến trúc) |
| 🟠 3 | **Thiếu 3 module lõi của spec mới**: Pipeline Kanban (chưa có model opportunity/stage), Order Lite (chưa có product/order), Comment-to-Inbox (webhook chỉ xử lý `messaging`, chưa xử lý `feed`/comment). | L–XL mỗi cái |

**Việc nên làm trước (theo thứ tự):** (1) Xoay credential DB + bịt lỗ phân quyền backend; (2) Chốt quyết định kiến trúc multi-tenant với founder (đây là blocker chặn toàn bộ roadmap); (3) Thêm Pipeline + Order Lite + Comment-to-Inbox theo kiểu **additive** (không phá dữ liệu cũ).

**Cái nên GIỮ LẠI (làm tốt, đừng đập đi):** toàn bộ tầng tích hợp Facebook (`src/lib/facebook/`), token encryption, funnel engine + bắt SĐT VN, dedupe webhook, inbox 3 cột + takeover/return-to-bot, email module. Đây là tài sản thật.

---

## 2. Tech Stack & Repo Structure

### Stack (từ `package.json`)

| Hạng mục | Công nghệ | Ghi chú |
|---|---|---|
| Frontend framework | **Next.js 15.1.4 (App Router)** + React 19 | Server Components + Client Components |
| Backend | Next.js Route Handlers (`src/app/api/**/route.ts`) | Không tách backend riêng |
| Database | **PostgreSQL** (Neon trong .env) | |
| ORM | **Prisma 6.2** | |
| Auth | **Custom** — cookie HMAC-signed (`src/lib/auth.ts`) | Không dùng NextAuth; bcryptjs hash mật khẩu |
| UI library | **TailwindCSS 3.4** thuần | Không có shadcn/Radix; component tự viết (`src/components/ui.tsx`) |
| State management | Không có lib | React hooks + polling |
| API style | **REST** (route handlers) | Không GraphQL/tRPC |
| Realtime | ❌ **Không có** | Inbox polling mỗi 5s (`InboxClient.tsx`) |
| Queue/worker | ❌ Không có | Email automation chạy qua cron endpoint |
| Test | ❌ **Không có** | Không có jest/vitest/playwright |
| Deploy | `docker-compose.yml` chỉ dựng Postgres local | Build: `prisma generate && next build` |
| AI | OpenAI 4.78 (optional, gợi ý trả lời) | Tắt nếu thiếu key |
| Email | Resend 6.12 (optional) | |

### Cấu trúc thư mục (rút gọn)

```
prisma/
  schema.prisma          # 20 model + nhiều enum (KHÔNG có thư mục migrations/ — dùng db push)
  seed.ts                # admin + BrandProfile HICHAOS + offers/flows/email templates
src/
  app/
    api/
      webhook/facebook/   # GET verify + POST messaging (CHƯA xử lý comment)
      webhook/resend/     # webhook trạng thái email
      auth/ {login,logout}
      conversations/[id]/ {messages,send,takeover,return-to-bot}
      customers/[id]/ {tags,stage,emails,send-email}
      offers/ flows/ tasks/ stats/ brand-profile/ facebook-pages/ ai/suggest
      email/ {templates,sequences,send-test,preview}
      integrations/facebook/ {login,callback,pages,connect,disconnect,toggle-bot,health-check,logs}
      cron/email-automation  unsubscribe
    dashboard/ inbox/ offers/ flows/ email/ tasks/ login/
    settings/ {brand, integrations/facebook/pages/[pageId]}
    # ❌ KHÔNG có: /contacts, /pipeline, /orders, /reports
  components/   # AppShell, InboxClient, + các *Client.tsx
  lib/
    facebook/   # facebook-client, facebook-integration-service, send, verify
    funnel/     # engine, intake, phone, text, email
    email/      # automation, provider, resend, renderer, send, unsubscribe
    flows/defaults.ts   ai/suggest.ts
    auth.ts api.ts env.ts prisma.ts ratelimit.ts types.ts security/token-encryption.ts
```

### Cách chạy local (từ `README.md`)
```
npm install
cp .env.example .env        # rồi điền giá trị
npm run prisma:migrate      # hoặc npx prisma db push
npm run prisma:seed
npm run dev                 # http://localhost:3000
```
Scripts: `dev / build / start / lint / typecheck / prisma:{generate,migrate,deploy,seed,studio}`.

> ⚠️ **Không có thư mục `prisma/migrations/`** — dự án đang dùng `prisma db push` (schema-first, không có lịch sử migration). Rủi ro cho production (xem mục 9).

---

## 3. Current Feature Inventory

| Module | Hiện trạng | File/Route/API liên quan | Hoàn thiện | Ghi chú |
|---|---|---|---|---|
| Multi-brand Workspace | ❌ Không có (cố ý single-brand) | `README.md`, không có model | 0% | Có `BrandProfile` 1 dòng; nhiều Page **trong cùng 1 brand** |
| Auth (đăng nhập) | ✅ Có | `src/lib/auth.ts`, `api/auth/login` | 80% | Cookie HMAC + bcrypt, sameSite=lax, httpOnly |
| Role & Permission | 🟡 Một nửa | enum `Role {ADMIN,SALE}`, `src/lib/api.ts` | 25% | Backend chỉ check **đăng nhập**, KHÔNG check role |
| Contact CRM | 🟡 Một phần | model `Customer`, `api/customers/[id]` | 50% | Có tag/score/source/stage/email; **thiếu** note, custom field, giới tính/ngày sinh/địa chỉ, dedup, owner, trang detail riêng |
| Unified Inbox | ✅ Có (FB only) | `InboxClient.tsx`, `api/conversations` | 70% | 3 cột, takeover, tag, stage, task, AI. Lọc theo status/page/search. **Chưa** lọc "của tôi/chưa đọc/chưa gán/khách nóng/theo nhân viên" |
| Facebook Page Inbox | ✅ Có, chất lượng cao | `webhook/facebook`, `intake.ts`, `send.ts` | 85% | Lưu page_id/psid/mid, dedupe theo `mid`, verify chữ ký, xử lý cửa sổ 24h (`messaging_type:RESPONSE`) |
| Facebook Comment-to-Inbox | ❌ Không có | — | 0% | Webhook chỉ đọc `entry.messaging`, không có `entry.changes`/`feed` |
| Zalo OA | ❌ Không có | — | 0% | Không có model/channel/webhook nào cho Zalo |
| Pipeline Kanban | ❌ Không có | chỉ có enum `Stage` trên Customer | 5% | Không có pipeline/stage/opportunity, không Kanban, không template ngành |
| Task Follow-up | ✅ Có | model `Task`, `api/tasks`, `TasksClient.tsx` | 55% | Có dueAt/assignee/status/type. **Thiếu** reminder, cảnh báo quá hạn, cảnh báo lead nóng |
| Order Lite | ❌ Không có | — | 0% | Không có Product/Order/OrderItem; "Offer" chỉ là text quảng cáo |
| Bot Lite / Automation | 🟡 Một phần | `engine.ts`, `Flow/FlowStep`, EmailSequence | 40% | Có flow keyword/postback + bot handoff + nhắc-tạo-task khi HOT (hardcode). **Chưa** có rule engine "trigger→action" dạng template, chưa có "nhắc sale sau X phút", bot không tạo đơn nháp |
| Founder Dashboard | 🟡 Một phần | `dashboard/page.tsx`, `api/stats` | 35% | Có: khách mới hôm nay, hội thoại mở, khách HOT, cần follow-up, top tag/sản phẩm. **Thiếu**: thời gian phản hồi, cơ hội mở, doanh thu dự kiến/đã chốt, tỷ lệ chuyển stage, sale performance, đơn theo trạng thái |
| Reporting | ❌ Gần như không | — | 10% | Không báo cáo theo sale/kênh, không funnel report, không export |
| UX / Localization | 🟡 | toàn bộ UI | 60% | Tiếng Việt 100% ✓. **Chưa** mobile-first; chưa có VND (chưa có tiền); timezone "hôm nay" dùng giờ server |
| Security / Multi-tenant | 🟡 | xem mục 9 | — | Token mã hóa ✓, verify webhook ✓. **Thiếu** role enforcement, tenant isolation, soft delete, rate limit webhook |

---

## 4. Gap Analysis vs D.C FUNNEL CRM Spec

P0 = bắt buộc để MVP chạy · P1 = quan trọng sau P0 · P2 = nên có · P3 = chưa làm. Độ khó: S (0.5–1d) · M (1–3d) · L (3–7d) · XL (chia nhỏ).

| Yêu cầu sản phẩm | Hiện có | Thiếu gì | Ưu tiên | Khó | File cần sửa/tạo |
|---|---|---|---|---|---|
| **Multi-brand Workspace** | ❌ | Org/Workspace/WorkspaceMember + `workspaceId` mọi bảng + switch brand + tenant scoping | **P0** | **XL** | `schema.prisma`, mọi route trong `api/`, `auth.ts`, `api.ts` |
| **Role & permission đủ 5 vai** | 🟡 ADMIN/SALE | thêm AGENCY_ADMIN/OWNER/MANAGER/MARKETER + `requireRole` ở backend | **P0** | **M** | `schema.prisma`, `src/lib/api.ts`, tất cả route ghi dữ liệu |
| **Pipeline Sale Kanban** | ❌ | Pipeline/Stage/Opportunity, UI kéo-thả, template ngành, tổng giá trị/stage, cảnh báo quá hạn | **P0** | **L** | model mới + `app/pipeline/` + `api/pipelines`, `api/opportunities` |
| **Order Lite** | ❌ | Product/Order/OrderItem, tạo đơn trong chat, trạng thái đơn, COD/CK/cọc, lịch sử đơn trong contact | **P0** | **L** | model mới + `api/orders` + nút "Tạo đơn" trong `InboxClient.tsx` |
| **Comment-to-Inbox** | ❌ | Xử lý `feed` webhook, detect SĐT trong comment, ẩn comment, public/private reply, tạo contact từ comment, gắn source post | **P0** | **L** | `webhook/facebook/route.ts`, `facebook-client.ts`, model `Comment` |
| **Contact 360 đầy đủ** | 🟡 | Trang `/contacts` (list+detail), note riêng, custom field, giới tính/sinh nhật/địa chỉ, dedup theo phone/email, owner | **P0/P1** | **M** | `app/contacts/` mới, mở rộng `Customer`, model `Note` |
| **Founder Dashboard đầy đủ** | 🟡 | Response time, cơ hội mở, doanh thu dự kiến/chốt, tỷ lệ chuyển stage, sale performance, lead source, đơn theo trạng thái | **P1** | **M** | `api/stats/route.ts`, `dashboard/page.tsx` (phụ thuộc Pipeline+Order) |
| **Automation template (rule engine)** | 🟡 | Bảng `automation_rules` trigger→action; template: comment có SĐT→ẩn+tag, nhắc sale sau 5', tag Nóng→task, đơn "Đã nhận"→task review | **P1** | **L** | model mới + worker/cron, refactor một phần `engine.ts` |
| **Task reminder/cảnh báo** | 🟡 | Cảnh báo quá hạn, lead nóng chưa xử lý, notification | **P1** | **M** | `tasks`, dashboard, cron |
| **Channel abstraction** | ❌ | Model `Channel` chung (FB Page / FB comment / Zalo) thay vì chỉ `FacebookPage` | **P1** | **M** | refactor `schema.prisma` |
| **Bộ lọc inbox đầy đủ** | 🟡 | "Của tôi / Chưa đọc / Cần xử lý / Chưa gán / Khách nóng / theo tag/nhân viên" + cờ `unread` | **P1** | **M** | `api/conversations/route.ts`, `InboxClient.tsx` |
| **Mobile-first cho sale** | ❌ | Inbox/AppShell responsive (đang fixed 3×`w-80`) | **P1** | **M/L** | `AppShell.tsx`, `InboxClient.tsx` |
| **Reporting + export** | ❌ | Báo cáo theo sale/kênh, funnel lead→order, export CSV | **P2** | **M** | route + page mới |
| **Zalo OA** | ❌ | Connect OA, webhook, gửi tin, phân biệt session/ZNS | **P2** | **L** | channel + lib/zalo + webhook |
| **Realtime inbox** | ❌ (polling) | WebSocket/SSE thay polling 5s | **P2** | **M** | infra mới |
| **Timezone Asia/Ho_Chi_Minh** | 🟡 | "Hôm nay" đang theo giờ server | **P1** | **S** | `stats`, `dashboard` |
| **VND mặc định** | ❌ (chưa có tiền) | Util format VND, dùng Prisma `Decimal`/Int khi thêm Order | **P1** | **S** | lib mới (đi kèm Order) |
| **Soft delete + audit timeline** | 🟡 | `deletedAt`, activity log thống nhất trên contact | **P2** | **M** | schema + query |
| **Tests** | ❌ | Unit cho phone/engine, e2e webhook | **P2** | **M** | thêm vitest |

---

## 5. Database Schema Review

Schema hiện có **20 model** (`prisma/schema.prisma`). Map theo danh sách bảng spec yêu cầu:

| Bảng spec | Hiện có? | Khoảng cách / Đề xuất | workspaceId? | Soft delete? |
|---|---|---|---|---|
| `organizations` | ❌ | **Tạo mới**: `id, name, plan, createdAt`. Tầng agency. | — | nên |
| `workspaces` | ❌ (gần nhất: `BrandProfile`) | **Tạo mới**: `id, orgId, name, industry, timezone(default Asia/Ho_Chi_Minh), currency(default VND)`. Gộp `BrandProfile` vào đây. | (chính nó) | nên |
| `users` | ✅ `User` | Thêm liên kết workspace qua `workspace_members`; mở rộng `Role` | gián tiếp | nên |
| `workspace_members` | ❌ | **Tạo mới**: `userId, workspaceId, role` (AGENCY_ADMIN/OWNER/MANAGER/SALE/MARKETER), `@@unique([userId,workspaceId])` | ✅ | — |
| `channels` | ❌ (chỉ `FacebookPage`) | **Tạo mới** trừu tượng: `id, workspaceId, type(FB_PAGE/FB_COMMENT/ZALO_OA), externalId, name, status, credentialsRef`. Giữ `FacebookPage` như chi tiết FB. | ✅ | nên |
| `contacts` | ✅ `Customer` | Thêm: `workspaceId, gender, birthday, address, ownerId, customFieldsJson`. Đã có name/phone/email/source/tags/score/stage. Cân nhắc dedup `@@unique([workspaceId, phone])`. | ✅ (mới) | nên |
| `tags` | ❌ (đang `String[]`) | **Tạo mới** chuẩn hóa: `id, workspaceId, name, color`, `@@unique([workspaceId,name])` | ✅ | — |
| `contact_tags` | ❌ | **Tạo mới**: `contactId, tagId` (giữ `String[]` cũ để tương thích lúc chuyển) | qua contact | — |
| `conversations` | ✅ `Conversation` | Thêm: `workspaceId, channelId, unread(Bool), firstResponseAt` (đo response time) | ✅ (mới) | nên |
| `messages` | ✅ `Message` | Thêm: `workspaceId, channelId`; có sẵn dedupe `metaMessageId @unique` | ✅ (mới) | — |
| `comments` | ❌ | **Tạo mới**: `id, workspaceId, channelId, postId, commentId@unique, fromName, fromId, text, hasPhone, hidden, contactId, createdAt` | ✅ | — |
| `pipelines` | ❌ | **Tạo mới**: `id, workspaceId, name, industryTemplate, isDefault` | ✅ | nên |
| `stages` | ❌ (chỉ enum) | **Tạo mới**: `id, pipelineId, name, order, color`. (Giữ enum `Stage` của CRM cũ tách biệt) | qua pipeline | — |
| `opportunities` | ❌ | **Tạo mới**: `id, workspaceId, contactId, pipelineId, stageId, title, value(Decimal/Int VND), ownerId, expectedCloseAt, lastActivityAt, status(OPEN/WON/LOST)` | ✅ | nên |
| `tasks` | ✅ `Task` | Thêm: `workspaceId, opportunityId?, orderId?, remindAt`; mở rộng `TaskType` (gửi báo giá, nhắc cọc, xác nhận đơn, nhắc lịch, xin review) | ✅ (mới) | nên |
| `notes` | ❌ | **Tạo mới**: `id, workspaceId, contactId, authorId, body, createdAt` | ✅ | nên |
| `products` | ❌ | **Tạo mới**: `id, workspaceId, name, sku?, price(Int VND), isActive` | ✅ | nên |
| `orders` | ❌ | **Tạo mới**: `id, workspaceId, contactId, ownerId, status(NEW→CONFIRMED→SHIPPING→DELIVERED→RETURNED/CANCELLED), subtotal, discount, shipFee, total, paymentMethod(COD/BANK/DEPOSIT), note, createdAt`. Tiền dùng **Int (đồng)** hoặc `Decimal`. | ✅ | nên |
| `order_items` | ❌ | **Tạo mới**: `id, orderId, productId?, name, qty, price, lineTotal` | qua order | — |
| `automation_rules` | 🟡 (`Flow/FlowStep` + `EmailSequence`) | **Tạo mới** generic: `id, workspaceId, name, triggerType, triggerConfigJson, actionType, actionConfigJson, isActive`. Giữ Flow cho kịch bản chat. | ✅ | — |
| `activities` | 🟡 (`FunnelEvent`, `IntegrationAuditLog`) | **Tạo mới** thống nhất timeline: `id, workspaceId, contactId?, userId?, type, refId, dataJson, createdAt`. | ✅ | — |

**Index/constraint cần lưu ý:** mọi bảng tenant cần index dẫn đầu bằng `workspaceId` (vd `@@index([workspaceId, createdAt])`); `comments.commentId @unique` và `messages.metaMessageId @unique` để idempotency; `contact_tags @@unique([contactId,tagId])`. **Tất cả phải thêm `workspaceId` nếu chọn hướng multi-tenant** — đây là thay đổi lan rộng nhất.

---

## 6. API / Backend Review

**Điểm mạnh:**
- Chuẩn hóa response qua `src/lib/api.ts` (`jsonOk/jsonError`), `export const dynamic = "force-dynamic"` đúng chỗ.
- Webhook FB (`webhook/facebook/route.ts`) làm chuẩn: verify GET challenge, verify chữ ký `X-Hub-Signature-256`, luôn trả 200 nhanh, ghi `FacebookWebhookLog`, bỏ qua khi page chưa connect / bot tắt / status không hợp lệ, dedupe theo `mid` trong `intake.ts`.
- FB integration service (`facebook-integration-service.ts`) đầy đủ: OAuth state, đổi long-lived token, list page, subscribe app, health check, disconnect, toggle bot, audit log.

**Thiếu / cần làm:**
- ❌ **Không có `requireRole`/`requireAdmin`** — `src/lib/api.ts` `requireApiUser()` chỉ trả user nếu đã đăng nhập. Mọi route ghi (xóa offer, disconnect page, toggle bot, gửi email test) chỉ cần "đăng nhập" — SALE cũng gọi được route lẽ ra admin-only.
- ❌ **Không có tenant scoping** — query không filter theo `workspaceId` (vì chưa có). Khi lên multi-tenant phải thêm `where: { workspaceId }` ở **mọi** route.
- ❌ **Endpoint còn thiếu**: `api/orders`, `api/products`, `api/pipelines`, `api/opportunities`, `api/contacts` (list), `api/comments`, `api/notes`, `api/automation-rules`, `api/reports`.
- ❌ **Webhook chưa xử lý comment**: cần nhánh `entry.changes` (field `feed`) song song với `entry.messaging`.
- 🟡 **Validation thủ công** (`String(body.x)`), không có zod — nên thêm schema validation cho route ghi.
- 🟡 **Rate limit**: util `ratelimit.ts` tồn tại (in-memory) nhưng **webhook FB không gọi** — nên rate limit theo IP/page cho POST webhook.

---

## 7. Frontend UI/UX Review

| Màn | Hiện có | File | Vấn đề UX | Cần update | Wireframe ngắn |
|---|---|---|---|---|---|
| Dashboard | ✅ | `dashboard/page.tsx` | Chỉ 4 KPI + top tag/sản phẩm; thiếu doanh thu/pipeline/sale | Thêm KPI doanh thu, cơ hội mở, response time, đơn theo trạng thái, sale performance | Top: filter page+thời gian · 8 KPI cards · 2 cột chart (funnel, sale) |
| Workspace switcher | ❌ | — | Không có | **Tạo mới** dropdown chọn brand ở `AppShell.tsx` | Góc trên sidebar: avatar brand ▾ → list workspace |
| Unified Inbox | ✅ | `InboxClient.tsx` | Desktop-only (fixed `w-80` ×2), polling 5s, lọc còn ít | Mobile responsive, thêm bộ lọc (của tôi/chưa đọc/chưa gán/nóng), badge unread, nút "Tạo đơn" | 3 cột co lại 1 cột trên mobile; tab lọc trên cùng |
| Contact list | ❌ | — | Không có trang riêng (chỉ qua inbox) | **Tạo `/contacts`**: bảng + filter + bulk tag | Bảng: tên/SĐT/stage/owner/lần cuối + filter trái |
| Contact detail 360 | 🟡 | panel phải `InboxClient.tsx` | Chỉ trong inbox; thiếu note, custom field, lịch sử đơn/pipeline | **Tạo `/contacts/[id]`** đầy đủ tab: hội thoại, đơn, pipeline, task, note | Header info · tabs · timeline activity |
| Pipeline Kanban | ❌ | — | Không có | **Tạo `/pipeline`** kéo-thả cột | Cột = stage; card = tên/giá trị/kênh/owner/task; tổng tiền đầu cột |
| Task list | ✅ | `TasksClient.tsx`, `tasks/page.tsx` | Chưa nhóm quá hạn/hôm nay, chưa reminder | Nhóm theo hạn, badge quá hạn đỏ, lọc theo người | Tab: Quá hạn/Hôm nay/Sắp tới |
| Order Lite | ❌ | — | Không có | **Tạo** modal "Tạo đơn" trong chat + `/orders` list | Modal: khách/SP/SL/giá/ship/giảm/total/thanh toán/trạng thái |
| Automation Template | 🟡 | `FlowsClient.tsx` (chỉ flow chat) | Chỉ sửa flow keyword/postback | **Tạo** trang chọn template rule bật/tắt | List template có toggle + cấu hình nhẹ |
| Settings / Channel | ✅ (FB) | `settings/integrations/` | Chỉ Facebook | Thêm Zalo, gom về "Channels" chung | Card mỗi kênh: trạng thái + connect |

**UX tổng:** Tiếng Việt 100% ✓. Empty state có nhưng còn mỏng (vd "Chưa có hội thoại nào." trong `InboxClient.tsx`) — spec yêu cầu empty state **hướng dẫn hành động** (thêm nút CTA). Chưa mobile-first.

---

## 8. Integration Review

| Tích hợp | Trạng thái | Chi tiết |
|---|---|---|
| Facebook Page Inbox | ✅ Tốt | OAuth thật, long-lived token, subscribe webhook, per-page token mã hóa, health check, gửi tin `messaging_type:RESPONSE` (tôn trọng cửa sổ 24h, `send.ts`) |
| Facebook webhook idempotency | ✅ | Dedupe theo `mid` (`intake.ts`); `metaMessageId @unique` |
| Facebook Comment-to-Inbox | ❌ | Chưa xử lý `feed`/comment; chưa detect/ẩn SĐT trong comment; chưa public/private reply |
| Zalo OA | ❌ | Không có gì |
| Realtime | ❌ | Polling 5s (`InboxClient.tsx`), chưa WebSocket/SSE |
| Notification | ❌ | Chưa có push/in-app; Task có `dueAt` nhưng không nhắc |
| Email (Resend) | ✅ Tốt (ngoài scope MVP mới) | Template/sequence/enrollment/log/unsubscribe/consent/cron — `src/lib/email/` |
| AI (OpenAI) | ✅ Optional | Gợi ý trả lời cho sale, không tự gửi (`ai/suggest.ts`) |

---

## 9. Security & Multi-tenant Review

| Hạng mục | Trạng thái | Chi tiết & khuyến nghị |
|---|---|---|
| 🔴 **Secret bị lộ** | **Critical** | `.env` chứa **DATABASE_URL Neon production thật** (user `neondb_owner`, password thật). **Rotate ngay** trên Neon, coi như đã lộ. Tốt là `.env` đã nằm trong `.gitignore`, nhưng password thật không nên để trong working tree dạng plaintext. |
| Secret dev khác | OK (dev) | `AUTH_SECRET`, `UNSUBSCRIBE_SECRET`, `CRON_SECRET` trong .env là placeholder dev → **phải đổi** khi deploy. `env.authSecret` còn fallback `"dev-insecure-secret-change-me"` (`env.ts`) — nên fail-fast nếu thiếu ở production. |
| Mã hóa token | ✅ Tốt | AES-256-GCM (`token-encryption.ts`), bắt buộc secret ≥32 ký tự, có `maskToken`. |
| Verify webhook | ✅ | `X-Hub-Signature-256` (`verify.ts`), bật khi có `META_APP_SECRET`. |
| Auth session | 🟡 | Cookie HMAC, httpOnly, sameSite=lax, secure ở prod ✓. Nhưng `iat` lưu mà **không kiểm hết hạn server-side** (dựa vào cookie maxAge). |
| **Role enforcement** | ❌ | Backend **không** check role — chỉ check đăng nhập (`api.ts`). Cần `requireRole`. |
| **Tenant isolation** | ❌ | Chưa có workspace → chưa có scoping. Khi multi-tenant: đây là rủi ro số 1, mọi query phải filter `workspaceId`; cân nhắc Prisma extension/middleware ép `workspaceId`. |
| Rate limit | 🟡 | Util in-memory có, dùng cho email test; **webhook FB & login chưa rate limit**. |
| Soft delete | ❌ | Toàn hard delete; chưa có `deletedAt`. |
| Audit log | 🟡 | Có `IntegrationAuditLog` (FB) + `FunnelEvent`; chưa có audit cho thao tác CRM (đổi stage, sửa contact, xóa). |
| Input validation | 🟡 | Thủ công, nên thêm zod cho route ghi. |

---

## 10. Priority Roadmap

**P0 — bắt buộc để là "D.C FUNNEL CRM":**
1. (An ninh) Rotate credential Neon + bịt lỗ `requireRole` backend + fail-fast khi thiếu secret prod.
2. **Chốt kiến trúc multi-tenant** (Workspace/Org/Member + `workspaceId`) — blocker chặn mọi thứ.
3. Pipeline Kanban (model + UI) — lõi CRM.
4. Order Lite (Product/Order/OrderItem + tạo đơn trong chat).
5. Comment-to-Inbox (webhook feed + detect/ẩn SĐT + tạo contact).
6. Contact 360 (trang riêng + note + field + owner).

**P1:** Founder dashboard đủ KPI · Automation rule engine (template) · Task reminder/cảnh báo · Channel abstraction · Bộ lọc inbox đầy đủ · Mobile-first inbox · Timezone Asia/Ho_Chi_Minh · VND util.

**P2:** Reporting + export CSV · Zalo OA · Realtime (WebSocket) · Soft delete + audit timeline · Tests · Migration baseline.

**P3 (đúng như spec "không ưu tiên"):** POS đa kho, kho/kiểm kê, kế toán/đối soát COD, marketplace, LMS, Voice AI, funnel builder, white-label sâu, flow builder canvas, broadcast hàng loạt, affiliate.

---

## 11. 30-Day Update Plan

> Giả định 1–2 dev. Mọi thay đổi schema làm **additive** (thêm cột/bảng nullable, `db push` hoặc migration mới), **không** phá dữ liệu cũ.

### Tuần 1 — Audit & Stabilize + nền Workspace
- **Mục tiêu:** an toàn để build tiếp; chốt hướng tenancy.
- **Task:** Rotate Neon credential; thêm `requireRole()` + áp cho route admin-only; fail-fast secret ở prod; **tạo `prisma/migrations` baseline**; (sau khi founder chốt) thêm model `Organization/Workspace/WorkspaceMember`, seed 1 workspace mặc định, thêm `workspaceId` (nullable) vào các bảng + backfill.
- **File:** `src/lib/api.ts`, `src/lib/env.ts`, `prisma/schema.prisma`, `prisma/seed.ts`.
- **Rủi ro:** đổi DB credential làm app local mất kết nối → cập nhật .env đồng thời. Thêm `workspaceId` lan rộng → làm nullable + backfill trước khi ép `NOT NULL`.
- **Acceptance:** typecheck pass; SALE bị 403 ở route admin; mọi dòng dữ liệu cũ có `workspaceId` của workspace mặc định.

### Tuần 2 — CRM Core (Pipeline + Contact)
- **Mục tiêu:** quản lý lead → chốt bằng Kanban; contact 360.
- **Task:** model Pipeline/Stage/Opportunity + seed template ngành (Thời trang/Studio/Salon/Agency); `app/pipeline/` Kanban kéo-thả; `app/contacts/` list + `[id]` detail; model `Note`; thêm field contact (giới tính/sinh nhật/địa chỉ/owner/customFields).
- **File:** `schema.prisma`, `api/pipelines`, `api/opportunities`, `api/contacts`, `app/pipeline/`, `app/contacts/`.
- **Rủi ro:** trùng khái niệm với enum `Stage` cũ → giữ enum cho "lead stage CRM", pipeline stage là khái niệm riêng cho cơ hội.
- **Acceptance:** tạo cơ hội từ contact, kéo qua stage, tổng giá trị/stage hiển thị, cảnh báo quá hạn.

### Tuần 3 — Social Inbox depth (Comment-to-Inbox)
- **Mục tiêu:** kéo comment về, tạo contact, giấu SĐT.
- **Task:** nhánh `entry.changes`/`feed` trong `webhook/facebook/route.ts`; model `Comment`; tái dùng `phone.ts` để detect; gọi Graph API ẩn comment + private reply; tạo contact + gắn source post/campaign; thêm bộ lọc inbox (của tôi/chưa đọc/chưa gán/nóng); badge unread.
- **File:** `facebook-client.ts`, `intake.ts`, `api/conversations/route.ts`, `InboxClient.tsx`.
- **Rủi ro:** quyền `pages_manage_engagement` để ẩn comment; tránh ẩn nhầm; idempotency theo `commentId`.
- **Acceptance:** comment có SĐT → tự ẩn + tạo contact + vào inbox "cần xử lý".

### Tuần 4 — Order Lite + Automation + Dashboard
- **Mục tiêu:** chốt đơn trong chat + tự động hóa + báo cáo.
- **Task:** model Product/Order/OrderItem; modal "Tạo đơn" trong `InboxClient.tsx`; trạng thái đơn; VND util; model `automation_rules` + worker cron cho template (nhắc sale sau 5', đơn "Đã nhận"→task review, tag Nóng→task); nâng cấp `api/stats` + `dashboard` (doanh thu, cơ hội, response time, sale perf, đơn theo trạng thái).
- **Rủi ro:** tiền dùng Int (đồng) hoặc Decimal — tránh float; cron cần idempotent.
- **Acceptance:** tạo đơn từ chat → hiện trong contact + dashboard doanh thu; rule "nhắc sale" chạy.

---

## 12. Recommended First Pull Request

**PR #1 — "Stabilize & Secure" (nhỏ, low-risk, giá trị cao, không phụ thuộc quyết định tenancy):**

Phạm vi:
1. **Rotate + scrub** credential Neon trong `.env` (việc ops, làm trước); thêm cảnh báo trong README rằng `.env` không được chứa secret thật chung máy.
2. Thêm `requireRole(role)` / `requireAdmin()` vào `src/lib/api.ts` và áp cho các route admin-only (offers ghi/xóa, facebook connect/disconnect/toggle, email send-test).
3. Fail-fast: ở production, ném lỗi nếu `AUTH_SECRET`/`TOKEN_ENCRYPTION_SECRET` còn là giá trị mặc định (`env.ts`).
4. Sửa "hôm nay" theo **Asia/Ho_Chi_Minh** trong `stats/route.ts` + `dashboard/page.tsx` (thay `setHours(0,0,0,0)` giờ server).
5. Tạo **migration baseline** (`prisma migrate dev --name init`) để có lịch sử migration cho production.

Vì sao PR này trước: đóng lỗ hổng an ninh thật (credential + phân quyền), không đụng schema lan rộng, không phụ thuộc quyết định kiến trúc, và mở đường (migration baseline) cho mọi thay đổi schema sau. Ước lượng **S–M (1–2 ngày)**.

> PR #2 đề xuất: "Pipeline Kanban MVP" (additive, độc lập tenancy) — mang lại giá trị CRM nhìn thấy ngay.

---

## 13. Questions / Blockers (cần hỏi founder trước khi code)

1. 🔑 **Multi-tenant hay multi-instance?** Đây là blocker lớn nhất. Spec mới mô tả agency quản lý nhiều brand trong **một** hệ thống (multi-tenant), nhưng app hiện **cố ý single-brand, mỗi brand 1 deploy**. Chọn:
   - **(A) Multi-tenant thật** (thêm Workspace + `workspaceId` mọi nơi) — đúng tầm nhìn, công sức XL, đụng mọi query.
   - **(B) Giữ single-brand**, làm "agency console" gộp sau. Nhanh hơn nhưng không khớp spec "data không lẫn giữa workspace".
   - → Khuyến nghị **(A)** nhưng làm theo lát cắt additive. Cần founder xác nhận trước khi đụng schema.
2. **Số điện thoại = định danh contact?** Có dedup/merge contact theo phone/email across kênh không? (ảnh hưởng `@@unique` và logic comment→contact).
3. **Comment-to-Inbox**: app Facebook đã (hoặc sẽ) xin quyền `pages_manage_engagement` / `pages_read_engagement` để ẩn comment & private reply chưa? (chặn kỹ thuật).
4. **Zalo OA**: có OA chính thống + được duyệt API không, hay để P2? (spec để "cơ bản" trong MVP1).
5. **Email module (Resend)**: spec mới **không liệt kê email** trong MVP1. Giữ nguyên (đang chạy tốt) hay ẩn khỏi nav để gọn?
6. **Tiền tệ/đơn**: VND lưu dạng Int (đồng) được chứ? Đơn có cần mã đơn tự sinh theo brand không?
7. **Realtime**: chấp nhận polling 5s cho MVP, hay cần WebSocket ngay (ảnh hưởng infra/deploy)?
8. **Deploy target**: Vercel (đã có cron email) hay VPS/Docker? (ảnh hưởng cron automation & WebSocket).

---

### Tóm tắt 1 dòng cho founder
Sản phẩm hiện tại là **một funnel bot Facebook single-brand làm rất chắc** (giữ lại toàn bộ tầng FB, funnel engine, email, token security). Để thành **D.C FUNNEL CRM**, cần quyết định lớn về **multi-tenant**, rồi bồi thêm 3 trụ còn thiếu — **Pipeline, Order Lite, Comment-to-Inbox** — theo cách additive; và xử lý ngay **credential DB bị lộ** + **phân quyền backend**.
