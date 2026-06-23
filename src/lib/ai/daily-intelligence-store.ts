import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DailyIntelligenceReport } from "./daily-intelligence";

// Persistence cho DCOS Daily Intelligence.
// DEFENSIVE: nếu bảng chưa tồn tại (migration 20260624_dcos_daily_intelligence chưa apply trên production),
// mọi hàm trả về fallback an toàn thay vì crash. Khi founder chạy `prisma migrate deploy`, persistence tự bật.

function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "P2021" || err?.code === "P2022" || /does not exist/i.test(err?.message ?? "");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function reportDateToUtc(reportDate: string): Date {
  return new Date(`${reportDate}T00:00:00.000Z`);
}

export type StoredReportSummary = {
  id: string;
  reportDate: string;
  overallScore: number;
  mainBottleneck: string | null;
  headline: string | null;
  generatedAt: string;
};

export async function storeDailyReport(
  workspaceId: string,
  report: DailyIntelligenceReport
): Promise<{ stored: boolean; reportId?: string }> {
  try {
    const reportDate = reportDateToUtc(report.reportDate);
    const data = {
      rangeStart: reportDate,
      rangeEnd: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000),
      mode: report.mode,
      aiConfigured: report.aiConfigured,
      overallScore: report.summary.overallScore,
      mainBottleneck: report.summary.mainBottleneck,
      headline: report.summary.headline,
      organicSummaryJson: json(report.organic),
      adsSummaryJson: json(report.ads),
      inboxSummaryJson: json(report.inbox),
      salesSummaryJson: json(report.sales),
      catalogSummaryJson: json(report.catalog),
      conversionFunnelJson: json(report.conversionFunnel),
      strengthsJson: json(report.strengths),
      weaknessesJson: json(report.weaknesses),
      bottlenecksJson: json(report.bottlenecks),
      actionItemsJson: json(report.actionItems),
      contentRecommendationsJson: json(report.contentRecommendations),
      adsRecommendationsJson: json(report.adsRecommendations),
      lessonsJson: json(report.lessons),
      rawReportJson: json(report),
      generatedAt: new Date(),
    };

    const saved = await prisma.dailyIntelligenceReport.upsert({
      where: { workspaceId_reportDate: { workspaceId, reportDate } },
      create: { workspaceId, reportDate, ...data },
      update: data,
      select: { id: true },
    });

    // Findings + action items: làm lại cho đúng report này (idempotent theo reportId).
    await prisma.aIFinding.deleteMany({ where: { workspaceId, reportId: saved.id } });
    await prisma.aIActionItem.deleteMany({ where: { workspaceId, reportId: saved.id } });

    if (report.bottlenecks.length) {
      await prisma.aIFinding.createMany({
        data: report.bottlenecks.map((b) => ({
          workspaceId,
          reportId: saved.id,
          type: "BOTTLENECK",
          source: b.area,
          severity: "WARN",
          title: b.area,
          description: b.detail,
        })),
      });
    }
    if (report.actionItems.length) {
      await prisma.aIActionItem.createMany({
        data: report.actionItems.map((a) => ({
          workspaceId,
          reportId: saved.id,
          title: a.title,
          source: a.source,
          priority: a.priority,
        })),
      });
    }

    // Lessons: tích lũy — gặp lại lesson cũ thì tăng appliedCount, mới thì tạo.
    for (const lesson of report.lessons) {
      const existing = await prisma.aILesson.findFirst({ where: { workspaceId, lesson } });
      if (existing) {
        await prisma.aILesson.update({
          where: { id: existing.id },
          data: { appliedCount: { increment: 1 }, lastAppliedAt: new Date() },
        });
      } else {
        await prisma.aILesson.create({
          data: { workspaceId, source: "DAILY", title: lesson.slice(0, 80), lesson },
        });
      }
    }

    await detectRepeatedBottleneck(workspaceId, saved.id, report);

    return { stored: true, reportId: saved.id };
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] store failed:", (e as Error)?.message);
    return { stored: false };
  }
}

// Phát hiện điểm nghẽn lặp lại trong 7 báo cáo gần nhất.
async function detectRepeatedBottleneck(workspaceId: string, reportId: string, report: DailyIntelligenceReport) {
  const area = report.summary.mainBottleneck;
  if (!area || area === "KHÔNG RÕ") return;
  const recent = await prisma.dailyIntelligenceReport.findMany({
    where: { workspaceId },
    orderBy: { reportDate: "desc" },
    take: 7,
    select: { mainBottleneck: true },
  });
  const sameCount = recent.filter((r) => r.mainBottleneck === area).length;
  if (sameCount >= 3) {
    const title = `Điểm nghẽn ${area} lặp lại ${sameCount} lần gần đây`;
    const existing = await prisma.aIFinding.findFirst({ where: { workspaceId, type: "REPEAT", title, status: "OPEN" } });
    if (!existing) {
      await prisma.aIFinding.create({
        data: {
          workspaceId,
          reportId,
          type: "REPEAT",
          source: area,
          severity: "HIGH",
          title,
          description: `Điểm nghẽn "${area}" xuất hiện ${sameCount}/${recent.length} báo cáo gần nhất — cần xử lý gốc rễ, không chỉ chữa cháy từng ngày.`,
        },
      });
    }
  }
}

export async function listStoredReports(workspaceId: string, take = 30): Promise<StoredReportSummary[]> {
  try {
    const rows = await prisma.dailyIntelligenceReport.findMany({
      where: { workspaceId },
      orderBy: { reportDate: "desc" },
      take,
      select: { id: true, reportDate: true, overallScore: true, mainBottleneck: true, headline: true, generatedAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      reportDate: r.reportDate.toISOString().slice(0, 10),
      overallScore: r.overallScore,
      mainBottleneck: r.mainBottleneck,
      headline: r.headline,
      generatedAt: r.generatedAt.toISOString(),
    }));
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] history failed:", (e as Error)?.message);
    return [];
  }
}

export async function getStoredReportById(workspaceId: string, id: string): Promise<DailyIntelligenceReport | null> {
  try {
    const row = await prisma.dailyIntelligenceReport.findFirst({
      where: { id, workspaceId },
      select: { rawReportJson: true },
    });
    return (row?.rawReportJson as DailyIntelligenceReport | null) ?? null;
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] get report failed:", (e as Error)?.message);
    return null;
  }
}

export type ActionItemRow = {
  id: string;
  title: string;
  description: string | null;
  source: string;
  priority: string;
  status: string;
  reportId: string | null;
  createdAt: string;
};

export async function listActionItems(workspaceId: string, status?: string | null): Promise<ActionItemRow[]> {
  try {
    const rows = await prisma.aIActionItem.findMany({
      where: { workspaceId, ...(status ? { status: status.toUpperCase() } : {}) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
      priority: r.priority,
      status: r.status,
      reportId: r.reportId,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] list actions failed:", (e as Error)?.message);
    return [];
  }
}

export async function updateActionItemStatus(
  workspaceId: string,
  id: string,
  status: string
): Promise<{ ok: boolean }> {
  try {
    const existing = await prisma.aIActionItem.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!existing) return { ok: false };
    await prisma.aIActionItem.update({ where: { id: existing.id }, data: { status: status.toUpperCase() } });
    return { ok: true };
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] update action failed:", (e as Error)?.message);
    return { ok: false };
  }
}

export type LessonRow = {
  id: string;
  source: string;
  title: string;
  lesson: string;
  appliedCount: number;
  lastAppliedAt: string | null;
  createdAt: string;
};

export async function listLessons(workspaceId: string): Promise<LessonRow[]> {
  try {
    const rows = await prisma.aILesson.findMany({
      where: { workspaceId },
      orderBy: [{ appliedCount: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      lesson: r.lesson,
      appliedCount: r.appliedCount,
      lastAppliedAt: r.lastAppliedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] list lessons failed:", (e as Error)?.message);
    return [];
  }
}

export async function listFindings(workspaceId: string, status?: string | null) {
  try {
    const rows = await prisma.aIFinding.findMany({
      where: { workspaceId, ...(status ? { status: status.toUpperCase() } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      source: r.source,
      severity: r.severity,
      title: r.title,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    if (!isMissingTable(e)) console.error("[daily-intelligence] list findings failed:", (e as Error)?.message);
    return [];
  }
}
