# D.C FUNNEL CRM — Branch & Ownership Rules

**Phiên bản:** v1.0
**Ngày tạo:** 2026-06-14
**Owner tài liệu:** Claude (Product UI/UX Owner)
**Nguồn chân lý điều phối:** `docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md` (mục 5–8, 16). Tài liệu này **diễn giải & thao tác hoá** các quy tắc đó cho việc làm hằng ngày của 2 agent.

> Nếu tài liệu này và plan mâu thuẫn → **plan thắng**. Khi phát hiện lệch, ghi vào mục 19 của plan.

---

## 1. Hai agent & ranh giới

| Agent | Vai trò | Làm gì | KHÔNG làm |
|---|---|---|---|
| **Codex** | Backend/Core Owner | Schema, migration, auth/session/role, workspace/tenant isolation, API routes, validation, Facebook webhook + comment backend, Pipeline/Contact/Order/Automation/Stats API, typecheck/build | Không tự làm UI lớn nếu chưa được giao |
| **Claude** | Product UI/UX Owner | Product docs, UI/UX spec, AppShell, Workspace switcher UI, Dashboard/Inbox/Contacts/Pipeline/Order/Automation UI, empty state, mobile responsive, microcopy VN, UI docs | Không sửa Prisma/Auth/API core/Facebook; không tự chế API contract |

Nguyên tắc tối thượng: **một file có đúng một owner chính.** Người không phải owner chỉ chạm khi có **handoff** ghi rõ.

---

## 2. File Ownership (bảng chuẩn)

Mở rộng từ plan mục 6. ✅ owner toàn quyền · 🟡 sửa có điều kiện/handoff · ❌ không chạm.

| Đường dẫn | Codex | Claude | Ghi chú |
|---|---|---|---|
| `prisma/schema.prisma` | ✅ | ❌ | Mọi thay đổi schema do Codex; additive only |
| `prisma/seed.ts` | ✅ | 🟡 chỉ đề xuất nội dung qua docs | Claude không sửa trực tiếp |
| `prisma/migrations/**` | ✅ | ❌ | |
| `src/lib/auth.ts` | ✅ | ❌ | |
| `src/lib/api.ts` | ✅ | ❌ | `requireRole`/helper auth |
| `src/lib/env.ts` | ✅ | ❌ | |
| `src/lib/workspace.ts` | ✅ | ❌ (cho tới khi handoff) | Helper current workspace |
| `src/lib/facebook/**` | ✅ | ❌ | |
| `src/app/api/**` | ✅ | ❌ | Mọi route handler |
| `src/types/**` | ✅ tạo contract | 🟡 dùng theo contract | Claude import type, không định nghĩa lại API shape |
| `src/lib/**` (khác) | ✅ | 🟡 util UI thuần (vd format) có thể tạo file mới riêng, không đụng file core | Thống nhất trước nếu chung file |
| `src/components/**` | 🟡 chỉ helper/type nếu cần | ✅ | Claude owner UI components |
| `src/components/InboxClient.tsx` | 🟡 | ✅ | **Không cùng sửa 1 PR** nếu chưa chia vùng |
| `src/components/AppShell.tsx` | ❌ | ✅ | **Không sửa** cho workspace switcher tới khi workspace API chốt |
| `src/app/dashboard/**` | 🟡 chỉ API stats liên quan | ✅ | |
| `src/app/inbox/**` | 🟡 API/conversation | ✅ | |
| `src/app/contacts/**` | 🟡 API/model | ✅ | |
| `src/app/pipeline/**` | 🟡 API/model | ✅ | |
| `src/app/orders/**` | 🟡 API/model | ✅ | |
| `src/app/settings/**` | 🟡 phần kênh/API | ✅ UI | Facebook settings API là Codex |
| `docs/**` | 🟡 technical note | ✅ | Claude owner docs; Codex thêm note kỹ thuật khi cần |
| `README.md` | ✅ (secret/setup) | 🟡 phần UI/usage | PR #1 Codex cập nhật cảnh báo secret |

---

## 3. Quy tắc tránh conflict

1. **Không** sửa `schema.prisma` nếu không phải Codex.
2. **Không** cùng sửa `InboxClient.tsx` trong một PR khi chưa chia vùng rõ ràng (ghi vùng trong mô tả PR).
3. **Không** sửa `AppShell.tsx` cho workspace switcher khi workspace API chưa `READY`.
4. **Không** đổi API contract tuỳ ý **sau khi** Claude đã build UI theo contract. Nếu buộc đổi → Codex ghi **breaking change** vào mục 16 plan + báo Claude (mục 8 dưới).
5. Mỗi PR **chỉ chạm file thuộc owner của mình** + file có handoff rõ.
6. PR nhỏ, một mục tiêu. Không trộn nhiều module trong 1 PR.

---

## 4. API Contract Handoff (cổng chặn quan trọng nhất)

> **Claude không build UI thật phụ thuộc dữ liệu cho tới khi contract tương ứng = `READY`.** Đây là quy tắc chống lãng phí & chống lệch.

**Vòng đời contract** (ghi ở plan mục 16):

```text
NOT_READY  → Codex chưa chốt. Claude chỉ được làm: wireframe, microcopy, layout tĩnh, mock nội bộ.
READY      → Codex đã chốt endpoint + response shape + ngày cập nhật. Claude được build UI thật.
CHANGED    → Contract đổi sau khi READY. Codex PHẢI mô tả breaking change. Claude rà UI bị ảnh hưởng.
```

**Trước khi build một UI phụ thuộc API, Claude kiểm:**
- [ ] Mục 16 plan có entry cho API này?
- [ ] Status = `READY`?
- [ ] Có endpoint + ví dụ response?
- [ ] `Last updated` mới hơn lần đổi gần nhất?

Nếu chưa → Claude dừng phần đó, ghi blocker (mục 19 plan), làm phần không phụ thuộc (wireframe/microcopy/empty state tĩnh).

**Cặp phụ thuộc UI ↔ API (theo plan mục 8):**

| UI (Claude) | Cần contract | Codex PR |
|---|---|---|
| PR #2B Workspace UI | `16.1 Workspace API` | PR #2 |
| PR #3B Pipeline UI | `16.2 Pipeline API` | PR #3 |
| PR #4B Contact UI | `16.3 Contact API` | PR #4 |
| PR #5B Order UI | `16.4 Order API` | PR #5 |
| PR #6B Comment UI | `16.5 Comment API` | PR #6 |
| PR #7B Automation UI | (Automation contract) | PR #7 |
| PR #8B Dashboard UI | (Stats contract) | PR #8 |

---

## 5. Branch Strategy

Theo plan mục 7:

```text
main
├── codex/01-secure-stabilize       (PR #1)
├── claude/01-docs-ui-foundation     (PR #1B)  ← ĐANG Ở ĐÂY
├── codex/02-workspace-core          (PR #2)
├── claude/02-workspace-ui           (PR #2B)
├── codex/03-pipeline-api            (PR #3)
├── claude/03-pipeline-ui            (PR #3B)
├── codex/04-contact-api             (PR #4)
├── claude/04-contact-ui             (PR #4B)
├── codex/05-order-api               (PR #5)
├── claude/05-order-ui               (PR #5B)
├── codex/06-comment-backend         (PR #6)
├── claude/06-comment-ui             (PR #6B)
├── codex/07-automation-api          (PR #7)
├── claude/07-automation-ui          (PR #7B)
├── codex/08-stats-api               (PR #8)
└── claude/08-dashboard-ui           (PR #8B)
```

**Quy ước đặt tên branch:** `<agent>/<số thứ tự>-<slug ngắn>`.

> ⚠️ **Lưu ý hiện trạng:** thư mục dự án hiện **chưa khởi tạo git** (không có `.git`). Các tên branch trên là quy ước để dùng khi repo được `git init` / đẩy lên remote. PR #1B đang được làm trực tiếp trên working tree. **Đề xuất gửi anh Đức:** khởi tạo git + tạo branch theo bảng trên trước khi vào PR #2/#2B để tách vùng làm việc 2 agent. (Ghi như decision mới trong mục 19 plan.)

---

## 6. Merge Rules

1. Codex PR (schema/API) **merge trước** UI phụ thuộc.
2. Claude PR (UI) chỉ merge khi contract đã `READY` và ổn định.
3. Mỗi PR cần: **Summary · Files changed · Test result · Risk · Handoff**.
4. **Không merge nếu `typecheck` fail**, trừ khi founder chấp nhận rõ ràng.
5. Thứ tự khuyến nghị: `#1` & `#1B` (song song) → `#2` → `#2B` → `#3`/`#4` (API) → `#3B`/`#4B` (UI) → `#5`/`#5B` → `#6`/`#6B` → `#7`/`#7B` → `#8`/`#8B`.

---

## 7. PR Checklist & Report Template

**Trước khi mở PR:**
- [ ] Chỉ chạm file thuộc owner mình (+ handoff đã ghi).
- [ ] `npm run typecheck` pass (hoặc ghi lý do).
- [ ] `npm run lint` / `npm run build` nếu chạy được.
- [ ] Không sửa schema/auth/api core nếu là Claude.
- [ ] Không tạo/đổi API contract nếu là Claude.
- [ ] Cập nhật plan: mục 17 (daily), 18.x (PR report), 16 (nếu Codex có API mới), 19 (nếu có blocker).

**Mẫu báo cáo PR (điền vào plan mục 18.x):**
```text
Status: TODO/IN_PROGRESS/DONE/BLOCKED
Branch:
Summary:
Files changed:
Tests:
Risks:
Handoff:
```

---

## 8. Handoff Protocol (khi cần chạm vùng của nhau)

**Khi Claude cần Codex (vd thêm field response, thêm filter API):**
1. Ghi yêu cầu vào mục 19 plan (Blockers) hoặc phần "Cần agent kia hỗ trợ" của daily report (mục 17).
2. Nêu rõ: endpoint, field cần, lý do UI, mức ưu tiên.
3. Chờ Codex cập nhật contract (mục 16) sang `READY`/`CHANGED`.

**Khi Codex cần Claude (vd đổi shape làm vỡ UI):**
1. Codex ghi breaking change ở mục 16 + đánh dấu contract `CHANGED`.
2. Nêu UI nào bị ảnh hưởng.
3. Claude rà & cập nhật UI ở PR riêng.

**Khi cần chạm chung 1 file (vd InboxClient):**
1. Thoả thuận vùng (dòng/section) trong mô tả PR trước khi sửa.
2. Không sửa ngoài vùng đã thoả thuận.

---

## 9. Ownership Status Board (cập nhật theo tiến độ)

| Vùng | Owner | Trạng thái hiện tại |
|---|---|---|
| Docs (`docs/**`) | Claude | ✅ PR #1B DONE (spec, wireframe, ownership) |
| Secure & Stabilize (api.ts/env.ts/stats/README) | Codex | ✅ PR #1 DONE |
| Workspace API (`src/lib/workspace.ts`, `api/workspaces`) | Codex | ✅ PR #2 DONE — contract 16.1 `READY`; migration applied + backfill + smoke test PASS |
| Workspace UI (`AppShell`, `components/workspace`, `settings/workspaces`) | Claude | ✅ PR #2B DONE — verified; B-010 cleared |
| Pipeline API (PR #3) | Codex | ✅ DONE — contract 16.2 `READY`; migrate deploy + smoke test PASS |
| Pipeline UI (PR #3B) | Claude | ✅ DONE — Kanban + tạo/đổi stage/trạng thái |
| Contact API (PR #4) | Codex | ✅ DONE — contract 16.3 `READY`; migrate deploy + smoke test PASS |
| Contact UI (PR #4B) | Claude | ✅ DONE — list + 360 detail + notes + timeline; typecheck + full build PASS |
| Order API (PR #5) | Codex | ✅ DONE — contract 16.4 `READY`; migrate deploy + smoke test PASS (working tree chưa commit trên codex/05-order-api) |
| Order UI (PR #5B) | Claude | ✅ DONE — list + detail + đổi trạng thái + modal tạo đơn; tích hợp Contact tab "Đơn hàng"; typecheck + next build PASS |
| Comment API (PR #6) | Codex | ✅ DONE — contract 16.5 `READY`; migrate deploy + smoke test PASS (Graph reply/hide chờ Meta perms — D-002) |
| Comment UI (PR #6B) | Claude | ✅ DONE — list + filter nhanh + chi tiết + reply/ẩn/follow-up; tích hợp Contact tab "Bình luận"; typecheck + next build PASS |
| Automation API (PR #7) | Codex | ✅ DONE — contract 16.6 `READY`; migrate deploy + smoke + hooks PASS (SEND_EMAIL/WEBHOOK khóa an toàn) |
| Automation UI (PR #7B) | Claude | ✅ DONE — rules + templates + toggle + dry-run test + runs; typecheck + next build PASS |
| Founder Stats API (PR #8) | Codex | ✅ DONE — contract 16.7 `READY`; smoke PASS (founder-stats.ts còn ở working tree, cần commit) |
| Founder Dashboard UI (PR #8B) | Claude | ✅ DONE — range + so sánh kỳ trước + 8 card + sections + chart CSS; typecheck + next build PASS |
| UI Refresh (PR #9A) | Claude | ✅ DONE — design system + glass sidebar (nav 7 nhóm phòng ban) + topbar + polish; không đụng backend; typecheck + build PASS |

> 🏁 **MVP1 UI hoàn tất** (PR #1B, #2B, #3B, #4B, #5B, #6B, #7B, #8B). Việc còn lại là vận hành: founder merge nhánh `claude/*`, Codex commit backend ở working tree, smoke D-002 (Meta pages_manage_engagement cho reply/hide comment).

> Claude cập nhật cột "trạng thái" khi bắt đầu/đóng mỗi PR UI; Codex cập nhật khi API contract đổi trạng thái.

---

*Hết tài liệu ownership. Mọi tranh chấp vùng làm việc → chiếu plan mục 6 & 16, rồi ghi quyết định vào mục 19.*
