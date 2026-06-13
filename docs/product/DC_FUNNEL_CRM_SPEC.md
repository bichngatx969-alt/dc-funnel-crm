# D.C FUNNEL CRM — Product Spec (MVP 1)

**Phiên bản:** v1.0
**Ngày tạo:** 2026-06-14
**Owner tài liệu:** Claude (Product UI/UX Owner)
**Trạng thái:** Draft for build — dùng làm nguồn chân lý sản phẩm cho MVP 1
**Liên quan:** `docs/DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md` (kế hoạch & phân vai), `docs/ui/MVP1_WIREFRAMES.md` (wireframe), `docs/dev/BRANCH_AND_OWNERSHIP.md` (ownership)

> ⚠️ Tài liệu này mô tả **sản phẩm** (cái gì & vì sao), không phải hợp đồng API. Mọi field/luồng kỹ thuật chỉ là **đề xuất sản phẩm**; schema và API do Codex chốt (xem mục 16 của plan). Khi mô tả dữ liệu, tài liệu này nói ở mức nghiệp vụ, không khóa cứng tên field DB.

---

## 0. Mục đích & cách đọc

- **Founder / anh Đức:** đọc mục 1, 2, 5 (modules), 10 (ngoài scope) để xác nhận đúng sản phẩm muốn làm.
- **Codex (backend):** đọc mục 3 (mô hình dữ liệu nghiệp vụ), 7 (ma trận quyền), 8 (vòng đời trạng thái) để biết product intent trước khi thiết kế schema/API.
- **Claude (UI):** đọc toàn bộ; dùng cùng `MVP1_WIREFRAMES.md` khi build.

Ký hiệu mức ưu tiên: **[MVP1]** bắt buộc · **[P1]** nên có trong MVP1 nếu kịp · **[SAU]** ngoài MVP1.

---

## 1. Tầm nhìn & định vị

> **D.C FUNNEL CRM — CRM Funnel multi-brand cho agency và local brand Việt Nam.**

Giúp agency/brand Việt gom inbox + bình luận Facebook (sau đó Zalo), lưu khách vào CRM, quản lý pipeline bán hàng, chốt đơn gọn trong chat, nhắc sale follow-up và báo cáo hiệu quả theo lead / nhân viên / kênh / doanh thu.

**Tư duy lõi:**
- Lấy **Contact + Pipeline + Workspace** từ tư duy GoHighLevel / NEXTfunnel.
- Lấy **Comment-to-Inbox + tạo đơn trong chat + social commerce** từ tư duy Pancake / POSCake / Botcake.
- **Hẹp nhưng sâu** cho thị trường Việt Nam. Không clone phần mềm nặng.

**Khác biệt định vị:** Gọn hơn Pancake, dễ hiểu hơn GHL, tiếng Việt 100%, mobile-first cho sale.

---

## 2. Personas & nhu cầu

| Persona | Vai trò | Việc chính trong app | Đau nhất |
|---|---|---|---|
| **Agency Admin** | Quản lý nhiều brand/workspace | Tạo workspace, mời thành viên, xem chéo nhiều brand | Data brand bị lẫn, không thấy tổng thể |
| **Brand Owner / Founder** | Chủ 1 brand | Xem dashboard tiền & hiệu quả, theo dõi sale | Không biết tiền kẹt ở đâu, sale làm tốt hay không |
| **Manager** | Quản lý đội sale 1 brand | Phân khách, theo dõi task, kiểm pipeline | Lead rơi, không ai theo, không biết ai chậm |
| **Sale / Agent** | Trực chat & chốt đơn | Trả lời inbox/comment, gắn tag, tạo task, chốt đơn, đẩy stage | Nhiều cửa sổ, mất khách, quên follow-up, làm trên điện thoại bất tiện |
| **Marketer** | Chạy ads & nội dung | Xem lead theo campaign/nguồn, hiệu quả kênh | Không biết campaign nào ra lead tốt |

---

## 3. Mô hình dữ liệu nghiệp vụ (Contact-centric)

Mọi thứ xoay quanh **Khách hàng (Contact)**. Đây là mô hình **sản phẩm**, không phải schema.

```text
Organization (Agency)
└── Workspace (Brand)                ← ranh giới cô lập dữ liệu (tenant)
      ├── Members (User + Role)
      ├── Channels (FB Page, FB Comment, [SAU] Zalo OA)
      └── Contact (Khách hàng) ── trung tâm
            ├── Conversations + Messages   (hội thoại)
            ├── Comments                   (bình luận kéo về)
            ├── Tags + Notes               (phân loại + ghi chú nội bộ)
            ├── Tasks                      (việc cần làm / follow-up)
            ├── Opportunities             (cơ hội trong pipeline)
            ├── Orders                     (đơn hàng)
            └── Activities                 (dòng thời gian tổng hợp)
```

**Quy tắc cô lập (tenant isolation):** mọi dữ liệu nghiệp vụ thuộc đúng **một** Workspace. Người dùng chỉ thấy dữ liệu của workspace đang chọn. (Backend enforce — Codex, mục 20.5 plan.)

---

## 4. Nguyên tắc sản phẩm

1. **Contact là trung tâm** — mọi hành động (chat, task, cơ hội, đơn) đều gắn về 1 khách.
2. **Inbox không chỉ để nhắn** — từ inbox sale phải gắn tag, tạo task, tạo cơ hội, tạo đơn, đổi stage, ghi chú, mà không rời màn.
3. **Pipeline là bản đồ tiền** — founder nhìn vào biết lead ở đâu, tiền kẹt chỗ nào, sale nào nhanh/chậm.
4. **Order Lite, không POS nặng** — chốt đơn nhanh; không kho/kế toán/đối soát trong MVP1.
5. **Việt Nam-first** — Tiếng Việt, VND, Asia/Ho_Chi_Minh, mobile-first cho sale.
6. **Không màn trắng** — mọi danh sách rỗng phải có empty state hướng dẫn hành động (xem microcopy ở `MVP1_WIREFRAMES.md` mục 3).

---

## 5. Modules MVP 1

### 5.1. Multi-brand Workspace **[MVP1]**

**Mục tiêu:** Một hệ thống dùng chung cho nhiều brand; agency quản lý nhiều workspace; dữ liệu không lẫn.

**User stories:**
- Là Agency Admin, tôi tạo nhiều workspace (mỗi brand một workspace) và mời thành viên vào từng workspace.
- Là người dùng thuộc nhiều brand, tôi chuyển nhanh giữa các workspace từ thanh điều hướng.
- Là Owner, tôi đặt tên brand, ngành, timezone, tiền tệ cho workspace.

**Tính năng MVP1:**
- Workspace switcher luôn hiển thị workspace hiện tại + cho phép chuyển.
- Mỗi workspace có: tên, ngành, timezone (mặc định Asia/Ho_Chi_Minh), tiền tệ (mặc định VND), locale (vi-VN).
- Data nghiệp vụ (khách, hội thoại, task, đơn, cơ hội...) gắn workspace; chuyển workspace → chỉ thấy data của workspace đó.

**Ngoài scope MVP1:** white-label sâu, custom domain mỗi brand, billing/subscription theo workspace.

**Phụ thuộc:** Workspace API (Codex PR #2). UI = PR #2B (sau khi có contract).

**Acceptance (sản phẩm):**
- Người dùng luôn biết đang ở workspace nào.
- Chuyển workspace không thấy data brand khác.
- Có workspace mặc định cho dữ liệu cũ (không mất khách hiện có).

---

### 5.2. Role & Permission cơ bản **[MVP1]**

**Mục tiêu:** Phân quyền theo workspace để agency vận hành nhiều người an toàn.

**Vai trò (đề xuất, Codex chốt enum):** `AGENCY_ADMIN`, `OWNER`, `MANAGER`, `SALE`, `MARKETER`.

**Nguyên tắc:** **Backend enforce quyền — UI ẩn nút là chưa đủ** (plan mục 20.6). UI chỉ ẩn/hiện cho gọn trải nghiệm; chặn thật ở API.

**Ví dụ ranh giới (xem ma trận đầy đủ mục 7):**
- SALE: trực chat, quản khách được giao, tạo task/đơn/cơ hội; **không** đổi cài đặt workspace, **không** ngắt kết nối Fanpage.
- MARKETER: xem lead theo nguồn/campaign; **không** xem tài chính sâu trừ khi được cấp.
- AGENCY_ADMIN: thấy nhiều workspace.

**Ngoài scope MVP1:** phân quyền theo từng field, custom role builder.

**Phụ thuộc:** `requireRole()` backend (Codex PR #1) + role theo workspace (PR #2).

---

### 5.3. Contact CRM 360 **[MVP1]**

**Mục tiêu:** Một hồ sơ khách đầy đủ để sale hiểu khách trong 5 giây.

**Thông tin khách:**
- Cơ bản: tên, SĐT, email, giới tính, ngày sinh, địa chỉ.
- Nguồn: nguồn lead, kênh đầu tiên, fanpage/campaign/bài viết.
- Phân loại: tag, note nội bộ, lead score, stage (COLD/WARM/HOT/CUSTOMER/LOST).
- Quan hệ: nhân viên phụ trách (owner).
- Custom field theo ngành **[P1]**.

**Khối 360 trong trang chi tiết khách (tab):**
- Hội thoại (lịch sử chat các kênh).
- Cơ hội (opportunities trong pipeline).
- Đơn hàng (lịch sử order).
- Task follow-up.
- Note nội bộ.
- Activities (dòng thời gian tổng hợp) **[P1]**.

**Dedup/merge:** đề xuất nhận diện trùng theo SĐT/email trong cùng workspace (chi tiết Codex chốt — quyết định D liên quan SĐT làm khóa).

**Phụ thuộc:** Contact API + Notes (Codex PR #4). UI = PR #4B.

**Acceptance:** mở 1 khách thấy đủ thông tin + lịch sử hội thoại/đơn/cơ hội/task/note; sửa được owner và field cơ bản; tạo note được.

---

### 5.4. Unified Inbox **[MVP1]**

**Mục tiêu:** Một hộp thư gom mọi hội thoại để sale xử lý nhanh, kể cả trên điện thoại.

**Nguồn kênh MVP1:** Facebook Page Inbox (giữ & mở rộng), Facebook Comment-to-Inbox (5.5). **[SAU]** Zalo OA.

**Tính năng:**
- Danh sách hội thoại + nội dung + panel khách (desktop 3 cột; mobile tách tab — xem wireframe).
- Bộ lọc: **Tất cả · Của tôi · Chưa đọc · Cần xử lý · Chưa gán · Khách nóng · Theo kênh · Theo tag · Theo nhân viên.**
- Ghi chú nội bộ trên hội thoại/khách.
- Trả lời nhanh (quick reply / mẫu câu) **[P1]**.
- Gán sale (assign), đánh dấu đã đọc/chưa đọc.
- Từ inbox: gắn tag, tạo task, tạo cơ hội, **tạo đơn (Order Lite)**, đổi stage, take over / trả về bot (giữ cơ chế hiện có).

**Realtime:** MVP1 giữ **polling** (đề xuất D-006); nâng WebSocket là [SAU].

**Phụ thuộc:** mở rộng API conversations (Codex). Nhiều bộ lọc cần backend hỗ trợ → cần contract trước khi build.

**Acceptance:** sale lọc được "Của tôi / Chưa đọc / Khách nóng"; trả lời + gắn tag + tạo task ngay trong inbox; dùng được trên mobile.

---

### 5.5. Facebook Comment-to-Inbox **[MVP1]**

**Mục tiêu:** Kéo bình luận từ bài viết/quảng cáo về hệ thống, biến comment thành lead, bảo vệ SĐT khách khỏi đối thủ.

**Tính năng:**
- Kéo comment từ bài viết/quảng cáo về inbox "Cần xử lý".
- Phát hiện comment chứa **SĐT Việt Nam**.
- **Ẩn comment chứa SĐT** (nếu app có quyền — quyết định D-002).
- Tạo contact từ comment; gắn **nguồn = bài viết/campaign**.
- Trả lời công khai (public reply) và/hoặc riêng (private reply) **[P1]**.

**Phụ thuộc:** FB feed webhook + xử lý comment (Codex PR #6, cần quyền `pages_manage_engagement`). UI = PR #6B.

**Acceptance:** comment có SĐT → tự tạo contact + vào inbox "Cần xử lý" + (nếu đủ quyền) ẩn comment; thấy được bài viết/nguồn gắn với khách.

---

### 5.6. Pipeline Kanban **[MVP1]**

**Mục tiêu:** Quản lý khách từ lead đến chốt theo dạng bảng kéo-thả; founder thấy "bản đồ tiền".

**Tính năng:**
- Pipeline gồm nhiều **stage** (cột). Mỗi khách/cơ hội là 1 **card**.
- **Pipeline template theo ngành** (chọn khi tạo): Thời trang · Studio · Salon/Spa · Agency.
- Đổi stage bằng kéo-thả (fallback: chọn từ dropdown nếu kéo khó / trên mobile).
- **Tổng giá trị (VND) theo từng stage.**
- Lọc theo sale / tag / kênh.
- Cảnh báo quá hạn (card không hoạt động/đến hạn).

**Pipeline mẫu (theo plan mục 13.4):**
```text
Thời trang: Lead mới → Hỏi mẫu/size → Đã gửi set → Đang cân nhắc → Chốt đơn → Giao hàng → Mua lại
Studio:     Lead mới → Tư vấn concept → Báo giá → Chờ cọc → Đã đặt lịch → Đã chụp → Giao ảnh → Xin review
Salon/Spa:  Lead mới → Đã tư vấn → Đã đặt lịch → Đã đến → Đã thanh toán → Chăm sóc lại
Agency:     Lead mới → Đã trao đổi → Audit → Proposal → Đàm phán → Chốt hợp đồng → Onboarding
```

**Card hiển thị:** tên khách, tên cơ hội, giá trị VND, kênh/nguồn, tag, owner, last activity, task tiếp theo, cảnh báo quá hạn.

**Thuật ngữ UI:** dùng **"Cơ hội"** thay cho "Opportunity" (plan mục 21.1).

**Phụ thuộc:** Pipeline/Opportunity API (Codex PR #3). UI = PR #3B.

**Acceptance:** tạo pipeline từ template; tạo cơ hội; kéo qua stage; thấy tổng tiền mỗi cột; cảnh báo quá hạn rõ.

---

### 5.7. Task Follow-up **[MVP1]**

**Mục tiêu:** Không để khách rơi; nhắc sale đúng việc đúng lúc.

**Tính năng:**
- Tạo task từ inbox / contact / pipeline / order.
- Loại task: gọi lại, nhắn lại, gửi báo giá, nhắc cọc, xác nhận đơn, nhắc lịch hẹn, xin review, chăm sóc lại.
- Có `dueAt`, người phụ trách, trạng thái (TODO/DONE/CANCELLED).
- **Cảnh báo task quá hạn.**
- **Cảnh báo lead nóng chưa xử lý.**
- Nhắc (reminder) **[P1]**.

**Phụ thuộc:** mở rộng Task model (Codex, đi cùng các PR liên quan). Task cơ bản đã có sẵn — giữ lại.

**Acceptance:** tạo task gắn khách; thấy danh sách Quá hạn / Hôm nay / Sắp tới; task quá hạn nổi bật.

---

### 5.8. Order Lite **[MVP1]**

**Mục tiêu:** Chốt đơn gọn ngay trong chat; không làm POS phức tạp.

**Trường đơn:** khách hàng, SĐT, địa chỉ, sản phẩm, số lượng, giá, giảm giá, phí ship, tổng tiền, phương thức (COD / chuyển khoản / đã cọc), trạng thái, ghi chú, sale phụ trách.

**Tiền tệ:** VND, lưu **integer đồng** (vd `299000`), format bằng `Intl.NumberFormat("vi-VN")` (plan mục 20.2).

**Trạng thái đơn:**
```text
Đơn mới → Đã xác nhận → Đang giao → Đã nhận → Hoàn/Hủy
```

**Tính năng:**
- Nút **"Tạo đơn"** trong inbox/contact → modal Order Lite.
- Lịch sử đơn hiển thị trong Contact 360.
- Doanh thu theo đơn chảy vào Dashboard.

**Ngoài scope MVP1:** kho đa điểm, nhập/xuất/kiểm kê, kế toán/công nợ, đối soát COD, in vận đơn hãng ship.

**Phụ thuộc:** Product/Order/OrderItem API (Codex PR #5). UI = PR #5B.

**Acceptance:** tạo đơn từ chat trong < 1 phút; đơn hiện trong lịch sử khách; đổi trạng thái đơn; tổng tiền tính đúng (giá×SL − giảm + ship).

---

### 5.9. Automation Template **[MVP1 cơ bản]**

**Mục tiêu:** Tự động hóa các việc lặp đi lặp lại bằng **template bật/tắt**, chưa cần flow builder canvas.

**Template khởi đầu (trigger → action):**
1. Khách comment có SĐT → ẩn comment + tạo contact + gắn tag.
2. Khách nhắn lần đầu → gửi tin chào.
3. Sale chưa phản hồi sau 5 phút → nhắc sale.
4. Khách được gắn tag "Nóng" → tạo task follow-up.
5. Đơn chuyển "Đã nhận" → tạo task xin review.
6. Bot không hiểu → chuyển người thật (handoff).

**Nguyên tắc:** bot chỉ tạo **đơn nháp**, người thật duyệt. Bot không tự gửi đơn/không tự chốt tiền.

**Ngoài scope MVP1:** flow builder kéo-thả canvas, điều kiện phức tạp nhiều nhánh, broadcast hàng loạt.

**Phụ thuộc:** Automation rule engine (Codex PR #7). UI = PR #7B. (UI chỉ là bật/tắt + cấu hình nhẹ theo contract.)

**Acceptance:** bật/tắt từng template; chỉnh tham số nhẹ (vd số phút nhắc sale); thấy template nào đang chạy.

---

### 5.10. Founder Dashboard **[MVP1]**

**Mục tiêu:** Founder mở 1 màn biết sức khỏe kinh doanh hôm nay.

**Chỉ số (KPI):**
- Lead mới hôm nay.
- Hội thoại chưa xử lý.
- Thời gian phản hồi trung bình.
- Task quá hạn.
- Cơ hội đang mở (số lượng + giá trị).
- Doanh thu dự kiến (pipeline).
- Doanh thu đã chốt.
- Tỷ lệ chuyển stage.
- Sale performance (theo nhân viên).
- Nguồn lead hiệu quả (theo kênh/campaign).
- Đơn theo trạng thái.

**Bộ lọc:** theo workspace · thời gian · sale · kênh.

**Nguyên tắc:** **số liệu lấy từ database thật**, không fake. KPI doanh thu/pipeline phụ thuộc Order + Pipeline có dữ liệu.

**Phụ thuộc:** Founder Stats API (Codex PR #8, sau Pipeline + Order). UI nâng cấp = PR #8B.

**Acceptance:** founder lọc theo thời gian/sale/kênh; thấy tiền dự kiến vs đã chốt; thấy sale nào hiệu quả; "hôm nay" theo giờ Việt Nam.

---

## 6. Localization (Việt Nam-first)

| Hạng mục | Mặc định |
|---|---|
| Ngôn ngữ | Tiếng Việt 100% |
| Tiền tệ | VND (integer đồng, format `vi-VN`) |
| Timezone | Asia/Ho_Chi_Minh (mọi filter "hôm nay" theo giờ VN) |
| Định dạng ngày | dd/MM/yyyy, giờ 24h |
| SĐT | chuẩn hóa đầu số di động VN (đã có `phone.ts`) |
| Kênh | Facebook Messenger + Comment (MVP1), Zalo OA (SAU) |

---

## 7. Ma trận quyền (đề xuất sản phẩm — Codex enforce backend)

✅ được phép · ➖ chỉ data được giao · ❌ không

| Hành động | AGENCY_ADMIN | OWNER | MANAGER | SALE | MARKETER |
|---|---|---|---|---|---|
| Xem nhiều workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tạo/sửa workspace settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mời/xóa thành viên | ✅ | ✅ | ➖ (sale) | ❌ | ❌ |
| Kết nối/ngắt Fanpage, kênh | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem toàn bộ hội thoại workspace | ✅ | ✅ | ✅ | ➖ | ➖ |
| Trả lời chat, gắn tag, ghi chú | ✅ | ✅ | ✅ | ✅ | ➖ |
| Tạo/sửa contact, task, cơ hội | ✅ | ✅ | ✅ | ✅ (được giao) | ➖ |
| Tạo/sửa đơn hàng | ✅ | ✅ | ✅ | ✅ (được giao) | ❌ |
| Cấu hình automation | ✅ | ✅ | ✅ | ❌ | ➖ |
| Xem dashboard tài chính sâu | ✅ | ✅ | ✅ | ❌ | ➖ (nếu cấp) |
| Xem báo cáo nguồn/campaign | ✅ | ✅ | ✅ | ➖ | ✅ |

> Đây là **đề xuất**. Codex chốt chi tiết enforcement & ngoại lệ trong PR #2; nếu khác bảng này, ghi vào mục 19 plan.

---

## 8. Vòng đời & trạng thái

**Lead stage (CRM, trên Contact):** `COLD → WARM → HOT → CUSTOMER` (hoặc `LOST`). Giữ enum hiện có; không hạ cấp tự động.

**Conversation status:** `BOT_ACTIVE → HUMAN_TAKEOVER → CLOSED` (giữ cơ chế hiện có).

**Opportunity status:** `OPEN → WON / LOST` (kèm stage trong pipeline).

**Order status:** `Đơn mới → Đã xác nhận → Đang giao → Đã nhận → Hoàn/Hủy`.

**Task status:** `TODO → DONE / CANCELLED` (+ trạng thái suy ra: Quá hạn nếu `dueAt < hôm nay` và chưa DONE).

---

## 9. Glossary (thuật ngữ UI tiếng Việt)

| Khái niệm | Hiển thị UI | Tránh dùng |
|---|---|---|
| Workspace | Brand / Không gian làm việc | tenant |
| Contact | Khách hàng | Lead (chỉ dùng nội bộ) |
| Conversation | Hội thoại | thread |
| Opportunity | Cơ hội | Opportunity |
| Pipeline | Pipeline / Quy trình bán | funnel (gây nhầm) |
| Stage | Giai đoạn / cột | — |
| Order | Đơn hàng | — |
| Task | Việc cần làm | to-do |
| Automation | Tự động hóa | — |
| Dashboard | Tổng quan / Bảng điều khiển | — |

---

## 10. Ngoài scope MVP 1

POS đa kho · nhập/xuất/kiểm kho · kế toán/công nợ · đối soát COD · marketplace · LMS/Course/Community · Voice AI · Funnel Builder · white-label sâu · flow builder canvas phức tạp · broadcast hàng loạt phức tạp · affiliate · Zalo OA (nếu làm chậm core).

---

## 11. Câu hỏi mở (đồng bộ với plan mục 19)

| ID | Câu hỏi | Ảnh hưởng sản phẩm |
|---|---|---|
| D-002 | App FB đã có quyền `pages_manage_engagement`? | Quyết định có ẩn được comment chứa SĐT (5.5) |
| D-003 | Tiền VND integer đồng? (đề xuất: Có) | Cách hiển thị & nhập tiền Order (5.8) |
| D-004 | Zalo OA P2 hay ép MVP1? (đề xuất: P2) | Phạm vi kênh Unified Inbox (5.4) |
| D-005 | Email module giữ hay ẩn nav? (đề xuất: giữ code, ẩn nav nếu rối) | IA điều hướng |
| D-006 | Realtime polling hay WebSocket? (đề xuất: polling MVP1) | Trải nghiệm Inbox (5.4) |
| (mới) D-007 | SĐT có là khóa dedup contact trong workspace? | Logic merge contact (5.3) |

---

*Hết spec MVP1. Cập nhật cùng nhịp với `DC_FUNNEL_CRM_IMPLEMENTATION_PLAN.md`.*
