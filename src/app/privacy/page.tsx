import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư | DCOS",
  description: "Chính sách quyền riêng tư của DCOS cho người dùng và Meta App Review.",
};

const dataItems = [
  "Thông tin tài khoản người dùng đăng nhập hệ thống.",
  "Thông tin Fanpage người dùng kết nối.",
  "Tin nhắn, bình luận, tên hiển thị, ID người dùng Facebook/Page liên quan đến các Page mà người dùng có quyền quản trị.",
  "Thông tin khách hàng do người dùng nhập vào Customer OS như tên, số điện thoại, email, ghi chú, đơn hàng, trạng thái pipeline.",
];

const usageItems = [
  "Hiển thị và quản lý hội thoại/bình luận từ Fanpage.",
  "Hỗ trợ sale chăm sóc khách hàng.",
  "Tạo task, pipeline, đơn hàng, báo cáo vận hành.",
  "Đồng bộ kết nối Facebook Page khi người dùng chủ động cấp quyền.",
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">DCOS</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Chính sách quyền riêng tư</h1>
          <p className="mt-1 text-lg font-medium text-slate-600">Privacy Policy</p>
          <p className="mt-4 text-sm text-slate-500">Ngày cập nhật: 16/06/2026</p>
        </header>

        <section className="mt-8 space-y-4">
          <p>
            DCOS là hệ điều hành cá nhân giúp người kinh doanh quản lý khách hàng, tin nhắn,
            bình luận, fanpage, pipeline bán hàng, catalog và chăm sóc khách hàng.
          </p>
          <p>
            Hệ thống được vận hành bởi Hồng Đức Digital / D.C Group để phục vụ người dùng đã đăng
            nhập và các workspace/Space tương ứng.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-950">Dữ liệu có thể được xử lý</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            {dataItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-950">Mục đích sử dụng dữ liệu</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            {usageItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Chia sẻ và bảo mật dữ liệu</h2>
          <p>DCOS không bán dữ liệu người dùng cho bên thứ ba.</p>
          <p>
            Dữ liệu chỉ được sử dụng để cung cấp tính năng Customer OS, Sales OS và Catalog OS cho người dùng đã đăng nhập
            và Space tương ứng.
          </p>
          <p>
            Token và thông tin nhạy cảm được lưu trữ để phục vụ kết nối hệ thống. Người dùng có
            trách nhiệm chỉ kết nối Page mà họ có quyền quản trị.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Yêu cầu xóa dữ liệu</h2>
          <p>
            Người dùng có thể yêu cầu xóa dữ liệu qua trang{" "}
            <a className="font-medium text-brand underline" href="/data-deletion">
              /data-deletion
            </a>{" "}
            hoặc liên hệ email{" "}
            <a className="font-medium text-brand underline" href="mailto:dcentertainment2025@gmail.com">
              dcentertainment2025@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Thay đổi chính sách</h2>
          <p>Chính sách có thể được cập nhật và ngày cập nhật sẽ hiển thị trên trang này.</p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <a className="font-semibold text-brand underline" href="https://crm.hongducdigital.com">
            Quay lại trang chủ DCOS
          </a>
        </footer>
      </article>
    </main>
  );
}
