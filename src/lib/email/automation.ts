import type { EmailSequenceTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEmailEnabled } from "@/lib/env";
import { sendEmailToCustomer, canEmailCustomer } from "./send";

// ----------------------------------------------------------------
// Enroll / Cancel
// ----------------------------------------------------------------
export async function enrollCustomerToSequence(
  customerId: string,
  sequenceId: string
): Promise<{ enrolled: boolean; reason?: string; enrollmentId?: string }> {
  const seq = await prisma.emailSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!seq || !seq.isActive) return { enrolled: false, reason: "sequence_inactive" };
  if (!seq.steps.length) return { enrolled: false, reason: "no_steps" };

  const existing = await prisma.emailAutomationEnrollment.findFirst({
    where: { customerId, sequenceId, status: "ACTIVE" },
  });
  if (existing) return { enrolled: false, reason: "already_active", enrollmentId: existing.id };

  const firstDelay = seq.steps[0].delayMinutes ?? 0;
  const enr = await prisma.emailAutomationEnrollment.create({
    data: {
      customerId,
      sequenceId,
      status: "ACTIVE",
      currentStep: 0,
      nextRunAt: new Date(Date.now() + firstDelay * 60_000),
    },
  });
  return { enrolled: true, enrollmentId: enr.id };
}

export async function cancelEnrollment(customerId: string, sequenceId: string): Promise<void> {
  await prisma.emailAutomationEnrollment.updateMany({
    where: { customerId, sequenceId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
}

// ----------------------------------------------------------------
// Trigger theo sự kiện (gọi từ funnel engine / API)
// ----------------------------------------------------------------
export async function triggerByEvent(
  customerId: string,
  triggerType: EmailSequenceTrigger,
  triggerValue?: string | null
): Promise<void> {
  if (!isEmailEnabled()) return;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;
  // Chỉ enroll nếu khách đủ điều kiện nhận email (có email + consent + chưa unsub).
  if (!canEmailCustomer(customer).ok) return;

  const seqs = await prisma.emailSequence.findMany({
    where: {
      isActive: true,
      triggerType,
      OR: triggerValue ? [{ triggerValue: null }, { triggerValue }] : [{ triggerValue: null }],
    },
  });
  for (const s of seqs) {
    await enrollCustomerToSequence(customerId, s.id).catch(() => {});
  }
}

// Gọi từ funnel engine sau khi cập nhật khách (tag mới / đổi stage / vừa consent).
export async function fireAutomationTriggers(
  customerId: string,
  opts: { newTags?: string[]; stageChangedTo?: string | null; consentGranted?: boolean }
): Promise<void> {
  if (!isEmailEnabled()) return;
  try {
    if (opts.consentGranted) await triggerByEvent(customerId, "FORM_SUBMITTED");
    if (opts.stageChangedTo) await triggerByEvent(customerId, "STAGE_CHANGED", opts.stageChangedTo);
    for (const tag of opts.newTags ?? []) {
      await triggerByEvent(customerId, "TAG_ADDED", tag);
    }
  } catch (err) {
    console.error("[EMAIL][automation] trigger error:", err);
  }
}

// ----------------------------------------------------------------
// Cron processor
// ----------------------------------------------------------------
export async function processDueEmails(
  limit = 50
): Promise<{ processed: number; sent: number; failed: number }> {
  const due = await prisma.emailAutomationEnrollment.findMany({
    where: { status: "ACTIVE", nextRunAt: { lte: new Date() } },
    take: limit,
    orderBy: { nextRunAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  for (const e of due) {
    const r = await sendSequenceStep(e.id).catch((err) => {
      console.error("[EMAIL][automation] step error:", err);
      return { sent: false, failed: true };
    });
    if (r.sent) sent++;
    if (r.failed) failed++;
  }
  return { processed: due.length, sent, failed };
}

function checkConditions(cond: unknown, customer: { tags: string[]; currentStage: string }): boolean {
  if (!cond || typeof cond !== "object") return true;
  const c = cond as any;
  if (c.requireTag && !customer.tags.includes(c.requireTag)) return false;
  if (c.requireStage && customer.currentStage !== c.requireStage) return false;
  return true;
}

export async function sendSequenceStep(
  enrollmentId: string
): Promise<{ sent?: boolean; failed?: boolean; done?: boolean; skipped?: boolean }> {
  const enr = await prisma.emailAutomationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
      customer: true,
    },
  });
  if (!enr || enr.status !== "ACTIVE") return {};

  const customer = enr.customer;
  // Nếu khách không còn đủ điều kiện gửi -> hủy enrollment.
  if (!canEmailCustomer(customer).ok) {
    await prisma.emailAutomationEnrollment.update({
      where: { id: enr.id },
      data: { status: "CANCELLED" },
    });
    return {};
  }

  const steps = enr.sequence.steps;
  if (enr.currentStep >= steps.length) {
    await prisma.emailAutomationEnrollment.update({
      where: { id: enr.id },
      data: { status: "COMPLETED", nextRunAt: null },
    });
    return { done: true };
  }

  const step = steps[enr.currentStep];

  let sent = false;
  let failed = false;
  let skipped = false;
  if (checkConditions(step.conditionsJson, customer)) {
    const res = await sendEmailToCustomer({
      customerId: customer.id,
      templateId: step.templateId,
      sequenceId: enr.sequenceId,
    });
    sent = res.ok;
    failed = !res.ok;
  } else {
    skipped = true;
  }

  // Tiến tới step kế tiếp.
  const nextIndex = enr.currentStep + 1;
  if (nextIndex >= steps.length) {
    await prisma.emailAutomationEnrollment.update({
      where: { id: enr.id },
      data: { status: "COMPLETED", currentStep: nextIndex, nextRunAt: null },
    });
  } else {
    const nextDelay = steps[nextIndex].delayMinutes ?? 0;
    await prisma.emailAutomationEnrollment.update({
      where: { id: enr.id },
      data: { currentStep: nextIndex, nextRunAt: new Date(Date.now() + nextDelay * 60_000) },
    });
  }

  return { sent, failed, skipped };
}
