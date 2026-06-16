import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ | D.C FUNNEL CRM",
  description: "Điều khoản dịch vụ của D.C FUNNEL CRM cho người dùng và Meta App Review.",
};

const terms = [
  "Bằng việc sử dụng D.C FUNNEL CRM, người dùng đồng ý sử dụng hệ thống đúng mục đích quản lý CRM/funnel cho doanh nghiệp.",
  "Người dùng phải có quyền hợp pháp với Fanpage, tài khoản hoặc doanh nghiệp mà họ kết nối.",
  "Không sử dụng hệ thống để spam, lừa đảo, gửi nội dung vi phạm pháp luật hoặc vi phạm chính sách của Meta/Facebook.",
  "Người dùng chịu trách nhiệm về nội dung tin nhắn, bình luận, email và automation mà họ gửi qua hệ thống.",
  "D.C FUNNEL CRM có thể tạm ngưng quyền truy cập nếu phát hiện hành vi lạm dụng hoặc gây rủi ro bảo mật.",
  "Dịch vụ có thể thay đổi, nâng cấp hoặc bảo trì theo nhu cầu vận hành.",
  "D.C FUNNEL CRM không cam kết hệ thống không bao giờ gián đoạn.",
  "Hệ thống hỗ trợ vận hành bán hàng/CRM; người dùng tự chịu trách nhiệm về quyết định kinh doanh và nội dung giao tiếp với khách hàng.",
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">D.C FUNNEL CRM</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Điều khoản dịch vụ</h1>
          <p className="mt-1 text-lg font-medium text-slate-600">Terms of Service</p>
          <p className="mt-4 text-sm text-slate-500">Ngày cập nhật: 16/06/2026</p>
        </header>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-950">Điều khoản sử dụng</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-slate-700">
            {terms.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Liên hệ hỗ trợ</h2>
          <p>
            Nếu cần hỗ trợ về việc sử dụng dịch vụ, vui lòng liên hệ{" "}
            <a className="font-medium text-brand underline" href="mailto:dcentertainment2025@gmail.com">
              dcentertainment2025@gmail.com
            </a>
            .
          </p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <a className="font-semibold text-brand underline" href="https://crm.hongducdigital.com">
            Quay lại trang chủ D.C FUNNEL CRM
          </a>
        </footer>
      </article>
    </main>
  );
}
