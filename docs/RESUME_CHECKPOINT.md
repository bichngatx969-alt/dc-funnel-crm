# RESUME CHECKPOINT

_Cập nhật: 2026-06-23 — Claude (DCOS Daily Intelligence — VERIFY + HARDEN)._

## Current branch / HEAD
- `main` @ `ac7d657` (đã deploy production crm.hongducdigital.com). Working tree sạch (chỉ untracked: scripts/prod-*.* + architecture.html — không commit).

## Trạng thái DCOS Daily Intelligence — ĐÃ XONG + VERIFIED
Tất cả 6 phase đã build, deploy, và verify trên production:

- **Phase 1 Daily Intelligence** — `src/lib/ai/daily-intelligence.ts` (collector reuse `buildFounderStats` range hôm qua + rule-based generator: bottleneck TRUYỀN THÔNG/ADS/SALE/CATALOG-OFFER, funnel, strengths/weaknesses/actions/lessons). UI `/ai-copilot/daily`.
- **Phase 2 Content OS** — `/content` + `/api/content/posts|insights` (FacebookPost/Comment nội bộ). PARTIAL (chưa reach/impressions từ Meta).
- **Phase 3 Ads OS** — `/ads` + `/api/meta/ads/insights`. NOT_CONNECTED fallback (chưa ads_read), không crash.
- **Phase 4 Attribution** — `attribution` phân kênh theo `Customer.source` (estimated), hiển thị tab Tổng quan.
- **Phase 5 Learning Memory** — persistence 4 model (migration `20260624_dcos_daily_intelligence` ĐÃ apply prod). `daily-intelligence-store.ts`: store/history/[id] + action-items + lessons + findings + phát hiện nghẽn lặp ≥3/7 ngày. APIs `/api/ai/{action-items,lessons,findings}`. UI: action queue tương tác (Xong/Bỏ qua) + thư viện bài học.
- **Phase 6 Notifications** — email Resend: nút "Gửi email" + `POST /api/ai/daily-intelligence/send-email` (self-send) + cron gửi `DAILY_REPORT_EMAIL_TO` (opt-in). In-app notification: PENDING (chưa có Notification model).

## Verify session 2026-06-23 — kết quả
- `npx tsx scripts/prod-verify-dcos.ts` (chạy code store thật vào prod Neon, KHÔNG qua cron/email):
  - PASS1: 5 workspaces → reports=5, findings=8, lessons=5, actions=11.
  - PASS2 (chạy lại): IDEMPOTENT reports=true findings=true actions=true → **không nhân đôi**.
  - History: ws0 có report 2026-06-22 (score 60, nghẽn CATALOG-OFFER), actionItems(TODO)=2, lessons=1.
- `npx prisma migrate status` = "up to date" (16 migrations). typecheck PASS.
- Smoke prod: /ai-copilot/daily, /content, /ads, /inbox, /comments, /products = 307; /api/ai/daily-intelligence/history = 401. Không regression.

## env booleans (LOCAL .env — prod Dokploy có env riêng)
- CRON_SECRET=SET (local). DATABASE_URL=SET (prod Neon). DAILY_REPORT_EMAIL_TO=EMPTY. RESEND_API_KEY=EMPTY. ANTHROPIC_API_KEY=EMPTY.

## Founder cần cấu hình (KHÔNG làm bằng code được)
1. **Cron 8h**: đảm bảo `CRON_SECRET` có trong env PRODUCTION (Dokploy) + trỏ cron service gọi `POST https://crm.hongducdigital.com/api/cron/daily-intelligence?secret=<CRON_SECRET>` lúc 08:00 Asia/Ho_Chi_Minh. (Endpoint đã guarded 401.)
2. **Email báo cáo** (tùy): bật Resend trên prod (`RESEND_API_KEY` + `EMAIL_FROM_ADDRESS`) → nút "Gửi email" + self-send hoạt động. Đặt `DAILY_REPORT_EMAIL_TO` để cron tự gửi. Chưa bật Resend = email BLOCKED (endpoint trả lỗi rõ, không crash).
3. **Meta Ads** (`ads_read`) → Ads OS số liệu thật. **Page insights permission** → reach/impressions cho Content OS (đang PARTIAL).

## Còn lại (tùy chọn, cần quyết định/permission)
- In-app Notification model (chuông trong app) — cần thêm schema (phối hợp Codex).
- Multi-tenant email routing (hiện cron gửi 1 địa chỉ `DAILY_REPORT_EMAIL_TO`; muốn gửi đúng owner mỗi workspace cần thêm logic).
- Meta Ads sync + Page insights sync (SocialPostSnapshot/AdInsightSnapshot) khi có permission.

## Resume
Module hoàn chỉnh + verified. Phiên sau chỉ cần khi: bật Meta/permission, hoặc thêm in-app notification, hoặc founder yêu cầu tính năng mới.
