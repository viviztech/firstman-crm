import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConvertLeadButton } from "@/components/leads/convert-lead-button";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { FollowupForm } from "@/components/leads/followup-form";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadStatusSelect } from "@/components/leads/lead-status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { LEAD_SOURCE_LABEL } from "@/lib/badges";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/session";
import { getLead } from "@/services/leads";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const lead = await getLead(id, { userId: user.id, role: user.role });
  if (!lead) {
    notFound();
  }

  const activity = await db.query.activityLogs.findMany({
    where: and(eq(activityLogs.entityType, "lead"), eq(activityLogs.entityId, id)),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 20,
  });

  const canDelete = user.role === "super_admin" || user.role === "manager";
  const canConvert = lead.status !== "won" && lead.status !== "lost";
  const isOverdue = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) < new Date() : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{lead.name}</h1>
            {lead.status === "won" ? (
              <LeadStatusBadge status={lead.status} />
            ) : (
              <LeadStatusSelect leadId={id} status={lead.status} />
            )}
          </div>
          {lead.convertedClient ? (
            <Link
              href={`/clients/${lead.convertedClient.id}`}
              className="text-sm text-primary hover:underline"
            >
              View client: {lead.convertedClient.name}
            </Link>
          ) : null}
          {lead.status === "lost" && lead.lostReason ? (
            <p className="text-sm text-muted-foreground">Lost reason: {lead.lostReason}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/leads/${id}/edit`} />}
          >
            Edit
          </Button>
          {canConvert ? <ConvertLeadButton leadId={id} leadName={lead.name} /> : null}
          {canDelete ? <DeleteLeadButton leadId={id} leadName={lead.name} /> : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Contact</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>{lead.phone}</span>
                <span>{lead.email ?? "No email on file"}</span>
                <span>{lead.city ?? "No city on file"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Source & interest</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>Source: {LEAD_SOURCE_LABEL[lead.source]}</span>
                <span>Service interested: {lead.serviceInterested?.name ?? "—"}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Ownership</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <span>Assigned to: {lead.assignee?.name ?? "Unassigned"}</span>
                <span className="flex items-center gap-2">
                  Next follow-up:{" "}
                  {lead.nextFollowUpAt
                    ? formatInTimeZone(lead.nextFollowUpAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")
                    : "—"}
                  {isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
                </span>
              </CardContent>
            </Card>
            {lead.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">{lead.notes}</CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="followups">
          <div className="flex flex-col gap-4">
            <FollowupForm leadId={id} />
            <div className="flex flex-col gap-2">
              {lead.followups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups logged yet.</p>
              ) : (
                lead.followups.map((followup) => (
                  <div key={followup.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {followup.channel} · {followup.user?.name ?? "Unknown"}
                      </span>
                      <span>
                        {formatInTimeZone(
                          followup.followedUpAt,
                          env.TZ_DISPLAY,
                          "d MMM yyyy, h:mm a",
                        )}
                      </span>
                    </div>
                    <p className="mt-1">{followup.summary}</p>
                  </div>
                ))
              )}
            </div>
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
