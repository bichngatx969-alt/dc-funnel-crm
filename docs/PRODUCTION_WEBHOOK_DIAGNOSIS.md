# Production Webhook Diagnosis — D.C FUNNEL CRM

> Kết luận chính đã ghi vào `docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md` (mục 17 báo cáo 2026-06-17, mục 19.1 D-002/D-009, mục 19.2 B-026..B-030). File này là báo cáo phụ chi tiết.

**Cập nhật 2026-06-17 — TRẠNG THÁI: hạ tầng RESOLVED, chờ 1 event thật để chốt.**

## TL;DR
Inbox Messenger + comment Fanpage không về CRM **KHÔNG phải lỗi code**. Nguyên nhân gốc:
1. **Traefik (reverse proxy HTTPS/443) chết** sau khi reboot nâng VPS — vì **nginx host mặc định chiếm cổng 80** (`bind 0.0.0.0:80 address already in use`, exit 128). Mất 443 ⇒ Meta gọi webhook bị 503 ⇒ 0 webhook về; site cũng khó vào.
2. **Webhook cấp App trống** (`GET /{app-id}/subscriptions` = `data:[]`) — chỉ có Page-level subscribed_apps, thiếu lớp App-level callback.

Cả 2 **đã fix** trong phiên 2026-06-17. Đã test end-to-end (POST ký hợp lệ → `PROCESSED`). Còn chờ founder gửi 1 tin + 1 comment thật để xác nhận Meta delivery.

## Bằng chứng (đọc trực tiếp từ production)
- VPS 2CPU/3.8GB, app ~0% CPU/231MB, load 0.01 → hết chậm. Performance: TTFB 0.12–0.37s.
- Endpoint: /login 200; /inbox /dashboard /contacts 307 (auth redirect); verify webhook 200 trả `test123`, TLS Let's Encrypt hạn 13/09/2026.
- DB: workspaces 4, pages 5, customers 8, conversations 5, messages 15, comments 3, webhookLogs 5 — nullWorkspace = 0 (KHÔNG bị ẩn do workspace filter).
- webhookLogs/messages/comments hiện có đều là **smoke/seed (09 & 14/06)**; chưa có dữ liệu thật.
- Page thật: HiChaos (status ERROR do health-check field `tasks` #100 — không chặn nhận), D.C Studio (CONNECTED). Cả 2: botEnabled, webhookSubscribed, token valid, scope đủ nhận (pages_messaging, pages_read_engagement, pages_manage_metadata).
- `docker logs`: `[WEBHOOK] Verify thành công.`; lỗi phụ `table public.MetaBusinessConnection does not exist` (route businesses) + vài `PostgreSQL connection Closed` (Neon autosuspend).

## Fix đã làm
```bash
# 1) Giải phóng cổng 80 + bật lại Traefik (founder đã duyệt)
systemctl stop nginx && systemctl disable nginx
docker start dokploy-traefik     # restart=always, tự lên lại sau reboot

# 2) Đăng ký webhook cấp App (Meta tự verify callback)
# POST /{app-id}/subscriptions object=page
#   callback=https://crm.hongducdigital.com/api/webhooks/meta
#   verify_token=$META_VERIFY_TOKEN
#   fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,feed
# => { success: true }, GET /{app-id}/subscriptions => active: true
```

## Cách verify lại (read-only, không in secret)
Các script ở `scripts/prod-*.js` (chạy trong container app):
```bash
ssh -p 24700 root@103.72.98.117 'docker exec -i -w /app $(docker ps -q --filter name=dc-funnel|head -1) node' < scripts/prod-diag-full.js
```
Bisect bằng `counts.webhookLogs`:
- **= số cũ (không tăng sau khi nhắn thật)** ⇒ Meta chưa POST ⇒ kiểm App Mode (Dev→Live)/Page subscription/role.
- **tăng + messages/comments tăng** ⇒ ĐÃ THÔNG.
- tăng nhưng workspaceId null ⇒ lỗi mapping (hiện nullWorkspace=0, không gặp).

## Việc founder cần làm
1. Gửi **1 tin Messenger** + **1 comment** vào page HiChaos bằng FB account khác → báo lại để soi DB.
2. Nếu chỉ admin/tester nhận được: chuyển Meta App **Live mode** + xin **Advanced Access** (pages_messaging, pages_read_engagement) qua App Review.
3. Quyết định `npx prisma migrate deploy` cho `MetaBusinessConnection` (sửa 500 route businesses) hay tiếp tục hoãn BM.
4. D-002 (ẩn/trả lời comment) cần thêm scope `pages_manage_engagement`.
