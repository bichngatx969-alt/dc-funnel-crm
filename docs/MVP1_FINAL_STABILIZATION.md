# D.C FUNNEL CRM — Final MVP1 Stabilization Report

- **Ngày:** 2026-06-15
- **Người thực hiện:** Claude (Product UI/UX Owner)
- **Branch:** `claude/08-dashboard-ui`
- **Phạm vi:** Ổn định cuối MVP1 (không thêm feature; không Zalo; không POS/kho/kế toán; không refactor lớn).
- **Nguồn chi tiết:** `docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md` mục 17 / 18 / 19.

> **Cập nhật vận hành 2026-06-16 — Codex:** production đã chạy trên Dokploy/OneDash tại `https://crm.hongducdigital.com`; Facebook OAuth/webhook đã được fix và smoke pass ở mức route/env. Chi tiết ở plan mục 17, 18.18, 19.

---

## 1. Git status

> **Cập nhật 2026-06-15:** B-021 đã **RESOLVED** — 2 file dưới đã commit `5f1155e`; `git status` hiện **SẠCH hoàn toàn**. Phần dưới giữ làm ảnh chụp trạng thái tại thời điểm stabilization.

**Tại thời điểm stabilization — chưa sạch hoàn toàn** — còn đúng 2 file thuộc Codex (cố ý KHÔNG gộp vào commit "pr8" để tránh sai nhãn):

```
 M  src/lib/facebook/comments.ts            # PR#7 hook automation (COMMENT_CREATED / COMMENT_HAS_PHONE)
??  prisma/migrations/migration_lock.toml   # artifact prisma migration
```

→ Đề nghị **Codex commit** 2 file này (xem B-021). Sau đó repo sạch.

**Phân loại file dirty đầu bước:**

| Nhóm | File | Xử lý |
|---|---|---|
| Backend/Codex | `src/lib/founder-stats.ts` (PR#8, untracked) | ✅ đã commit `fb8b6a4` |
| Backend/Codex | `src/lib/facebook/comments.ts` (PR#7 hook) | ⏳ để Codex commit (B-021) |
| Migration | `prisma/migrations/migration_lock.toml` | ⏳ để Codex commit (B-021) |
| Docs (Claude) | `docs/dev/BRANCH_AND_OWNERSHIP.md` | ✅ đã commit `8d91aca` |
| UI/Claude | — | ✅ PR#8B đã commit `c9dc7a8` |
| File lạ ngoài scope | — | không có |

---

## 2. Commit đã tạo (không dùng `git add .`)

| Commit | Nội dung |
|---|---|
| `fb8b6a4` **complete pr8 founder stats api** | Bổ sung `src/lib/founder-stats.ts` — commit PR#8 gốc `cf25ff8` chỉ có route, **thiếu lib** nên không build độc lập; nay đã hoàn tất. |
| `8d91aca` **docs: final mvp1 stabilization report** | Cập nhật plan mục 17 / 19.2 / 19.3 + sync status board. |

> PR#8B (UI dashboard) đã được commit sẵn `c9dc7a8` → không commit lại.

---

## 3. Tests — PASS

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npx prisma generate` | ✅ PASS (~5s) |
| `npm run build` | ✅ PASS (exit 0, ~49s) — Compiled + types valid + static 5/5 + traces |

**B-020** (Codex báo `npm run build` treo) **KHÔNG tái hiện** trong lần build sạch này.

---

## 4. Smoke test route — PASS (7/7)

Gọi khi **chưa đăng nhập** → kỳ vọng redirect `/login` (HTTP 307):

| Route | Kết quả |
|---|---|
| `/dashboard` | ✅ 307 |
| `/contacts` | ✅ 307 |
| `/pipeline` | ✅ 307 |
| `/orders` | ✅ 307 |
| `/comments` | ✅ 307 |
| `/automation` | ✅ 307 |
| `/settings/workspaces` | ✅ 307 |

## 5. Smoke test API — PASS (7/7)

Gọi khi **chưa đăng nhập** → kỳ vọng HTTP 401:

| API | Kết quả |
|---|---|
| `GET /api/workspaces` | ✅ 401 |
| `GET /api/contacts` | ✅ 401 |
| `GET /api/pipelines` | ✅ 401 |
| `GET /api/orders` | ✅ 401 |
| `GET /api/comments` | ✅ 401 |
| `GET /api/automation/rules` | ✅ 401 |
| `GET /api/stats/founder?range=30d` | ✅ 401 |

> Lưu ý: vài endpoint trả `000` ở lần gọi đầu = `next dev` **cold-compile** vượt timeout curl; **warm retest đều 307/401**, và `npm run build` đã xác nhận tất cả route compile + có trong route tree. Dev server tạm đã **tắt sạch** sau smoke (PID 19324 terminated, port 3000 free).

---

## 6. Tenant isolation

- **Mức code: PASS** — mọi API nghiệp vụ đều `getCurrentWorkspaceId(user)` + filter `where: { workspaceId }`; đọc cross-workspace bị **404** (theo smoke Codex PR#2..#8).
- **Mức runtime đa-workspace qua UI** (switch brand + đối chiếu dashboard/contact/order/pipeline không lẫn) cần phiên đăng nhập + ≥2 workspace có data → **kiểm trong môi trường founder** (không tự fake).

---

## 7. Blocker còn lại

| ID | Mô tả | Trạng thái |
|---|---|---|
| **B-021** | 2 file leftover (`comments.ts` PR#7 hook, `migration_lock.toml`) | ✅ RESOLVED — commit `5f1155e`; git sạch |
| **B-022** | Production deploy trên Dokploy bị lỗi `Github Provider not found` / service 0/1 | ✅ RESOLVED — service `dc-funnel-cmr-dc-iea9mn` chạy 1/1 |
| **B-023** | Domain `crm.hongducdigital.com` 502 do stale Traefik dynamic config trùng host | ✅ RESOLVED — `/login` HTTP 200 |
| **B-024** | Meta webhook URL founder cấu hình `/api/webhooks/meta` chưa có route | ✅ RESOLVED — `/api/webhooks/meta` và `/api/webhook/facebook` đều verify challenge |
| **B-025** | Facebook OAuth thiếu/sai App ID/Secret, từng redirect với App ID không hợp lệ | ✅ RESOLVED — production env đã set App ID/Secret thật; OAuth redirect sang `www.facebook.com` |
| **D-002** | reply/hide comment cần Meta `pages_manage_engagement` + page token thật | PENDING_REAL_SMOKE — OAuth URL đã request đủ scope; chờ founder Connect Facebook + Codex smoke page/token thật |
| Tenant isolation runtime | Cần đăng nhập + ≥2 workspace có data để kiểm đầu-cuối | Chờ env founder |

---

## 8. Việc nên làm sau MVP1

**Vận hành / hoàn tất ngay:**
- Founder review + merge các nhánh `claude/01..08` (UI) vào `main` theo merge rule (plan mục 7), nếu chưa merge.
- Founder bấm **Connect Facebook** trên production bằng tài khoản có role Meta App/Page; Codex smoke callback/list pages/connect page/webhook/reply-hide để đóng **D-002**.
- Kiểm tenant isolation đầu-cuối: đăng nhập, tạo ≥2 workspace có data, switch và đối chiếu không lẫn.

**Nên có sớm (P1, ngoài MVP1):**
- API list workspace members → picker owner cho Contact/Order/Pipeline + lọc dashboard theo sale.
- Deep-link conversation trong Inbox (comment "Mở hội thoại" trỏ đúng hội thoại).
- Realtime inbox (thay polling) nếu cần.
- Bật SEND_EMAIL/WEBHOOK automation thật khi có consent/config (đang SKIPPED an toàn).
- Form builder field-by-field cho automation conditions/actionConfig (thay nhập JSON thô).
- Reports / export CSV; chart tương tác cho dashboard.

**Giữ nguyên KHÔNG làm:** Zalo OA · POS/kho/kế toán/đối soát COD · marketplace · LMS/Course · Voice AI · flow builder canvas · broadcast hàng loạt · affiliate.

---

🏁 **Kết luận:** D.C FUNNEL CRM MVP1 đã ổn định và production đã chạy trên domain thật — toàn bộ UI (PR #1B→#8B) + backend (PR #1→#8) build sạch, smoke route/API PASS, tenant isolation đúng ở mức code. Chỉ còn việc vận hành: founder Connect Facebook để smoke quyền Meta thật cho D-002 và kiểm isolation runtime với nhiều workspace có dữ liệu.
