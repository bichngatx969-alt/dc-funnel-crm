import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hướng dẫn xóa dữ liệu người dùng | D.C FUNNEL CRM",
  description: "Hướng dẫn xóa dữ liệu người dùng khỏi D.C FUNNEL CRM cho Meta App Review.",
};

const emailRequirements = [
  "Họ tên",
  "Email đăng nhập CRM nếu có",
  "Fanpage/workspace liên quan nếu có",
  "Loại dữ liệu muốn xóa",
  "Lý do nếu muốn cung cấp",
];

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">D.C FUNNEL CRM</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Hướng dẫn xóa dữ liệu người dùng
          </h1>
          <p className="mt-1 text-lg font-medium text-slate-600">User Data Deletion Instructions</p>
          <p className="mt-4 text-sm text-slate-500">Ngày cập nhật: 16/06/2026</p>
        </header>

        <section className="mt-8 space-y-4">
          <p>Người dùng có thể yêu cầu xóa dữ liệu khỏi D.C FUNNEL CRM.</p>
          <h2 className="text-xl font-semibold text-slate-950">Cách 1: Gửi email yêu cầu xóa dữ liệu</h2>
          <p>
            Vui lòng gửi email tới{" "}
            <a className="font-medium text-brand underline" href="mailto:dcentertainment2025@gmail.com">
              dcentertainment2025@gmail.com
            </a>{" "}
            với tiêu đề: <strong>Yêu cầu xóa dữ liệu D.C FUNNEL CRM</strong>.
          </p>
          <p>Nội dung email cần gồm:</p>
          <ul className="list-disc space-y-2 pl-6 text-slate-700">
            {emailRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">
            Cách 2: Ngắt kết nối ứng dụng khỏi Facebook
          </h2>
          <p>
            Vào Facebook → Settings & privacy → Settings → Business integrations hoặc Apps and
            Websites → tìm D.C FUNNEL CRM → Remove.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Thời gian và phạm vi xử lý</h2>
          <p>
            Sau khi nhận yêu cầu hợp lệ, hệ thống sẽ xử lý xóa hoặc ẩn danh dữ liệu trong thời
            gian hợp lý.
          </p>
          <p>
            Một số dữ liệu có thể được giữ lại tạm thời nếu cần cho mục đích bảo mật, chống gian
            lận, tuân thủ pháp luật hoặc sao lưu kỹ thuật.
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
