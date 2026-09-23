import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leaveRequests, leaveTypes } from "@/db/schema/leave";
import { env } from "@/lib/env";
import { getBoss } from "@/lib/queue";
import { runLeaveEntitlementProvisioning } from "@/services/hr-leave-entitlements";
import { createNotification, hasNotificationFor } from "@/services/notifications";

export const HR_LEAVE_DAILY_JOB = "hr-leave-daily";

function tomorrowIso(now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export async function runHrLeaveDailyJob(now = new Date()) {
  const provisioning = await runLeaveEntitlementProvisioning(now.getUTCFullYear());
  const tomorrow = tomorrowIso(now);
  const requests = await db
    .select({
      id: leaveRequests.id,
      employeeUserId: leaveRequests.employeeUserId,
      leaveTypeName: leaveTypes.name,
      startDate: leaveRequests.startDate,
    })
    .from(leaveRequests)
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveRequests.status, "approved"),
        eq(leaveRequests.startDate, tomorrow),
        isNull(leaveRequests.deletedAt),
      ),
    );
  let upcomingNotifications = 0;
  for (const request of requests) {
    const params = {
      userId: request.employeeUserId,
      type: "leave_upcoming" as const,
      entityType: "leave_request_upcoming",
      entityId: request.id,
    };
    if (await hasNotificationFor(params)) continue;
    await createNotification({
      ...params,
      title: "Leave starts tomorrow",
      body: `${request.leaveTypeName} starts on ${request.startDate}.`,
      href: "/hr/leave",
    });
    upcomingNotifications += 1;
  }
  return { ...provisioning, upcomingNotifications };
}

export async function registerHrLeaveCron() {
  const boss = await getBoss();
  await boss.createQueue(HR_LEAVE_DAILY_JOB);
  await boss.schedule(HR_LEAVE_DAILY_JOB, "30 1 * * *", {}, { tz: env.TZ_DISPLAY });
  await boss.work(HR_LEAVE_DAILY_JOB, async () => {
    await runHrLeaveDailyJob();
  });
}
