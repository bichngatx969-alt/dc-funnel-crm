# D.C FUNNEL CRM — MVP 1 Wireframes & UI Foundation

**Phiên bản:** v1.0
**Ngày tạo:** 2026-06-14
**Owner:** Claude (Product UI/UX Owner)
**Trạng thái:** Draft for build
**Liên quan:** `docs/product/DC_FUNNEL_CRM_SPEC.md`, `docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md`

> ⚠️ Wireframe là **bố cục & hành vi**, không phải thiết kế pixel cuối. Mọi chỗ cần dữ liệu đều ghi rõ **"API: chờ Codex (PR #X)"** — Claude chỉ build UI thật sau khi contract ở mục 16 của plan chuyển sang `READY`. Trong PR #1B này KHÔNG sửa UI app thật, chỉ chốt wireframe + microcopy.

---

## 0. Quy ước đọc wireframe

**Ký hiệu:**
```text
┌─┐ └─┘   khung vùng/màn
[ Nút ]    nút bấm
( ◉ )      toggle / radio
▾          dropdown
🔍 ⚙ 🔔     icon (tìm kiếm / cài đặt / thông báo)
…          còn nội dung
▌          cột đang chọn / active
```

**Breakpoints:**
| Tên | Bề rộng | Layout chính |
|---|---|---|
| Mobile | < 768px | 1 cột, điều hướng đáy/tab, màn xếp chồng |
| Tablet | 768–1024px | 2 vùng, cột phụ thu gọn/ẩn được |
| Desktop | > 1024px | nhiều cột đầy đủ |

**Trạng thái màn bắt buộc thiết kế cho mọi danh sách:** `default` · `loading (skeleton)` · `empty (có CTA)` · `error (thử lại)`.

---

## 1. Nền tảng UI

### 1.1. Information Architecture (điều hướng)

```text
[Workspace ▾]  Tổng quan · Hội thoại · Khách hàng · Pipeline · Đơn hàng · Việc cần làm · Tự động hóa · Báo cáo · Cài đặt
```

- Sidebar trái (desktop) / thanh tab đáy + menu (mobile).
- **Workspace switcher** đặt trên cùng sidebar — luôn thấy brand hiện tại.
- "Email" (module hiện có): theo D-005, mặc định **ẩn khỏi nav chính** MVP1, vẫn giữ code (có thể vào qua Cài đặt). Founder chốt.

### 1.2. App shell

```text
DESKTOP
┌───────────────┬─────────────────────────────────────────────┐
│ [Brand ▾]     │  Tiêu đề màn                         🔔  [Tôi]│
│               ├─────────────────────────────────────────────┤
│ ◫ Tổng quan   │                                             │
│ ✉ Hội thoại   │                                             │
│ ☻ Khách hàng  │            NỘI DUNG MÀN HIỆN TẠI             │
│ ▦ Pipeline    │                                             │
│ ▤ Đơn hàng    │                                             │
│ ✓ Việc cần làm│                                             │
│ ⚡ Tự động hóa │                                             │
│ ▭ Báo cáo     │                                             │
│ ⚙ Cài đặt     │                                             │
│               │                                             │
│ [Nam Nguyên]  │                                             │
│ Sale ·  thoát │                                             │
└───────────────┴─────────────────────────────────────────────┘

MOBILE
┌─────────────────────────┐
│ [Brand ▾]      🔔   ☰   │  ← header gọn
├─────────────────────────┤
│                         │
│      NỘI DUNG MÀN       │
│                         │
├─────────────────────────┤
│ ◫    ✉    ☻    ▦    ☰   │  ← tab bar đáy (Tổng quan/Hội thoại/Khách/Pipeline/Thêm)
└─────────────────────────┘
```

### 1.3. Tái sử dụng & token

- Giữ màu thương hiệu hiện có (`brand`, `brand-light`, `brand-dark` trong Tailwind config) — không đổi token trong PR #1B.
- Component đã có để tái dùng/đặt nền: `AppShell.tsx`, `InboxClient.tsx`, `ui.tsx` (`StageBadge`, `StatusBadge`, `ScoreBadge`, `Tag`).
- Component **mới sẽ cần** (build ở các PR sau, không phải bây giờ): `WorkspaceSwitcher`, `KanbanBoard`/`KanbanCard`, `ContactList`/`ContactDetailTabs`, `OrderModal`, `AutomationTemplateCard`, `EmptyState`, `MoneyVND`, `KpiCard`, `FilterBar`.

### 1.4. Component dùng chung: `EmptyState` & `MoneyVND`

```text
EmptyState
┌───────────────────────────────┐
│            ( minh hoạ )        │
│        Tiêu đề ngắn gọn        │
│   Câu mô tả hướng dẫn hành động│
│        [ Nút hành động ]       │
│        (link phụ tuỳ chọn)     │
└───────────────────────────────┘
```
`MoneyVND(value)` → `299.000 ₫` (Intl.NumberFormat vi-VN). Dùng ở Pipeline, Order, Dashboard.

---

## 2. Wireframes

### 2.1. Dashboard (Tổng quan founder)

**Mục tiêu:** founder mở 1 màn biết sức khỏe kinh doanh. (Spec 5.10)

```text
DESKTOP
┌─────────────────────────────────────────────────────────────┐
│ Tổng quan — Nam Nguyên Store      [Brand ▾] [Hôm nay ▾] [Sale ▾] [Kênh ▾]│
├─────────────────────────────────────────────────────────────┤
│ ┌─Lead mới──┐ ┌─Chưa xử lý─┐ ┌─P.hồi TB──┐ ┌─Task quá hạn┐   │
│ │   12      │ │    5       │ │  8 phút   │ │     3        │   │
│ └───────────┘ └────────────┘ └───────────┘ └──────────────┘   │
│ ┌─Cơ hội mở─┐ ┌─DT dự kiến─┐ ┌─DT đã chốt┐ ┌─Tỷ lệ chốt──┐   │
│ │ 18 · 45M ₫│ │  45.000.000│ │ 12.500.000│ │    27%       │   │
│ └───────────┘ └────────────┘ └───────────┘ └──────────────┘   │
├──────────────────────────────┬──────────────────────────────┤
│ Sale performance             │ Nguồn lead hiệu quả          │
│  Lan   ███████  8 chốt 6.2M  │  FB Ads   ██████  9 lead     │
│  Hùng  ████     3 chốt 2.1M  │  Comment  ███     5 lead     │
│  …                           │  Page     ██      3 lead     │
├──────────────────────────────┴──────────────────────────────┤
│ Đơn theo trạng thái:  Mới 4 · Xác nhận 6 · Giao 3 · Nhận 9 · Hủy 1 │
└─────────────────────────────────────────────────────────────┘

MOBILE: KPI xếp 2 cột cuộn dọc → chart xếp chồng → đơn theo trạng thái dạng chip.
```

- **Thành phần:** `KpiCard` ×N, thanh filter, 2 bảng xếp hạng, dải trạng thái đơn.
- **Trạng thái:** loading = skeleton card; empty (chưa có data) = "Chưa có số liệu. Kết nối Fanpage và bắt đầu nhận khách để xem báo cáo." + [Kết nối Fanpage]; error = "Không tải được số liệu" + [Thử lại].
- **Phụ thuộc:** Founder Stats API — **chờ Codex (PR #8)**. MVP đầu có thể dùng phần stats hiện có cho vài KPI cơ bản; KPI tiền/pipeline chờ Pipeline+Order.
- **Quyền:** KPI tài chính ẩn với SALE (Spec mục 7).

---

### 2.2. Workspace Switcher

**Mục tiêu:** thấy & chuyển brand; cô lập data. (Spec 5.1)

```text
ĐÓNG (trên sidebar)         MỞ (popover)
┌──────────────────┐        ┌───────────────────────────┐
│ ◧ Nam Nguyên  ▾ │   →    │ 🔍 Tìm brand…              │
│   fashion · OWNER│        ├───────────────────────────┤
└──────────────────┘        │ ◧ Nam Nguyên ✓  OWNER     │
                            │ ◧ Kaho Salon    MANAGER   │
                            │ ◧ D.C Studio    SALE      │
                            ├───────────────────────────┤
                            │ + Tạo brand mới           │
                            │ ⚙ Quản lý brand           │
                            └───────────────────────────┘
```

- **Thành phần:** trigger (tên brand + ngành + role), popover list (tick brand hiện tại), ô tìm, CTA tạo/quản lý.
- **Hành vi:** chọn brand → reload data theo workspace mới; ghi nhớ workspace hiện tại (cookie/session do Codex quyết).
- **Empty (chưa có brand):** xem microcopy "Workspace rỗng" (mục 3) — toàn màn onboarding [Tạo brand đầu tiên].
- **Phụ thuộc:** `GET /api/workspaces`, `POST /api/workspaces`, switch — **chờ Codex (PR #2)**. UI = PR #2B.

---

### 2.3. Unified Inbox

**Mục tiêu:** gom hội thoại, xử lý nhanh, thao tác CRM ngay trong inbox; mobile-first. (Spec 5.4)

```text
DESKTOP (3 cột — giữ & nâng cấp InboxClient hiện có)
┌──────────────┬───────────────────────────┬──────────────────┐
│ Bộ lọc ▾     │  Khách: Trần Mai      [⋯] │ ☻ Trần Mai       │
│ [Tất cả]     │  FB Page · HOT · 0901… │ HOT · 12đ        │
│ [Của tôi]    ├───────────────────────────┤ SĐT 0901234567   │
│ [Chưa đọc•3] │  …lịch sử tin nhắn…       │ Nguồn: FB Ads    │
│ [Cần xử lý]  │  [khách] Giá bao nhiêu?   │ ───────────────  │
│ [Chưa gán]   │  [bot ] Dạ bên em…        │ Tags: #hoi_gia + │
│ [Khách nóng] │  [sale] Chị cho em sđt…   │ Stage: HOT  ▾    │
│ ───────────  │                           │ Owner: Lan  ▾    │
│ 🔍 tìm khách │                           │ ───────────────  │
│ ◦ Trần Mai ▌ ├───────────────────────────┤ [+ Task]         │
│ ◦ Lê Hoa     │ [Ghi chú nội bộ] [Mẫu ▾]  │ [+ Cơ hội]       │
│ ◦ Khách 8821 │ ┌───────────────────────┐ │ [+ Tạo đơn]      │
│ …            │ │ Nhập tin… (Enter gửi) │ │ Việc cần làm:    │
│              │ └───────────────────[Gửi]│ │  ▢ Gọi lại 16h   │
│              │ [Take over] [Trả về bot]  │ Đơn gần đây: …   │
└──────────────┴───────────────────────────┴──────────────────┘

MOBILE (3 màn theo tab, không nhồi 3 cột)
[Danh sách] → chạm khách → [Hội thoại] → nút "Khách" mở [Hồ sơ 360 + hành động]
┌─────────────────────┐   ┌─────────────────────┐
│ Hội thoại    [lọc▾] │   │ ‹ Trần Mai   [Khách]│
│ ◦ Trần Mai  HOT  •  │   │ …tin nhắn…          │
│ ◦ Lê Hoa    WARM    │   │ ┌─────────────────┐ │
│ ◦ Khách 8821        │   │ │ Nhập tin…  [Gửi]│ │
└──────────[+ Lọc]────┘   └─────────────────────┘
```

- **Bộ lọc (Spec 5.4):** Tất cả · Của tôi · Chưa đọc · Cần xử lý · Chưa gán · Khách nóng · Theo kênh · Theo tag · Theo nhân viên.
- **Hành động trong inbox:** trả lời, ghi chú nội bộ, mẫu trả lời nhanh, gắn/xóa tag, đổi stage, gán owner, take over/return-to-bot, **[+ Task] [+ Cơ hội] [+ Tạo đơn]**.
- **Badge:** chưa đọc (chấm + số), kênh (FB Page / Comment), "Nóng".
- **Realtime:** polling (D-006).
- **Trạng thái:** empty = microcopy "Inbox rỗng" (mục 3); loading = skeleton list + skeleton bubbles.
- **Phụ thuộc:** mở rộng API conversations (bộ lọc của tôi/chưa đọc/chưa gán/owner) — **chờ Codex**. Nút "Tạo đơn"/"Cơ hội" phụ thuộc Order API (PR #5) & Pipeline API (PR #3). Build dần theo contract.

---

### 2.4. Contact List (Khách hàng)

**Mục tiêu:** tra cứu & quản lý khách theo workspace. (Spec 5.3)

```text
DESKTOP
┌─────────────────────────────────────────────────────────────┐
│ Khách hàng (1.248)        🔍 tìm tên/SĐT/email   [+ Thêm khách]│
│ Lọc: Stage ▾ · Tag ▾ · Owner ▾ · Kênh ▾ · Nguồn ▾            │
├──────┬───────────────┬──────────┬────────┬────────┬──────────┤
│ ☐    │ Tên           │ SĐT      │ Stage  │ Owner  │ Lần cuối │
├──────┼───────────────┼──────────┼────────┼────────┼──────────┤
│ ☐ ☻ │ Trần Mai      │ 0901234… │ HOT    │ Lan    │ 2 giờ    │
│ ☐ ☻ │ Lê Hoa        │ 0987654… │ WARM   │ Hùng   │ Hôm qua  │
│ …    │               │          │        │        │          │
├──────┴───────────────┴──────────┴────────┴────────┴──────────┤
│ Đã chọn 2:  [Gắn tag] [Đổi owner] [Xuất CSV •SAU]   ‹ 1 2 3 ›│
└─────────────────────────────────────────────────────────────┘

MOBILE: mỗi khách 1 card (tên · stage · SĐT · owner · lần cuối), filter trong sheet kéo lên.
```

- **Thành phần:** thanh tìm + filter, bảng (desktop) / card (mobile), chọn nhiều + thao tác hàng loạt, phân trang.
- **Trạng thái:** empty = microcopy "Contact rỗng" (mục 3).
- **Phụ thuộc:** `GET /api/contacts` (+filter) — **chờ Codex (PR #4)**. UI = PR #4B.

---

### 2.5. Contact Detail (Hồ sơ khách 360)

**Mục tiêu:** hiểu khách trong 5 giây + thao tác mọi thứ về khách. (Spec 5.3)

```text
DESKTOP
┌───────────────────────────┬─────────────────────────────────┐
│ ☻ Trần Mai                │ [Hội thoại][Cơ hội][Đơn][Task][Note]│
│ HOT · 12đ                 ├─────────────────────────────────┤
│ 📞 0901234567             │ TAB: Hội thoại                   │
│ ✉ mai@gmail.com           │  • FB Page — 2 giờ trước         │
│ ⚥ Nữ · 🎂 12/03           │    "Giá bao nhiêu?" …            │
│ 📍 Q.1, HCM               │  • Comment bài "Sale 9.9" …      │
│ ───────────────           │                                  │
│ Nguồn: FB Ads / Sale 9.9  │ TAB: Đơn → list đơn + tổng chi   │
│ Owner: Lan  ▾             │ TAB: Cơ hội → card pipeline      │
│ Tags: #hoi_gia #vip [+]   │ TAB: Task → việc cần làm          │
│ ───────────────           │ TAB: Note → ghi chú nội bộ [+]   │
│ [+ Task][+ Cơ hội][+ Đơn] │                                  │
└───────────────────────────┴─────────────────────────────────┘

MOBILE: header hồ sơ trên cùng → tab ngang cuộn ngang → nội dung tab xếp dọc.
```

- **Cột trái (hồ sơ):** tên, stage, score, SĐT, email, giới tính, sinh nhật, địa chỉ, nguồn, owner, tags, hành động nhanh.
- **Cột phải (tab 360):** Hội thoại · Cơ hội · Đơn · Task · Note (· Activities [P1]).
- **Trạng thái mỗi tab:** empty riêng (vd "Chưa có đơn nào cho khách này. [Tạo đơn]").
- **Phụ thuộc:** `GET /api/contacts/:id`, `/notes`, `/timeline` — **chờ Codex (PR #4)**; tab Đơn/Cơ hội phụ thuộc PR #5/#3.

---

### 2.6. Pipeline Kanban

**Mục tiêu:** bản đồ tiền; kéo khách qua các giai đoạn. (Spec 5.6)

```text
DESKTOP
┌─────────────────────────────────────────────────────────────┐
│ Pipeline: Thời trang ▾   Lọc: Sale▾ Tag▾ Kênh▾   [+ Cơ hội]  │
├──────────┬──────────┬──────────┬──────────┬─────────┬────────┤
│ Lead mới │ Hỏi mẫu  │ Đã gửi   │ Cân nhắc │ Chốt đơn│ Giao…  │
│ 8·12M ₫  │ 5·9M ₫   │ 3·7M ₫   │ 4·11M ₫  │ 2·6M ₫  │ …      │
├──────────┼──────────┼──────────┼──────────┼─────────┼────────┤
│┌────────┐│┌────────┐│          │          │         │        │
││Trần Mai││││Lê Hoa  ││   …      │          │         │        │
││Combo 2 ││││Váy hoa ││          │          │         │        │
││620.000₫││││450.000₫││          │          │         │        │
││FB·#vip ││││Comment ││          │          │         │        │
││Lan ⏰qhn│││Hùng    ││          │          │         │        │
│└────────┘│└────────┘│          │          │         │        │
└──────────┴──────────┴──────────┴──────────┴─────────┴────────┘

MOBILE: 1 cột/stage, vuốt ngang đổi cột; đổi stage bằng nút "Chuyển ▾" trên card (fallback, không bắt kéo-thả).
```

- **Card (Spec 5.6):** tên khách · tên cơ hội · giá trị VND · kênh/nguồn · tag · owner · last activity · task tiếp theo · ⏰ cảnh báo quá hạn.
- **Header cột:** tên stage + đếm + **tổng tiền stage** (`MoneyVND`).
- **Tương tác:** kéo-thả đổi stage (desktop); dropdown "Chuyển" (mobile/fallback); click card mở Contact Detail/Cơ hội.
- **Trạng thái:** empty = microcopy "Pipeline rỗng" (mục 3) → chọn template ngành.
- **Phụ thuộc:** `GET /api/pipelines`, `/opportunities`, `PATCH /opportunities/:id/stage` — **chờ Codex (PR #3)**. UI = PR #3B.

---

### 2.7. Order Lite Modal (Tạo đơn)

**Mục tiêu:** chốt đơn gọn ngay trong chat. (Spec 5.8)

```text
MODAL (mở từ Inbox / Contact)
┌───────────────────────────────────────────────┐
│ Tạo đơn — Trần Mai                        ✕    │
├───────────────────────────────────────────────┤
│ Khách: Trần Mai          SĐT: 0901234567       │
│ Địa chỉ: [____________________________]        │
│ ─────────────────────────────────────────────  │
│ Sản phẩm                SL    Giá       Thành   │
│ [Combo Baby Tee ▾]      [2]  [310.000] 620.000₫│
│ [+ Thêm sản phẩm]                              │
│ ─────────────────────────────────────────────  │
│ Giảm giá: [ 20.000 ₫]   Phí ship: [ 0 ₫]       │
│ ┌─────────────────────────────────────────────┐│
│ │ Tổng tiền:                        600.000 ₫ ││
│ └─────────────────────────────────────────────┘│
│ Thanh toán: (◉)COD ( )Chuyển khoản ( )Đã cọc   │
│ Trạng thái: [Đơn mới ▾]   Sale: [Lan ▾]        │
│ Ghi chú: [__________________________________]  │
├───────────────────────────────────────────────┤
│                       [Huỷ]   [Lưu đơn nháp]   │
└───────────────────────────────────────────────┘

MOBILE: full-screen sheet, các nhóm field xếp dọc, nút Lưu cố định đáy.
```

- **Trường (Spec 5.8):** khách, SĐT, địa chỉ, sản phẩm×dòng (SL/giá), giảm, ship, **tổng tự tính** (giá×SL − giảm + ship), thanh toán (COD/CK/cọc), trạng thái, sale, ghi chú.
- **Tiền:** `MoneyVND`, nhập số nguyên đồng.
- **Nguyên tắc:** bot chỉ tạo **đơn nháp**, người thật bấm lưu/duyệt (Spec 5.9).
- **Phụ thuộc:** `POST /api/orders`, danh mục `products` — **chờ Codex (PR #5)**. UI = PR #5B.

---

### 2.8. Automation Template

**Mục tiêu:** bật/tắt các tự động hóa mẫu, cấu hình nhẹ. (Spec 5.9)

```text
DESKTOP
┌─────────────────────────────────────────────────────────────┐
│ Tự động hóa — mẫu có sẵn                                     │
├─────────────────────────────────────────────────────────────┤
│ ⚡ Comment có SĐT → ẩn comment + tạo khách + gắn tag   ( ◉ )│
│    Khi: bình luận chứa SĐT · Làm: ẩn + tạo contact + #lead  │
│ ─────────────────────────────────────────────────────────── │
│ ⚡ Khách nhắn lần đầu → gửi tin chào                   ( ◉ )│
│ ⚡ Sale chưa trả lời sau [5] phút → nhắc sale          ( ○ )│
│ ⚡ Gắn tag "Nóng" → tạo task follow-up                 ( ◉ )│
│ ⚡ Đơn "Đã nhận" → tạo task xin review                 ( ○ )│
│ ⚡ Bot không hiểu → chuyển người thật                  ( ◉ )│
└─────────────────────────────────────────────────────────────┘

MOBILE: mỗi template 1 card xếp dọc, toggle bên phải, "Cấu hình" mở sheet.
```

- **Thành phần:** danh sách template, toggle bật/tắt, ô tham số nhỏ (vd số phút), mô tả "Khi… → Làm…".
- **Trạng thái:** empty (engine chưa sẵn) = microcopy "Automation rỗng" (mục 3).
- **Phụ thuộc:** Automation rule engine + contract — **chờ Codex (PR #7)**. UI = PR #7B. UI **không** tự định nghĩa trigger/action ngoài contract.

---

### 2.9. Settings / Channel Connection

**Mục tiêu:** kết nối kênh & cấu hình brand. (Giữ phần Facebook hiện có, gom về "Kênh")

```text
DESKTOP
┌───────────────┬─────────────────────────────────────────────┐
│ Cài đặt       │ Kênh kết nối                                 │
│ • Brand       ├─────────────────────────────────────────────┤
│ • Kênh ▌      │ ┌─Facebook Page──────────────┐               │
│ • Thành viên  │ │ Nam Nguyên Store  ● CONNECTED│ [Chi tiết]   │
│ • Workspace   │ │ Bot: ( ◉ )  Webhook: ✓       │ [Ngắt]       │
│               │ └──────────────────────────────┘              │
│               │ ┌─Facebook Comment───────────┐                │
│               │ │ Theo Page đã kết nối         │ [Kiểm tra]   │
│               │ └──────────────────────────────┘              │
│               │ ┌─Zalo OA  (SAU MVP1)────────┐                │
│               │ │ Sắp ra mắt                   │ (mờ)         │
│               │ └──────────────────────────────┘              │
└───────────────┴─────────────────────────────────────────────┘
```

- **Thành phần:** card mỗi kênh (trạng thái, bot toggle, webhook, hành động), khu brand/thành viên/workspace.
- **Quyền:** kết nối/ngắt kênh chỉ OWNER/AGENCY_ADMIN; SALE chỉ xem (Spec mục 7).
- **Phụ thuộc:** phần Facebook **đã có** (giữ nguyên, Codex owner API). "Thành viên/Workspace" phụ thuộc PR #2. Zalo = SAU.

---

## 3. Microcopy & Empty States (tiếng Việt)

> Quy tắc: tiêu đề ngắn, mô tả 1 câu nói rõ **lợi ích + việc cần làm**, CTA là động từ. Không dùng tiếng Anh không cần thiết. Giọng thân thiện, gọn.

### 3.1. Inbox rỗng
```text
Tiêu đề: Chưa có hội thoại nào
Mô tả:   Kết nối Fanpage để bắt đầu nhận tin nhắn và bình luận từ khách.
CTA:     [ Kết nối Fanpage ]
Phụ:     Đã kết nối rồi? Thử gửi một tin nhắn vào Page để kiểm tra.
```
- Biến thể (đã kết nối, chưa có tin): "Chưa có tin nhắn mới. Khi khách nhắn vào Fanpage, hội thoại sẽ hiện ở đây."
- Biến thể (lọc không ra): "Không có hội thoại khớp bộ lọc. [Xoá bộ lọc]"

### 3.2. Pipeline rỗng
```text
Tiêu đề: Bắt đầu quản lý khách theo pipeline
Mô tả:   Chọn mẫu pipeline theo ngành để dựng các giai đoạn bán hàng phù hợp.
CTA:     [ Thời trang ] [ Studio ] [ Salon/Spa ] [ Agency ]
Phụ:     Tự dựng từ đầu? [ Tạo pipeline trống ]
```
- Biến thể (có pipeline, chưa có cơ hội): "Chưa có cơ hội nào. Thêm khách vào pipeline để theo dõi tiến độ chốt đơn. [+ Cơ hội]"

### 3.3. Contact rỗng
```text
Tiêu đề: Chưa có khách hàng
Mô tả:   Khách sẽ tự được tạo khi nhắn tin hoặc bình luận. Bạn cũng có thể thêm thủ công.
CTA:     [ + Thêm khách ]
Phụ:     Hoặc [ Kết nối Fanpage ] để tự động thu khách từ inbox và comment.
```
- Biến thể (tìm không ra): "Không tìm thấy khách khớp '<từ khoá>'. [Xoá tìm kiếm]"

### 3.4. Order rỗng
```text
Tiêu đề: Chưa có đơn hàng
Mô tả:   Khi khách chốt trong hội thoại, hãy bấm "Tạo đơn" để lên đơn nhanh ngay tại chat.
CTA:     [ Tạo đơn ]
```
- Biến thể (trong Contact Detail): "Khách này chưa có đơn nào. [Tạo đơn cho Trần Mai]"

### 3.5. Automation rỗng
```text
Tiêu đề: Tự động hóa giúp bạn đỡ việc tay
Mô tả:   Bật các mẫu có sẵn để tự ẩn comment lộ SĐT, nhắc sale, tạo task xin review…
CTA:     [ Xem các mẫu tự động hóa ]
Phụ:     Mẫu sẽ sẵn sàng khi hệ thống tự động hóa được bật cho brand của bạn.
```

### 3.6. Workspace rỗng
```text
Tiêu đề: Tạo brand đầu tiên của bạn
Mô tả:   Mỗi brand là một không gian làm việc riêng, dữ liệu khách không lẫn giữa các brand.
CTA:     [ + Tạo brand ]
Phụ:     Là agency quản lý nhiều brand? Bạn có thể tạo và chuyển đổi nhiều brand bất cứ lúc nào.
```

### 3.7. Microcopy phụ trợ (dùng lại nhiều nơi)
| Tình huống | Câu |
|---|---|
| Loading chung | "Đang tải…" |
| Lỗi tải | "Không tải được dữ liệu. [Thử lại]" |
| Lưu thành công | "Đã lưu" |
| Chưa có quyền | "Bạn không có quyền thực hiện thao tác này." |
| Xác nhận ngắt kênh | "Ngắt kết nối Fanpage này? Bot sẽ ngừng nhận tin từ Page." [Huỷ] [Ngắt] |
| Task quá hạn (nhãn) | "Quá hạn" |
| Khách nóng (nhãn) | "Khách nóng" |
| Đơn nháp | "Đơn nháp — cần xác nhận" |

---

## 4. Nguyên tắc mobile-first (cho sale)

1. Sale phải làm được trên điện thoại: xem hội thoại, trả lời nhanh, gắn tag, tạo task, **tạo đơn**, chuyển stage.
2. Desktop 3 cột → mobile tách thành **màn/tab** (Danh sách → Hội thoại → Hồ sơ), không nhồi 3 cột.
3. Kanban mobile: 1 cột/màn + vuốt ngang; đổi stage bằng nút thay vì bắt buộc kéo-thả.
4. Modal lớn (Order) → **full-screen sheet** trên mobile, nút hành động cố định đáy, vùng chạm ≥ 44px.
5. Bottom tab bar cho 5 mục chính; phần còn lại trong "Thêm".
6. Form: nhãn rõ, bàn phím số cho SĐT/tiền, tránh nhập nhiều bước.

---

## 5. Checklist component để build (các PR sau, không phải PR #1B)

| Component | Dùng ở | Build tại | Phụ thuộc |
|---|---|---|---|
| `WorkspaceSwitcher` | AppShell | PR #2B | Workspace API (PR #2) |
| `EmptyState` (dùng chung) | mọi danh sách | PR #2B (đặt nền) | — |
| `MoneyVND` util | Pipeline/Order/Dashboard | đi cùng PR đầu cần tiền | — |
| `FilterBar` | Inbox/Contact/Pipeline | theo từng PR | API filter |
| `KanbanBoard`/`KanbanCard` | Pipeline | PR #3B | Pipeline API (PR #3) |
| `ContactList`/`ContactDetailTabs` | Khách hàng | PR #4B | Contact API (PR #4) |
| `OrderModal` | Inbox/Contact | PR #5B | Order API (PR #5) |
| `AutomationTemplateCard` | Tự động hóa | PR #7B | Automation API (PR #7) |
| `KpiCard` + charts | Dashboard | PR #8B | Stats API (PR #8) |

> Trong **PR #1B** chỉ dừng ở wireframe + microcopy. Không tạo component thật, không sửa `InboxClient.tsx`/`AppShell.tsx` cho tới khi có API contract `READY`.

---

*Hết wireframe MVP1.*
