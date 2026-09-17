import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  FileTextIcon,
  HistoryIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { CreateOrderFromComplianceButton } from "@/components/compliance/create-order-from-compliance-button";
import { DeleteComplianceItemButton } from "@/components/compliance/delete-compliance-item-button";
import { MarkFiledButton } from "@/components/compliance/mark-filed-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { COMPLIANCE_RECURRENCE_LABEL } from "@/lib/badges";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/session";
import { getComplianceItem } from "@/services/compliance";

export default async function ComplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const item = await getComplianceItem(id, await toScope(user));
  if (!item) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "compliance_item"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canDelete = user.role === "super_admin" || user.role === "manager";
  const isFiled = item.status === "filed";

  return (
    <div className="compliance-workflow flex min-w-0 flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50/70 via-white to-white p-5 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              href="/compliance"
              className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-800"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              Back to compliance
            </Link>
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow-sm shadow-pink-200">
                <ShieldCheckIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">
                  {item.title}
                </h1>
                <ComplianceStatusBadge status={item.status} />
              </div>
            </div>
            <p className="ml-14 text-sm text-slate-500">
              <Link href={`/clients/${item.client.id}`} className="hover:underline">
                {item.client.name}
              </Link>
              {item.service ? <> · {item.service.name}</> : null}
            </p>
            {item.order ? (
              <Link
                href={`/orders/${item.order.id}`}
                className="ml-14 text-sm font-semibold text-pink-600 hover:text-pink-800 hover:underline"
              >
                View order: {item.order.orderNo}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/compliance/${id}/edit`} />}
            >
              Edit
            </Button>
            {item.serviceId && !item.order ? (
              <CreateOrderFromComplianceButton itemId={id} title={item.title} />
            ) : null}
            {!isFiled ? (
              <MarkFiledButton
                itemId={id}
                title={item.title}
                isRecurring={item.recurrence !== "none"}
              />
            ) : null}
            {canDelete ? <DeleteComplianceItemButton itemId={id} title={item.title} /> : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClockIcon className="size-4 text-pink-600" aria-hidden="true" />
              Deadline
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span>Due: {formatInTimeZone(item.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}</span>
            <span>Recurrence: {COMPLIANCE_RECURRENCE_LABEL[item.recurrence]}</span>
            {item.filedAt ? (
              <span>
                Filed: {formatInTimeZone(item.filedAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
              </span>
            ) : null}
          </CardContent>
        </Card>
        {item.description ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileTextIcon className="size-4 text-pink-600" aria-hidden="true" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{item.description}</CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#0b203a]">
          <HistoryIcon className="size-4.5 text-pink-600" aria-hidden="true" />
          Activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          activity.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm"
            >
              <div className="flex flex-col gap-1 text-slate-500 sm:flex-row sm:justify-between">
                <span>{entry.action}</span>
                <span>
                  {formatInTimeZone(entry.createdAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
