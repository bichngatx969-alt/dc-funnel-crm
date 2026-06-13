import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailEnabled } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { EmailRunButton } from "@/components/EmailRunButton";

export const dynamic = "force-dynamic";

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent ?? "text-gray-900"}`}>{value}</div>
    </div>
  );
}

const LOG_STYLE: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  QUEUED: "bg-sky-100 text-sky-700",
  FAILED: "bg-rose-100 text-rose-700",
  OPENED: "bg-violet-100 text-violet-700",
  CLICKED: "bg-indigo-100 text-indigo-700",
  BOUNCED: "bg-amber-100 text-amber-800",
  COMPLAINED: "bg-orange-100 text-orange-800",
};

export default async function EmailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [sentToday, failedToday, subscribed, unsubscribed, activeSequences, activeEnrollments, recentLogs] =
    await Promise.all([
      prisma.emailLog.count({ where: { status: "SENT", createdAt: { gte: startOfToday } } }),
      prisma.emailLog.count({ where: { status: "FAILED", createdAt: { gte: startOfToday } } }),
      prisma.customer.count({ where: { emailConsent: true, emailStatus: "SUBSCRIBED" } }),
      prisma.customer.count({ where: { emailStatus: "UNSUBSCRIBED" } }),
      prisma.emailSequence.count({ where: { isActive: true } }),
      prisma.emailAutomationEnrollment.count({ where: { status: "ACTIVE" } }),
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { customer: { select: { name: true, email: true } } },
      }),
    ]);

  const enabled = isEmailEnabled();

  return (
    <AppShell user={user} active="email">
      <div className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Email Automation</h1>
          <div className="flex items-center gap-3">
            <Link href="/email/templates" className="text-sm font-medium text-brand hover:underline">
              Templates
            </Link>
            <Link href="/email/sequences" className="text-sm font-medium text-brand hover:underline">
              Sequences
            </Link>
            <EmailRunButton />
          </div>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Email chỉ gửi cho khách <b>đã đồng ý nhận</b> (consent) và chưa unsubscribe/bounce/complain. Mọi email đều có link hủy đăng ký.
        </p>

        {!enabled && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ Email đang <b>tắt</b> (thiếu <code>RESEND_API_KEY</code> hoặc <code>EMAIL_FROM_ADDRESS</code>).
            App vẫn chạy và vẫn lưu email/consent của khách; chỉ chưa gửi được. Điền 2 biến này trong <code>.env</code> để bật.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Email gửi hôm nay" value={sentToday} accent="text-emerald-600" />
          <StatCard label="Email lỗi hôm nay" value={failedToday} accent="text-rose-600" />
          <StatCard label="Đang subscribed" value={subscribed} accent="text-sky-600" />
          <StatCard label="Đã unsubscribe" value={unsubscribed} accent="text-gray-600" />
          <StatCard label="Sequence active" value={activeSequences} accent="text-violet-600" />
          <StatCard label="Enrollment active" value={activeEnrollments} accent="text-indigo-600" />
        </div>

        <div className="mt-6 rounded-xl border bg-white">
          <h2 className="border-b px-4 py-3 font-semibold">Email gần đây</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Tới</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Trạng thái</th>
                <th className="px-4 py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    Chưa có email nào được gửi.
                  </td>
                </tr>
              )}
              {recentLogs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-2">{l.toEmail}</td>
                  <td className="px-4 py-2">{l.subject}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${LOG_STYLE[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {l.status}
                    </span>
                    {l.errorMessage && <span className="ml-1 text-xs text-rose-500">{l.errorMessage}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(l.createdAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
