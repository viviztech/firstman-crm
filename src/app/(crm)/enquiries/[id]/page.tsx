import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toScope } from "@/actions/shared";
import { DeleteEnquiryButton } from "@/components/enquiries/delete-enquiry-button";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { FollowupDialog } from "@/components/enquiries/followup-dialog";
import { LostButton } from "@/components/enquiries/lost-dialog";
import { SalesDialogButton } from "@/components/enquiries/sales-dialog-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { ENQUIRY_SOURCE_LABEL } from "@/lib/badges";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/session";
import { listServicesForOrders } from "@/services/catalog";
import { getEnquiry } from "@/services/enquiries";
import { listStates } from "@/services/geography";
import { listAssignableStaff } from "@/services/users";

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [enquiry, services, staff, states] = await Promise.all([
    getEnquiry(id, await toScope(user)),
    listServicesForOrders(),
    listAssignableStaff(),
    listStates(),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{enquiry.name}</h1>
            <EnquiryStatusBadge status={enquiry.status} />
          </div>
          {enquiry.convertedClient ? (
            <Link
              href={`/clients/${enquiry.convertedClient.id}`}
              className="text-sm text-primary hover:underline"
            >
              View client: {enquiry.convertedClient.name}
            </Link>
          ) : null}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Enquiry details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Source</span>
            <span>{ENQUIRY_SOURCE_LABEL[enquiry.source]}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Service</span>
            <span>{enquiry.serviceInterested?.name ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Name</span>
            <span>{enquiry.name}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Phone</span>
            <span>{enquiry.phone}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Email</span>
            <span>{enquiry.email ?? "No email on file"}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs text-muted-foreground">Comments</span>
            <span className="whitespace-pre-wrap">{enquiry.notes ?? "No comments yet"}</span>
          </div>
        </CardContent>
      </Card>

      {canAct ? (
        <div className="flex gap-2">
          <SalesDialogButton
            enquiryId={id}
            source={enquiry.source}
            defaults={{
              name: enquiry.name,
              phone: enquiry.phone,
              email: enquiry.email,
              address: enquiry.address,
              pincode: enquiry.pincode,
              serviceInterestedId: enquiry.serviceInterestedId,
            }}
            services={services}
            states={states}
          />
          <FollowupDialog enquiryId={id} staff={otherStaff} />
          <LostButton enquiryId={id} />
        </div>
      ) : null}

      <Tabs defaultValue="followups">
        <TabsList>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="followups">
          <div className="flex flex-col gap-2">
            {enquiry.followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups logged yet.</p>
            ) : (
              enquiry.followups.map((followup) => (
                <div key={followup.id} className="rounded-lg border p-3 text-sm">
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
