# D.C Funnel Bot

**Single-brand CRM funnel bot cho Facebook Ads:** tự động phân loại khách, làm nóng nhu cầu, chọn offer, giao sale và đo hiệu quả từ inbox đến doanh thu.

D.C Funnel Bot MVP là **single-brand CRM funnel bot**. Mỗi brand nên deploy một app/instance riêng để dữ liệu khách hàng sạch, flow rõ ràng và vận hành đơn giản. Ví dụ HICHAOS Funnel Bot chỉ dành cho HICHAOS; D.C Studio Funnel Bot chỉ dành cho D.C Studio; Kaho Funnel Bot chỉ dành cho Kaho Hair Salon.

MVP **không phải SaaS multi-tenant**. Không có tenant, workspace, client hay switch brand. Một brand vẫn có thể kết nối nhiều Fanpage, ví dụ Fanpage chính, Fanpage phụ và Page test; tất cả Page này vẫn thuộc cùng một brand và có thể được filter trong Dashboard/Inbox.

> Bot **không** tự động trả lời 100% bằng AI ở bản MVP. Bot chạy theo flow + rule để phân loại và làm nóng khách, sau đó **giao cho sale** tiếp quản. AI chỉ **gợi ý câu trả lời** cho sale, không tự gửi.

---

## 1. Tính năng MVP

- Nhận inbox / comment-to-message / postback / quick reply từ Facebook Page qua **Meta Messenger Webhook** (luồng chính thống, không reverse API).
- Lưu khách hàng, hội thoại, tin nhắn, raw payload vào PostgreSQL.
- **Funnel engine**: tự gắn tag, chấm **lead score**, phân loại **COLD/WARM/HOT**, bắt số điện thoại VN, gợi ý offer, tạo task cho sale.
- Chống spam: mỗi inbound bot chỉ trả tối đa 1–2 tin.
- Chống xử lý trùng event (dedupe theo `mid`).
- **CRM mini**: Dashboard, Inbox 3 cột, Offers, Flows, Tasks.
- **Brand Profile**: cấu hình brand hiện tại tại `/settings/brand`.
- **Fanpage của brand**: kết nối một hoặc nhiều Fanpage tại `/settings/integrations/facebook`.
- Sale **Take over / Return to bot**, gửi tin thủ công, gắn/xóa tag, đổi stage, tạo task.
- **AI gợi ý trả lời** (tùy chọn, bật khi có `OPENAI_API_KEY`).

## 2. Công nghệ

TypeScript · Next.js 15 (App Router) · Prisma ORM · PostgreSQL · TailwindCSS · OpenAI (optional).

## 3. Yêu cầu môi trường

- Node.js >= 18 (khuyến nghị 20+).
- PostgreSQL đang chạy (local hoặc cloud: Neon, Supabase, Railway...).
- 1 Facebook Page + 1 Meta App (để lấy Page Access Token, verify webhook).
- (Tùy chọn) `ngrok` hoặc `cloudflared` để expose webhook khi chạy local.

---

## 4. Cài đặt nhanh

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu rồi điền giá trị
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env

# 3. Tạo bảng trong database
npm run prisma:migrate    # lần đầu sẽ hỏi tên migration, gõ: init
#   hoặc nhanh gọn cho MVP (không cần lịch sử migration):
#   npx prisma db push

# 4. Seed dữ liệu mẫu (admin + BrandProfile HICHAOS + offers/flows FASHION)
npm run prisma:seed

# 5. Chạy dev
npm run dev
# Mở http://localhost:3000  -> đăng nhập bằng ADMIN_EMAIL / ADMIN_PASSWORD
```

---

## 5. Cấu hình biến môi trường (.env)

### 5.0. Cảnh báo bảo mật secret

- Không commit `.env` hoặc bất kỳ file `.env.*` có secret thật. Repo chỉ nên giữ `.env.example`.
- Nếu `DATABASE_URL`, token Meta, Resend key, hoặc secret production từng nằm trong working tree chia sẻ, hãy rotate ngay ở nhà cung cấp tương ứng rồi cập nhật lại môi trường deploy.
- Production sẽ fail-fast nếu còn dùng secret mặc định/dev cho `AUTH_SECRET`, `UNSUBSCRIBE_SECRET`, `CRON_SECRET`, `META_VERIFY_TOKEN`, hoặc nếu `TOKEN_ENCRYPTION_SECRET` thiếu/nhỏ hơn 32 ký tự.
- `AUTH_SECRET`, `TOKEN_ENCRYPTION_SECRET`, `UNSUBSCRIBE_SECRET`, `CRON_SECRET`, `META_VERIFY_TOKEN` nên là chuỗi ngẫu nhiên riêng biệt cho từng môi trường.

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL |
| `META_VERIFY_TOKEN` | ✅ | Token bạn tự đặt, dùng verify webhook (GET). Phải trùng với khai báo trên Meta App |
| `FACEBOOK_APP_ID` | ✅ OAuth | Facebook App ID dùng Facebook Login |
| `FACEBOOK_APP_SECRET` | ✅ OAuth | Facebook App Secret dùng đổi token |
| `FACEBOOK_API_VERSION` | – | Graph API version cho OAuth, mặc định `v20.0` |
| `FACEBOOK_LOGIN_REDIRECT_URI` | ✅ OAuth | `APP_BASE_URL/api/integrations/facebook/callback` |
| `TOKEN_ENCRYPTION_SECRET` | ✅ OAuth | Chuỗi ngẫu nhiên tối thiểu 32 ký tự để mã hóa token AES-256-GCM |
| `META_PAGE_ACCESS_TOKEN` | Dev fallback | Page Access Token fallback khi chưa connect OAuth. Không dùng hardcode token này cho production |
| `META_APP_SECRET` | Khuyến nghị | Để verify chữ ký `X-Hub-Signature-256`. Để trống = bỏ qua verify |
| `FACEBOOK_PAGE_ID` | Tùy chọn | ID Page mặc định khi cấu hình qua env. Với nhiều Page, quản lý trong `/settings/integrations/facebook` |
| `META_GRAPH_VERSION` | – | Mặc định `v21.0` |
| `DEFAULT_VERTICAL` | – | `fashion` \| `studio` \| `salon` (flow mặc định khi khách inbox lần đầu) |
| `OPENAI_API_KEY` | Tùy chọn | Có thì bật AI gợi ý, không có thì app vẫn chạy, chỉ ẩn nút AI |
| `OPENAI_MODEL` | – | Mặc định `gpt-4o-mini` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | Tài khoản admin đăng nhập CRM |
| `ADMIN_NAME` | – | Tên hiển thị admin |
| `AUTH_SECRET` | Khuyến nghị | Chuỗi ngẫu nhiên ký cookie phiên đăng nhập |

---

## 6. Tạo Meta App, Facebook Login & Webhook

### 6.1. Tạo App và bật Facebook Login
1. Vào https://developers.facebook.com/ → **My Apps** → **Create App** → loại **Business**.
2. Thêm sản phẩm **Facebook Login**.
3. Cấu hình OAuth redirect URI:
   `APP_BASE_URL/api/integrations/facebook/callback`
4. Thêm sản phẩm **Messenger** nếu muốn nhận/gửi inbox qua Page.
5. Lấy **App ID** và **App Secret** ở **App Settings → Basic** → điền `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
6. Tạo `TOKEN_ENCRYPTION_SECRET` là chuỗi ngẫu nhiên tối thiểu 32 ký tự.

Permission cần xin khi Facebook Login:

- `public_profile`
- `pages_show_list`
- `pages_manage_metadata`
- `pages_messaging`

### 6.2. Cấu hình Webhook URL
1. Chạy app (local + tunnel, xem mục 8) để có URL public, ví dụ:
   `https://abcd-1234.ngrok-free.app`
2. Messenger → **Settings → Webhooks** → **Add Callback URL**:
   - **Callback URL**: `https://<domain>/api/webhook/facebook`
   - **Verify Token**: đúng bằng `META_VERIFY_TOKEN` trong `.env`
3. Meta sẽ gọi `GET` để verify. Nếu khớp token, server trả lại `hub.challenge` → verify thành công.
4. **Subscribe** Page với các field: `messages`, `messaging_postbacks`, `messaging_optins`, `message_deliveries` (tối thiểu cần `messages` và `messaging_postbacks`).

### 6.3. Test trong Development Mode

- Tài khoản Facebook dùng để login phải là admin/developer/tester của app.
- Fanpage cần thuộc quyền quản trị của tài khoản test.
- Login admin trong CRM.
- Vào **Settings → Integrations → Facebook Fanpage**.
- Bấm **Kết nối Facebook**.
- Chọn Fanpage ở trang `/settings/integrations/facebook/pages`.
- Run health check.
- Bật bot.
- Gửi tin nhắn từ tài khoản Facebook khác vào Page.
- Kiểm tra webhook logs trong trang chi tiết Fanpage.

---

## 7. Test

### 7.1. Test webhook GET (verify)
```bash
curl "http://localhost:3000/api/webhook/facebook?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=12345"
# Kỳ vọng in ra: 12345
```

### 7.2. Test nhận tin nhắn (giả lập 1 message webhook)
```bash
curl -X POST http://localhost:3000/api/webhook/facebook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "messaging": [{
        "sender": { "id": "100000000000001" },
        "recipient": { "id": "PAGE_ID" },
        "timestamp": 1700000000000,
        "message": { "mid": "test_mid_001", "text": "Cho mình hỏi giá bao nhiêu" }
      }]
    }]
  }'
```
> Lưu ý: nếu đã bật `META_APP_SECRET`, request giả lập trên sẽ bị chặn vì thiếu chữ ký. Khi test thủ công hãy tạm để trống `META_APP_SECRET`.

Sau đó mở **Inbox** trong CRM: sẽ thấy 1 khách mới, tin nhắn vào, bot trả lời, tag `hoi_gia` và lead score tăng.

### 7.3. Kịch bản funnel thử nhanh
- Gửi "giá bao nhiêu" → tag `hoi_gia` +2, bot gửi offer.
- Gửi "cao 1m60 nặng 50kg" → tag `hoi_size` +2.
- Gửi "0901234567" → lưu phone, tag `co_sdt` +5, chuyển **HOT**, **HUMAN_TAKEOVER**, tạo task cho sale.
- Lead score ≥ 8 → tự chuyển HOT + giao sale.

---

## 8. Expose webhook khi chạy local

**ngrok**
```bash
ngrok http 3000
# Lấy URL https://...ngrok-free.app  -> Callback URL: <url>/api/webhook/facebook
```

**Cloudflare Tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
# Lấy URL https://...trycloudflare.com -> Callback URL: <url>/api/webhook/facebook
```

---

## 9. Giới hạn cửa sổ 24 giờ của Messenger

- Page chỉ được nhắn lại khách **trong vòng 24h** kể từ tin nhắn gần nhất của khách (Standard Messaging).
- Toàn bộ Send API trong app dùng `messaging_type: "RESPONSE"` — chỉ để **phản hồi** trong cửa sổ hợp lệ.
- **Không** dùng app này để gửi quảng cáo/follow-up chủ động ngoài cửa sổ 24h. Việc đó cần Message Tag hợp lệ hoặc kênh khác (chưa nằm trong MVP).
- App tuân thủ luồng chính thống Meta Messenger Platform: **không** dùng Zalo cá nhân, **không** reverse API, **không** giả lập web, **không** automation vi phạm nền tảng.

---

## 10. Scripts

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy server dev (http://localhost:3000) |
| `npm run build` | `prisma generate` + build production |
| `npm run start` | Chạy bản production đã build |
| `npm run typecheck` | Kiểm tra TypeScript (không lỗi) |
| `npm run lint` | ESLint |
| `npm run prisma:migrate` | Tạo/áp migration (dev) |
| `npm run prisma:deploy` | Áp migration (production) |
| `npm run prisma:seed` | Seed admin + offers + flows |
| `npm run prisma:studio` | Mở Prisma Studio xem DB |

---

## 11. Cấu trúc thư mục

```
prisma/
  schema.prisma         # 11 model + enums
  seed.ts               # admin, offers, flows mặc định
src/
  app/
    api/
      webhook/facebook/  # GET verify, POST nhận event
      auth/              # login, logout
      conversations/     # list, detail, messages, send, takeover, return-to-bot
      customers/         # tags, stage, patch
      offers/ flows/ tasks/ ai/ stats/ brand-profile/ facebook-pages/
      integrations/facebook/ # login, callback, pages, connect, toggle, health, logs
    dashboard/ inbox/ offers/ flows/ email/ tasks/ settings/ login/  # các trang CRM
  components/            # AppShell, InboxClient, OffersClient, FlowsClient, Facebook integration clients, ui
  lib/
    facebook/            # send.ts (Send API adapter), verify.ts (chữ ký)
    security/             # token-encryption.ts (AES-256-GCM)
    funnel/              # engine.ts, intake.ts, phone.ts, text.ts
    flows/defaults.ts    # flow mặc định fashion/studio/salon
    ai/suggest.ts        # gợi ý trả lời (OpenAI, optional)
    auth.ts env.ts prisma.ts api.ts types.ts client.ts
```

---

## 12. Cách funnel engine hoạt động (tóm tắt)

1. Webhook nhận event → `intake.ts` lưu khách/hội thoại/tin nhắn, dedupe theo `mid`.
   Trước khi route vào funnel engine, webhook ghi `FacebookWebhookLog`, kiểm tra Page đã connect, bot đang bật và trạng thái Page hợp lệ.
2. Nếu hội thoại đang **HUMAN_TAKEOVER** → bot im lặng, để sale xử lý.
3. Ngược lại chạy `engine.ts`:
   - Bắt **số điện thoại VN** (ưu tiên cao nhất) → +5đ, tag `co_sdt`, HOT, giao sale, tạo task.
   - **Postback/quick reply** → tra `FlowStep` (DB ưu tiên, fallback code) → áp tag/điểm/stage + gửi message; `NEED_COMBO` kèm offer.
   - **Tin đầu tiên** → gửi welcome theo `DEFAULT_VERTICAL`.
   - **Keyword**: giá (+2), size (+2), ship (+1).
   - Không hiểu → fallback + hỏi lại nhu cầu.
   - Lead score ≥ 8 → HOT + giao sale + task.
4. Bot gửi tối đa 2 tin/inbound (chống spam).

Nội dung flow chỉnh được trong trang **/flows** (message text + quick replies JSON). Flow và Offer có `pageId` nullable:

- `pageId = null`: áp dụng cho toàn brand.
- `pageId` có giá trị: áp dụng riêng cho Fanpage đó.

Customer, Conversation và Message giữ `pageId` để biết khách đến từ Fanpage nào. EmailTemplate và EmailSequence thuộc brand hiện tại, không cần `brandId`.

---

## 13. Email Automation (Resend)

Module email tự động hóa: lưu email khách (khi khách cung cấp + đồng ý nhận), gửi email theo stage/tag/hành vi qua **sequence**, có template, log, unsubscribe và tôn trọng consent.

> Email **optional**: nếu để trống `RESEND_API_KEY` (hoặc `EMAIL_FROM_ADDRESS`), chức năng gửi bị tắt, app vẫn chạy bình thường và vẫn lưu email/consent của khách.

### 13.1. Biến môi trường email
| Biến | Mô tả |
|------|-------|
| `RESEND_API_KEY` | API key Resend. Trống = tắt gửi email |
| `EMAIL_FROM_NAME` | Tên người gửi, ví dụ `HICHAOS` |
| `EMAIL_FROM_ADDRESS` | Email gửi, phải thuộc **domain đã verify** trên Resend |
| `APP_BASE_URL` | URL gốc app, để tạo link unsubscribe |
| `UNSUBSCRIBE_SECRET` | Bí mật ký token unsubscribe |
| `CRON_SECRET` | Bảo vệ endpoint cron automation |
| `RESEND_WEBHOOK_SECRET` | (tùy chọn) verify webhook Resend (Svix) |

### 13.2. Tạo Resend API key + verify domain
1. Đăng ký tại https://resend.com → **API Keys** → **Create API Key** → copy vào `RESEND_API_KEY`.
2. **Domains** → **Add Domain** → thêm domain của bạn → khai báo các bản ghi DNS (SPF, DKIM) Resend cung cấp → chờ **Verified**.
3. Đặt `EMAIL_FROM_ADDRESS` là email thuộc domain đó, ví dụ `no-reply@yourdomain.com`.
4. (Tùy chọn) **Webhooks** → thêm endpoint `https://<domain>/api/webhook/resend`, copy signing secret vào `RESEND_WEBHOOK_SECRET` để cập nhật trạng thái delivered/opened/clicked/bounced/complained.

### 13.3. Sử dụng
- Vào **/email** xem tổng quan (gửi hôm nay, failed, subscribed, unsubscribed, sequence active) và bấm **Chạy automation ngay**.
- **/email/templates**: tạo/sửa template (biến: `{{customer.name}}`, `{{customer.email}}`, `{{customer.phone}}`, `{{customer.currentStage}}`, `{{offer.title}}`, `{{offer.offerText}}`, `{{unsubscribeUrl}}`, `{{appName}}`), **Preview**, **Gửi test** (chỉ admin, có rate limit).
- **/email/sequences**: tạo sequence với `triggerType` (TAG_ADDED, STAGE_CHANGED, FORM_SUBMITTED, MANUAL, PURCHASED, BOOKING_CREATED) + `triggerValue`, thêm các step (chọn template + delay phút).
- Trong **/inbox** cột phải: xem/sửa email khách, bật/tắt consent, xem trạng thái, **Enroll** vào sequence, **Gửi** template one-off, và lịch sử email của khách.

### 13.4. Luồng tích hợp với chatbot
- Khi khách nhắn email → bot lưu `Customer.email`, hỏi consent (quick reply **Đồng ý nhận email** / **Không cần**).
- Đồng ý → `emailConsent=true`, `emailStatus=SUBSCRIBED`, bắn trigger `FORM_SUBMITTED` → enroll sequence phù hợp.
- Khi gắn tag mới → trigger `TAG_ADDED`; khi chuyển **HOT** → trigger `STAGE_CHANGED=HOT`.

### 13.5. Chạy cron gửi email tới hạn
Endpoint: `POST /api/cron/email-automation` (cũng nhận GET). Bảo vệ bằng `CRON_SECRET`.
```bash
# Chạy thủ công
curl -X POST "https://<domain>/api/cron/email-automation" -H "x-cron-secret: <CRON_SECRET>"
# hoặc dùng query: ?secret=<CRON_SECRET>
```
Cấu hình chạy định kỳ (mỗi 5–15 phút) bằng **Vercel Cron**, **cron-job.org**, Windows Task Scheduler, hoặc `crontab`. Admin đăng nhập cũng bấm được nút **Chạy automation ngay** trong /email.

### 13.6. Compliance (bắt buộc)
- Chỉ gửi email cho khách **đã consent**; **không** gửi nếu `UNSUBSCRIBED/BOUNCED/COMPLAINED` hoặc đã `unsubscribedAt`.
- Mọi email đều có **link unsubscribe** (`/api/unsubscribe?token=...`) và header `List-Unsubscribe`.
- Không hardcode API key; không log full secret; validate định dạng email; rate limit endpoint gửi test.
- MVP dùng email cho **lead đã đồng ý nhận**, **không spam**.

---

## 14. Roadmap v2 (chưa code)

- SaaS multi-tenant nếu cần thương mại hóa như một platform dùng chung.
- Realtime inbox bằng Socket.io (thay polling).
- Flow builder kéo thả.
- Kết nối Pancake/Botcake.
- Kết nối Ads Insights để biết campaign nào tạo lead tốt.
- Tự động tạo tệp remarketing.
- Export khách hàng ra CSV.
- Báo cáo tỷ lệ bot → sale → chốt đơn.
- Tích hợp Zalo OA chính thống.
- Website chat widget.
```
