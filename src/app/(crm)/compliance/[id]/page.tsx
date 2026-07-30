import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  const item = await getComplianceItem(id, { userId: user.id, role: user.role });
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{item.title}</h1>
            <ComplianceStatusBadge status={item.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${item.client.id}`} className="hover:underline">
              {item.client.name}
            </Link>
            {item.service ? <> · {item.service.name}</> : null}
          </p>
          {item.order ? (
            <Link
              href={`/orders/${item.order.id}`}
              className="text-sm text-primary hover:underline"
            >
              View order: {item.order.orderNo}
            </Link>
          ) : null}
        </div>
        <div className="flex gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Deadline</CardTitle>
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
              <CardTitle className="text-sm text-muted-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{item.description}</CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          activity.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
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
