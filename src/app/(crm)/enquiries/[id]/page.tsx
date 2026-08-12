import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import { CalendarClock, Clock, History, Megaphone, Phone, User, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { STAT_COLOR_CLASSES, type StatColor } from "@/components/dashboard/dashboard-colors";
import { StatCard } from "@/components/dashboard/stat-card";
import { DeleteEnquiryButton } from "@/components/enquiries/delete-enquiry-button";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { FollowupDialog } from "@/components/enquiries/followup-dialog";
import { LostButton } from "@/components/enquiries/lost-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionIcon } from "@/components/ui/section-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { ENQUIRY_SOURCE_LABEL, ENQUIRY_STATUS_STAT_COLOR } from "@/lib/badges";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getEnquiry } from "@/services/enquiries";
import { listAssignableStaff } from "@/services/users";

function isOverdue(nextFollowUpAt: Date | string | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

/** Small colored dot + count on a tab trigger — same pattern as the client profile tabs. */
function TabMeta({ count, dot }: { count: number; dot: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      <span className="text-xs opacity-70">({count})</span>
    </span>
  );
}

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, staff] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listAssignableStaff(),
  ]);
  if (!enquiry) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "enquiry"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canDelete = user.role === "super_admin" || user.role === "manager";
  const canAct = enquiry.status !== "won";
  const otherStaff = staff.filter((member) => member.id !== user.id);

  const statusColor = ENQUIRY_STATUS_STAT_COLOR[enquiry.status];
  const statusClasses = STAT_COLOR_CLASSES[statusColor];

  const overdue = isOverdue(enquiry.nextFollowUpAt);
  const followUpTile = !enquiry.nextFollowUpAt
    ? { value: "Not set", subLabel: "No follow-up scheduled", color: "slate" as StatColor }
    : overdue
      ? {
          value: "Overdue",
          subLabel: formatInTimeZone(enquiry.nextFollowUpAt, env.TZ_DISPLAY, "d MMM, h:mm a"),
          color: "red" as StatColor,
        }
      : {
          value: formatInTimeZone(enquiry.nextFollowUpAt, env.TZ_DISPLAY, "d MMM yyyy"),
          subLabel: formatInTimeZone(enquiry.nextFollowUpAt, env.TZ_DISPLAY, "h:mm a"),
          color: "blue" as StatColor,
        };

  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(enquiry.createdAt).getTime()) / 86_400_000),
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className={cn("border-l-4", statusClasses.border)}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                statusClasses.chip,
              )}
            >
              <UserRound className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{enquiry.name}</h1>
                <EnquiryStatusBadge status={enquiry.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {enquiry.phone}
                {enquiry.assignee ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    Assigned to {enquiry.assignee.name}
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {enquiry.convertedClient ? (
                  <Link
                    href={`/clients/${enquiry.convertedClient.id}`}
                    className="text-primary hover:underline"
                  >
                    View client: {enquiry.convertedClient.name}
                  </Link>
                ) : null}
                {enquiry.convertedOrder ? (
                  <Link
                    href={`/orders/${enquiry.convertedOrder.id}`}
                    className="text-primary hover:underline"
                  >
                    View job card: {enquiry.convertedOrder.orderNo}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/enquiries/${id}/edit`} />}
            >
              Edit
            </Button>
            {canDelete ? <DeleteEnquiryButton enquiryId={id} enquiryName={enquiry.name} /> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Next follow-up"
          value={followUpTile.value}
          subLabel={followUpTile.subLabel}
          icon={CalendarClock}
          color={followUpTile.color}
        />
        <StatCard
          label="Follow-ups logged"
          value={String(enquiry.followups.length)}
          subLabel={enquiry.followups.length === 0 ? "None yet" : "total"}
          icon={History}
          color={enquiry.followups.length === 0 ? "slate" : "blue"}
        />
        <StatCard
          label="Days open"
          value={String(daysOpen)}
          subLabel={daysOpen === 0 ? "Created today" : "since created"}
          icon={Clock}
          color={daysOpen > 14 ? "orange" : "slate"}
        />
        <StatCard
          label="Ownership"
          value={enquiry.assignee ? enquiry.assignee.name : "Unassigned"}
          subLabel={enquiry.assignee ? "assigned" : "needs an owner"}
          icon={User}
          color={enquiry.assignee ? "blue" : "red"}
        />
      </div>

      {canAct ? (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            nativeButton={false}
            render={<Link href={`/enquiries/${id}/sales`} />}
          >
            Sales
          </Button>
          <FollowupDialog enquiryId={id} staff={otherStaff} />
          <LostButton enquiryId={id} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={Phone} color="blue" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Phone</span>
              <span>{enquiry.phone}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Email</span>
              <span>{enquiry.email ?? "No email on file"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Address</span>
              <span>
                {[enquiry.address, enquiry.city, enquiry.pincode].filter(Boolean).join(", ") ||
                  "No address on file"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SectionIcon icon={Megaphone} color="purple" />
              Enquiry details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Source</span>
              <span>{ENQUIRY_SOURCE_LABEL[enquiry.source]}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Service</span>
              <span>{enquiry.serviceInterested?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Comments</span>
              <span className="whitespace-pre-wrap">{enquiry.notes ?? "No comments yet"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="followups">
        <TabsList>
          <TabsTrigger value="followups">
            Follow-ups
            <TabMeta count={enquiry.followups.length} dot="bg-blue-500" />
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity
            <TabMeta count={activity.length} dot="bg-slate-400" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followups">
          <div className="flex flex-col gap-2">
            {enquiry.followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups logged yet.</p>
            ) : (
              enquiry.followups.map((followup) => (
                <div
                  key={followup.id}
                  className="rounded-lg border border-l-4 border-l-blue-500 p-3 text-sm"
                >
                  <div className="flex justify-between text-muted-foreground">
                    <span>{followup.user?.name ?? "Unknown"}</span>
                    <span>
                      {formatInTimeZone(
                        followup.followedUpAt,
                        env.TZ_DISPLAY,
                        "d MMM yyyy, h:mm a",
                      )}
                    </span>
                  </div>
                  <p className="mt-1">{followup.summary}</p>
                  {followup.handoffType !== "self" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Handed off ({followup.handoffType === "one_time" ? "one time" : "permanent"})
                      to {followup.handoffToUser?.name ?? "—"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="flex flex-col gap-2">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
