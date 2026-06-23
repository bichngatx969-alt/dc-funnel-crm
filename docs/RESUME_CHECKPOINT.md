# RESUME CHECKPOINT

_Cập nhật: 2026-06-23 (đêm) — Claude (DCOS Daily Intelligence)_

## Current branch
- `main`

## ✅ PERSISTENCE ĐÃ BẬT (migration applied 2026-06-23, founder duyệt)
- `npx prisma migrate deploy` ĐÃ chạy: migration `20260624_dcos_daily_intelligence` applied, `migrate status` = "up to date".
- 4 bảng tồn tại + queryable trên Neon (count 0, sẵn sàng). Persistence hoạt động ngay (không cần deploy lại).
- Báo cáo sẽ được lưu khi: bấm "Tạo lại" ở /ai-copilot/daily, hoặc cron 8h chạy.

## Last completed step (cập nhật)
- DCOS **Phase 1 (Daily Intelligence) + Phase 2 (Content OS) + Phase 3 (Ads OS fallback)** xong + typecheck PASS + build compile PASS (mọi route mới có trong build output; chỉ flake OneDrive rename 500.html trên Windows, Linux/Dokploy sạch).
- Phase 1 đã commit+push `c132c0f`. Phase 2/3 commit kế tiếp.
- Đã thêm: `/content` + `/api/content/posts` + `/api/content/insights` (internal PARTIAL), `/ads` + `/api/meta/ads/insights` (NOT_CONNECTED fallback), nav Content/Ads.

## Current task
- Xây module DCOS Daily Intelligence theo `DCOS_DAILY_INTELLIGENCE_CONTENT_ADS_SALES_PLAN.md`.
- ĐÃ XONG (Phase 1, không cần bảng mới):
  - `src/lib/ai/daily-intelligence.ts` — collector (reuse `buildFounderStats` cho range hôm qua + query conversation/message/facebookPost/catalog/offer) + rule-based generator (summary, funnel, bottleneck TRUYỀN THÔNG/ADS/SALE/CATALOG-OFFER, strengths/weaknesses/actions/lessons).
  - API: `GET /api/ai/daily-intelligence?date=`, `POST /api/ai/daily-intelligence/generate`, `GET .../history`, `GET .../[id]`, `POST|GET /api/cron/daily-intelligence` (CRON_SECRET).
  - UI: `/ai-copilot` (redirect), `/ai-copilot/daily` + `DailyIntelligenceClient.tsx` (date picker, generate, hero score/bottleneck, 8 tab, loading/error/empty).
  - Nav: "AI Copilot" → `/ai-copilot/daily`.

## Files changed (chỉ của Claude — KHÔNG add file của Codex)
- src/lib/ai/daily-intelligence.ts (mới)
- src/app/api/ai/daily-intelligence/route.ts (mới)
- src/app/api/ai/daily-intelligence/generate/route.ts (mới)
- src/app/api/ai/daily-intelligence/history/route.ts (mới)
- src/app/api/ai/daily-intelligence/[id]/route.ts (mới)
- src/app/api/cron/daily-intelligence/route.ts (mới)
- src/app/ai-copilot/page.tsx (mới)
- src/app/ai-copilot/daily/page.tsx (mới)
- src/components/ai-copilot/DailyIntelligenceClient.tsx (mới)
- src/components/layout/nav.ts (sửa 1 dòng)
- docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md (mục 17)
- docs/RESUME_CHECKPOINT.md

## Tests already run
- npm run typecheck: PASS
- npm run build: biên dịch PASS + types valid + static 8/8; chỉ fail bước rename 500.html (OneDrive, Windows-only).

## Pending tests
- ✅ ĐÃ XONG. Smoke production PASS (c132c0f + 0c79bac live):
  - /ai-copilot/daily 307, /content 307, /ads 307.
  - /api/ai/daily-intelligence + /history + /cron/daily-intelligence 401, /api/content/posts + /insights 401, /api/meta/ads/insights 401.
  - Regression OK: /products 307, /inbox 307, /api/catalog/items 401.
- Còn lại (cần persistence): Phase 4 Attribution sâu, Phase 5 Learning Memory, Phase 6 Notifications.

## Next exact command
1. `git add` (chỉ 12 file của Claude ở trên) → commit "add dcos daily intelligence foundation" → `git push origin main`.
2. Chờ Dokploy build (~5-6'), smoke production.
3. Tiếp Phase 2 Content OS + Phase 3 Ads OS (xem "Do not forget").

## Risks / blockers
- ⚠ Codex đang sửa `prisma/schema.prisma` (uncommitted) + Phase 4 Package (untracked). KHÔNG add các file đó. KHÔNG chạy migration đụng schema khi Codex còn dở.
- 🟡 PERSISTENCE HOÃN: 4 model (DailyIntelligenceReport, AIFinding, AILesson, AIActionItem) + SocialPostSnapshot + AdInsightSnapshot CHƯA thêm vào schema (tránh đụng schema Codex). Vì vậy: history rỗng, cron compute nhưng chưa lưu, lessons/findings/actions chưa tích lũy nhiều ngày. → Khi schema Codex đã commit & ổn: thêm model additive + migration, rồi nối store vào collector/cron + bật history/lesson library.
- 🟡 Meta Ads: NOT_CONNECTED (chưa có ads_read). UI đã báo rõ + fallback.
- 🟡 Page insights: PARTIAL (dùng FacebookPost/Comment nội bộ, chưa có reach/impressions từ Graph).

## Do not forget
- Phase 2 Content OS: `/content`, `/content/posts`, `/content/insights` + `GET /api/content/posts|insights` (đọc FacebookPost/Comment nội bộ, PARTIAL). CHƯA làm trong phiên này.
- Phase 3 Ads OS: `/ads`, `/ads/insights` + `/api/meta/ad-accounts`, `/api/meta/ads/insights` — fallback NOT_CONNECTED. CHƯA làm.
- ✅ Phase 4 Attribution (phân kênh theo source, estimated) — XONG. Phase 5 Learning Memory — XONG (persistence applied). Phase 6 Notifications — XONG (email Resend: nút "Gửi email" self-send + endpoint + cron opt-in DAILY_REPORT_EMAIL_TO). In-app notification: pending (chưa có Notification model — báo cáo lưu DB + trang Daily là kênh in-app).
- Còn lại tùy chọn: Meta Ads (ads_read), Page insights (reach/impressions), in-app Notification model, multi-tenant email routing (hiện cron gửi 1 địa chỉ DAILY_REPORT_EMAIL_TO).
- Cron 8h: endpoint sẵn (`/api/cron/daily-intelligence` + CRON_SECRET). Cần founder cấu hình cron service (Dokploy/Vercel cron) gọi POST mỗi 08:00 Asia/Ho_Chi_Minh + set CRON_SECRET env.
- Khi commit: chỉ `git add` các file của Claude, KHÔNG `git add .` (tránh nuốt work Codex).
