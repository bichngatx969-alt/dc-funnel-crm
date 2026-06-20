import { Icon, type IconName } from "@/components/layout/icons";

type Section = {
  icon: IconName;
  title: string;
  desc: string;
};

// 8 khối AI Growth Optimizer sẽ tổng hợp mỗi ngày (chờ backend — chưa fake số liệu).
const SECTIONS: Section[] = [
  { icon: "dashboard", title: "Tổng quan hôm nay", desc: "Tin nhắn mới, hội thoại cần xử lý, đơn mới, doanh thu trong ngày." },
  { icon: "sparkles", title: "Insight nổi bật", desc: "Tín hiệu đáng chú ý từ hội thoại & hành vi khách trong 24h." },
  { icon: "pipeline", title: "Điểm nghẽn pipeline", desc: "Giai đoạn đang tắc, cơ hội nguội, deal cần đẩy." },
  { icon: "contacts", title: "Khách cần follow-up", desc: "Khách nóng chưa được chăm, quá hạn phản hồi, sắp nguội." },
  { icon: "offers", title: "Offer nên test", desc: "Ưu đãi/combo AI gợi ý nên thử theo nhóm khách." },
  { icon: "products", title: "Sản phẩm nên đẩy", desc: "Sản phẩm được hỏi nhiều, tỷ lệ chốt cao, tồn cần xả." },
  { icon: "team", title: "Ghi chú huấn luyện sale", desc: "Mẫu hội thoại tốt/chưa tốt để cải thiện kỹ năng chốt." },
  { icon: "tasks", title: "Việc nên làm ngày mai", desc: "Danh sách hành động ưu tiên để tăng trưởng ngày kế tiếp." },
];

export function AiGrowthReport() {
  return (
    <div className="space-y-5">
      {/* Banner trạng thái */}
      <div className="dc-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-indigo-100 text-brand">
          <Icon name="sparkles" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-gray-900">AI Growth Optimizer</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Mỗi ngày AI tổng hợp dữ liệu hội thoại, pipeline và đơn hàng để trả lời câu hỏi:
            <span className="font-medium text-gray-700"> “Ngày mai nên làm gì để tăng trưởng?”</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Đang phát triển — chờ AI backend
        </span>
      </div>

      {/* Lưới khối báo cáo (empty state, không fake dữ liệu) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <section key={s.title} className="dc-card flex flex-col gap-3 rounded-2xl p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <Icon name={s.icon} className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-[14px] font-semibold text-gray-800">{s.title}</h3>
            </div>
            <p className="text-[12.5px] leading-relaxed text-gray-500">{s.desc}</p>
            <div className="mt-auto rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-3 text-center">
              <p className="text-[12px] text-gray-400">Chưa có dữ liệu AI. Sẽ hiển thị khi backend sẵn sàng.</p>
            </div>
          </section>
        ))}
      </div>

      <p className="px-1 text-[11.5px] text-gray-400">
        Nguyên tắc: AI chỉ phân tích &amp; gợi ý dựa trên dữ liệu trong workspace; không tự động gửi tin;
        không phán xét khách hàng. Sale luôn là người quyết định cuối.
      </p>
    </div>
  );
}
