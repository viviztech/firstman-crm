import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema/expenses";
import { notifications } from "@/db/schema/notifications";
import { payrollEntries, payrollPeriods, payslips } from "@/db/schema/payroll";
import { PayslipDocument } from "@/lib/pdf/payslip-document";
import { recordActivity } from "@/services/activity-log";
import { getCompanyProfile } from "@/services/company-profile";
import { assertHrCapability, type HrActor, hasHrCapability } from "@/services/hr";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "hr", "payslips");

async function renderEntry(entry: Awaited<ReturnType<typeof getEntry>>) {
  if (!entry) throw new Error("Payroll entry not found.");
  const company = await getCompanyProfile();
  const periodLabel = new Date(`${entry.period.periodMonth}T00:00:00Z`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return renderToBuffer(
    <PayslipDocument
      company={company}
      payslip={{
        periodLabel,
        employeeName: entry.employeeName,
        employeeCode: entry.employeeCode,
        designationName: entry.designationName,
        structureName: entry.structureName,
        eligibleHalfDays: entry.eligibleHalfDays,
        paidHalfDays: entry.paidHalfDays,
        grossPaise: entry.grossPaise,
        deductionsPaise: entry.deductionsPaise,
        reimbursementsPaise: entry.reimbursementsPaise,
        netPayPaise: entry.netPayPaise,
        employerContributionsPaise: entry.employerContributionsPaise,
        lines: entry.lines,
      }}
    />,
  );
}
function getEntry(entryId: string) {
  return db.query.payrollEntries.findFirst({
    where: eq(payrollEntries.id, entryId),
    with: { period: true, lines: true },
  });
}

export async function postPayrollPeriod(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, periodId),
  });
  if (!period) throw new Error("Payroll period not found.");
  if (["posted", "paid"].includes(period.status)) return;
  if (period.status !== "approved") throw new Error("Only approved payroll can be posted.");
  const entries = await db.query.payrollEntries.findMany({
    where: eq(payrollEntries.periodId, period.id),
    with: { period: true, lines: true },
  });
  await mkdir(STORAGE_ROOT, { recursive: true });
  const rendered: Array<{
    entry: (typeof entries)[number];
    storageKey: string;
    sha256: string;
  }> = [];
  for (const entry of entries) {
    const buffer = await renderEntry(entry);
    const storageKey = `${period.periodMonth.slice(0, 7)}-${entry.id}.pdf`;
    const finalPath = path.join(STORAGE_ROOT, storageKey);
    const tempPath = `${finalPath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, buffer);
    await rename(tempPath, finalPath);
    rendered.push({ entry, storageKey, sha256: createHash("sha256").update(buffer).digest("hex") });
  }
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, period.id))
      .for("update");
    if (current?.status !== "approved") return;
    const totalCost = entries.reduce((sum, entry) => sum + entry.totalCostPaise, 0);
    const [expense] = await tx
      .insert(expenses)
      .values({
        date: new Date(`${period.periodEnd}T12:00:00Z`),
        category: "Payroll",
        description: `Payroll ${period.periodMonth.slice(0, 7)}`,
        amountPaise: totalCost,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: expenses.id });
    for (const item of rendered) {
      await tx
        .insert(payslips)
        .values({
          entryId: item.entry.id,
          storageKey: item.storageKey,
          sha256: item.sha256,
          createdBy: actor.id,
          updatedBy: actor.id,
        })
        .onConflictDoNothing();
      await tx
        .insert(notifications)
        .values({
          userId: item.entry.employeeUserId,
          type: "payslip_published",
          title: "Payslip available",
          body: `Your payslip for ${period.periodMonth.slice(0, 7)} is ready.`,
          href: "/hr/payslips",
          entityType: "payroll_entry",
          entityId: item.entry.id,
        })
        .onConflictDoNothing();
    }
    await tx
      .update(payrollPeriods)
      .set({
        status: "posted",
        postedAt: new Date(),
        postedBy: actor.id,
        financeExpenseId: expense?.id,
        updatedBy: actor.id,
      })
      .where(eq(payrollPeriods.id, period.id));
  });
}

export async function markPayrollPaid(periodId: string, actor: HrActor) {
  await assertHrCapability(actor, "payroll_admin");
  const [updated] = await db
    .update(payrollPeriods)
    .set({ status: "paid", paidAt: new Date(), paidBy: actor.id, updatedBy: actor.id })
    .where(and(eq(payrollPeriods.id, periodId), eq(payrollPeriods.status, "posted")))
    .returning();
  if (!updated) throw new Error("Only posted payroll can be marked paid.");
}

export async function listMyPayslips(userId: string) {
  return db
    .select({
      id: payslips.id,
      entryId: payrollEntries.id,
      periodMonth: payrollPeriods.periodMonth,
      netPayPaise: payrollEntries.netPayPaise,
      publishedAt: payslips.publishedAt,
    })
    .from(payslips)
    .innerJoin(payrollEntries, eq(payslips.entryId, payrollEntries.id))
    .innerJoin(payrollPeriods, eq(payrollEntries.periodId, payrollPeriods.id))
    .where(and(eq(payrollEntries.employeeUserId, userId), isNull(payslips.deletedAt)))
    .orderBy(desc(payrollPeriods.periodMonth));
}

export async function readAuthorizedPayslip(entryId: string, actor: HrActor) {
  const row = await db
    .select({
      employeeUserId: payrollEntries.employeeUserId,
      storageKey: payslips.storageKey,
      employeeCode: payrollEntries.employeeCode,
      periodMonth: payrollPeriods.periodMonth,
    })
    .from(payslips)
    .innerJoin(payrollEntries, eq(payslips.entryId, payrollEntries.id))
    .innerJoin(payrollPeriods, eq(payrollEntries.periodId, payrollPeriods.id))
    .where(and(eq(payrollEntries.id, entryId), isNull(payslips.deletedAt)))
    .limit(1);
  const found = row[0];
  if (!found) return null;
  if (found.employeeUserId !== actor.id && !(await hasHrCapability(actor, "payroll_admin")))
    throw new Error("You do not have permission to download this payslip.");
  const safePath = path.resolve(STORAGE_ROOT, found.storageKey);
  if (!safePath.startsWith(`${STORAGE_ROOT}${path.sep}`)) throw new Error("Invalid payslip path.");
  await recordActivity({
    actorId: actor.id,
    entityType: "payroll_entry",
    entityId: entryId,
    action: "payslip_downloaded",
  });
  return {
    buffer: await readFile(safePath),
    filename: `payslip-${found.employeeCode}-${found.periodMonth.slice(0, 7)}.pdf`,
  };
}
