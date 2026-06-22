# DCOS Personal Pivot Master Plan

## 1. DCOS là gì?

DCOS là D.C Operating System: hệ điều hành cá nhân cho người kinh doanh hiện đại.

Định vị mới không bỏ CRM, mà đặt CRM vào một không gian làm việc rộng hơn: mỗi founder, creator, freelancer, sale, chủ shop hoặc agency nhỏ có một Space để điều hành account, kênh bán hàng, inbox, contact, catalog, automation và AI.

## 2. Vì sao chuyển từ CRM sang Personal Operating System?

D.C FUNNEL CRM đã có nền tốt cho inbox, contact, pipeline, order, comment, catalog và automation. Tuy nhiên người dùng thật không chỉ cần CRM. Họ cần một bàn điều khiển hằng ngày để mở app, xử lý inbox, chăm khách, xem sản phẩm, theo dõi đơn, dùng AI và chuyển giữa nhiều kênh.

DCOS giữ route và dữ liệu cũ để không phá production, nhưng đổi ngôn ngữ sản phẩm:

- Brand/workspace trở thành Space hoặc Không gian làm việc.
- CRM trở thành Customer OS.
- Product/Service trở thành Catalog OS.
- AI Growth trở thành AI Copilot hoặc Growth OS.
- Dashboard trở thành DCOS Home.

## 3. Kiến trúc module

- Account OS: đăng nhập, session, phân quyền, profile.
- Browser OS: shortcut/workbench thủ công cho Meta, Zalo, Canva, Webcake, Google Drive, Gmail.
- App Center: nơi xem trạng thái và mở nhanh các app tích hợp.
- Facebook OS: Page, Messenger, Comment, webhook, token chính thức.
- Zalo OS: hướng dài hạn qua Zalo OA/API chính thức.
- Inbox OS: hội thoại, takeover, AI suggestion, contact panel.
- Customer OS: contact 360, notes, tasks, timeline.
- Sales OS: pipeline, opportunity, order lite.
- Catalog OS: sản phẩm, dịch vụ, media, variant, inventory.
- Automation OS: rule engine và automation runs.
- AI OS: insight, offer suggestion, growth report, catalog intelligence.
- Founder/Personal Dashboard: doanh thu, task, follow-up, comment có SĐT, catalog health.

## 4. Nguyên tắc bảo mật

DCOS không dùng cookie/session scraping và không lưu mật khẩu cá nhân trong Browser OS.

Tích hợp tự động dài hạn chỉ dùng API chính thức:

- Facebook Page, Messenger, Comment, Business/Catalog.
- Zalo OA khi đủ scope/API.
- Email provider qua API key do founder cấu hình trực tiếp trong deployment environment.

Nếu thiếu env hoặc external permission, hệ thống dùng fallback an toàn và ghi blocker rõ trong plan tổng.

## 5. Đã triển khai trong sprint này

- Rebrand shell: metadata, login, sidebar, dashboard copy chuyển sang DCOS personal-first.
- App Center: `/apps` hiển thị trạng thái Facebook OS, Browser OS, Catalog OS, AI Copilot, Automation OS, Email OS và các shortcut creator.
- Browser OS MVP: `/browser` có shortcut mặc định, mở tab ngoài bằng target blank, thêm/xóa shortcut localStorage theo máy người dùng.
- Personal Space behavior: user mới không còn tự động bị gắn vào workspace chung đầu tiên; nếu chưa có membership thì tạo organization `Personal của {user}` và workspace `Không gian cá nhân`.

## 6. Còn lại

- Persistent BrowserShortcut theo DB nếu cần đồng bộ shortcut giữa thiết bị.
- Zalo OA thật sau khi founder có OA/API permission.
- Catalog list aggregate variant/stock để card/filter hiển thị số biến thể, tổng tồn, sắp hết, hết hàng.
- Booking backend/UI cho BOOKABLE_SERVICE.
- Package/bundle backend/UI.
- AI Catalog Intelligence v2 dùng context item/variant/service/package thật.

## 7. Trạng thái

Status: `PARTIAL_DEPLOY_READY`

Không có migration mới trong phase DCOS shell. Các thay đổi là UI/copy/route và workspace default behavior additive về dữ liệu.
