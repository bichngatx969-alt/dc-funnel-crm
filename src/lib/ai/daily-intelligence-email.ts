import { env, isEmailEnabled } from "@/lib/env";
import { ResendEmailProvider } from "@/lib/email/resend";
import type { DailyIntelligenceReport } from "./daily-intelligence";

function vnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderDailyReportEmail(report: DailyIntelligenceReport): { subject: string; html: string; text: string } {
  const s = report.summary;
  const subject = `[DCOS] Báo cáo ${report.reportDate} — ${s.mainBottleneck} · ${s.overallScore}đ`;

  const actionsHtml = report.actionItems
    .slice(0, 6)
    .map((a) => `<li><b>[${a.priority}]</b> ${escapeHtml(a.title)} <span style="color:#888">(${escapeHtml(a.source)})</span></li>`)
    .join("");
  const bottlenecksHtml = report.bottlenecks
    .slice(0, 5)
    .map((b) => `<li><b>${escapeHtml(b.area)}:</b> ${escapeHtml(b.detail)}</li>`)
    .join("");

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <h2 style="margin:0 0 4px">DCOS Daily Intelligence</h2>
    <p style="color:#6b7280;margin:0 0 16px">Ngày ${report.reportDate} · điểm tổng <b>${s.overallScore}</b> · điểm nghẽn <b>${escapeHtml(s.mainBottleneck)}</b></p>
    <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:12px 14px;margin-bottom:16px">
      <p style="margin:0 0 6px"><b>${escapeHtml(s.headline)}</b></p>
      <p style="margin:0;color:#374151">Cơ hội: ${escapeHtml(s.mainOpportunity)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px">
      <tr><td style="padding:4px 0">Doanh thu</td><td style="text-align:right"><b>${vnd(report.sales.revenueVnd)}</b> (${report.sales.orders} đơn)</td></tr>
      <tr><td style="padding:4px 0">Nhu cầu (cmt+inbox)</td><td style="text-align:right">${report.conversionFunnel.demandSignals}</td></tr>
      <tr><td style="padding:4px 0">SĐT thu được</td><td style="text-align:right">${report.inbox.phoneCaptured}</td></tr>
      <tr><td style="padding:4px 0">Cần follow-up</td><td style="text-align:right">${report.inbox.needsFollowUp}</td></tr>
    </table>
    ${bottlenecksHtml ? `<h3 style="margin:0 0 6px;font-size:15px">Điểm nghẽn</h3><ul style="margin:0 0 16px;padding-left:18px;font-size:14px">${bottlenecksHtml}</ul>` : ""}
    ${actionsHtml ? `<h3 style="margin:0 0 6px;font-size:15px">Việc cần làm hôm nay</h3><ul style="margin:0 0 16px;padding-left:18px;font-size:14px">${actionsHtml}</ul>` : ""}
    <p style="color:#9ca3af;font-size:12px">Tạo bởi DCOS (${report.mode === "rule_based" ? "phân tích cơ bản" : "AI"}). Mở chi tiết trong AI Copilot → Daily Intelligence.</p>
  </div>`;

  const text = [
    `DCOS Daily Intelligence — ${report.reportDate}`,
    `Điểm tổng: ${s.overallScore} | Điểm nghẽn: ${s.mainBottleneck}`,
    s.headline,
    `Cơ hội: ${s.mainOpportunity}`,
    `Doanh thu: ${vnd(report.sales.revenueVnd)} (${report.sales.orders} đơn)`,
    `Nhu cầu: ${report.conversionFunnel.demandSignals} | SĐT: ${report.inbox.phoneCaptured} | Follow-up: ${report.inbox.needsFollowUp}`,
    "",
    "Việc cần làm:",
    ...report.actionItems.slice(0, 6).map((a) => `- [${a.priority}] ${a.title} (${a.source})`),
  ].join("\n");

  return { subject, html, text };
}

export async function sendDailyReportEmail(
  to: string,
  report: DailyIntelligenceReport
): Promise<{ sent: boolean; emailEnabled: boolean; error?: string }> {
  if (!isEmailEnabled()) return { sent: false, emailEnabled: false, error: "Email chưa cấu hình (RESEND_API_KEY + EMAIL_FROM_ADDRESS)." };
  if (!to || !to.includes("@")) return { sent: false, emailEnabled: true, error: "Địa chỉ nhận không hợp lệ." };
  try {
    const { subject, html, text } = renderDailyReportEmail(report);
    const provider = new ResendEmailProvider(env.resendApiKey);
    const res = await provider.sendEmail({ to, subject, html, text });
    return { sent: res.ok, emailEnabled: true, error: res.error };
  } catch (e) {
    return { sent: false, emailEnabled: true, error: (e as Error)?.message ?? "send_failed" };
  }
}
