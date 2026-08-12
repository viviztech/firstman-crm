import {
  CheckCircle2Icon,
  ClockIcon,
  ListChecksIcon,
  TrendingUpIcon,
  UserXIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AddEnquiryDialog } from "@/components/enquiries/add-enquiry-dialog";
import { ClaimEnquiryButton } from "@/components/enquiries/claim-enquiry-button";
import { FollowupDialog } from "@/components/enquiries/followup-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type StaffOption = { id: string; name: string };
type ServiceOption = { id: string; name: string };

type DashboardEnquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  nextFollowUpAt: Date | null;
  serviceInterested: { id: string; name: string } | null;
};

/** Reused on every table/card row that isn't a Pick or Followup action. */
function ViewButton({ enquiryId }: { enquiryId: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<Link href={`/enquiries/${enquiryId}`} />}
    >
      View
    </Button>
  );
}

export function SalesExecutiveDashboard({
  stats,
  myEnquiries,
  openEnquiries,
  followUpsToday,
  followUpsMissed,
  wonEnquiries,
  lostEnquiries,
  staff,
  services,
}: {
  stats: {
    totalEnquiries: number;
    followupsDue: number;
    closedThisMonth: number;
    lostThisMonth: number;
    salesThisMonthPaise: number;
    totalSalesPaise: number;
  };
  myEnquiries: DashboardEnquiry[];
  openEnquiries: DashboardEnquiry[];
  followUpsToday: DashboardEnquiry[];
  followUpsMissed: DashboardEnquiry[];
  wonEnquiries: DashboardEnquiry[];
  lostEnquiries: (DashboardEnquiry & { lostReason: string | null })[];
  staff: StaffOption[];
  services: ServiceOption[];
}) {
  const tabs: { value: string; label: string; count: number; dot: string }[] = [
    { value: "my-enquiries", label: "My Enquiries", count: myEnquiries.length, dot: "bg-blue-500" },
    {
      value: "open-enquiries",
      label: "Open Enquiries",
      count: openEnquiries.length,
      dot: "bg-teal-500",
    },
    {
      value: "followups",
      label: "Follow-ups",
      count: followUpsToday.length + followUpsMissed.length,
      dot: "bg-amber-500",
    },
    { value: "sales", label: "Sales", count: wonEnquiries.length, dot: "bg-green-500" },
    { value: "lost", label: "Lost", count: lostEnquiries.length, dot: "bg-red-500" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My sales dashboard</h2>
          <p className="text-sm text-muted-foreground">Your pipeline, follow-ups, and results.</p>
        </div>
        <AddEnquiryDialog services={services} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total enquiries"
          value={String(stats.totalEnquiries)}
          icon={ListChecksIcon}
          color="blue"
        />
        <StatCard
          label="Follow-ups due"
          value={String(stats.followupsDue)}
          icon={ClockIcon}
          color={stats.followupsDue > 0 ? "red" : "slate"}
        />
        <StatCard
          label="Closed this month"
          value={String(stats.closedThisMonth)}
          icon={CheckCircle2Icon}
          color="green"
        />
        <StatCard
          label="Lost this month"
          value={String(stats.lostThisMonth)}
          icon={UserXIcon}
          color="orange"
        />
        <StatCard
          label="Sales this month"
          value={formatMoney(stats.salesThisMonthPaise)}
          icon={TrendingUpIcon}
          color="purple"
        />
        <StatCard
          label="Total sales till date"
          value={formatMoney(stats.totalSalesPaise)}
          icon={WalletIcon}
          color="pink"
        />
      </div>

      <Tabs defaultValue="my-enquiries" className="gap-3">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/60 p-1.5">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-10 gap-2 rounded-xl px-4 text-sm font-medium data-active:bg-primary data-active:text-primary-foreground"
            >
              <span className={cn("size-2 shrink-0 rounded-full", tab.dot)} aria-hidden="true" />
              {tab.label}
              <span className="text-xs opacity-70">({tab.count})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="my-enquiries">
          <EnquiryTable
            rows={myEnquiries}
            emptyLabel="No enquiries assigned to you yet."
            renderActions={(row) => (
              <>
                <ViewButton enquiryId={row.id} />
                <FollowupDialog enquiryId={row.id} staff={staff} />
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="open-enquiries">
          <EnquiryTable
            rows={openEnquiries}
            emptyLabel="No unassigned enquiries in the pool right now."
            renderActions={(row) => <ClaimEnquiryButton enquiryId={row.id} />}
          />
        </TabsContent>

        <TabsContent value="followups">
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Today&apos;s follow-ups ({followUpsToday.length})
              </h3>
              <EnquiryTable
                rows={followUpsToday}
                emptyLabel="Nothing due today."
                renderActions={(row) => (
                  <>
                    <ViewButton enquiryId={row.id} />
                    <FollowupDialog enquiryId={row.id} staff={staff} />
                  </>
                )}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-destructive">
                Missed follow-ups ({followUpsMissed.length})
              </h3>
              <EnquiryTable
                rows={followUpsMissed}
                emptyLabel="No missed follow-ups. Great work."
                renderActions={(row) => (
                  <>
                    <ViewButton enquiryId={row.id} />
                    <FollowupDialog enquiryId={row.id} staff={staff} />
                  </>
                )}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <EnquiryTable
            rows={wonEnquiries}
            emptyLabel="No closed sales yet."
            renderActions={(row) => <ViewButton enquiryId={row.id} />}
          />
        </TabsContent>

        <TabsContent value="lost">
          <EnquiryTable
            rows={lostEnquiries}
            emptyLabel="No lost enquiries."
            extraColumn={{
              header: "Reason",
              render: (row) => (
                <span className="text-muted-foreground">
                  {"lostReason" in row ? (row.lostReason ?? "—") : "—"}
                </span>
              ),
            }}
            renderActions={(row) => <ViewButton enquiryId={row.id} />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Renders as a real table on md+ screens and as stacked cards below that — a table forced into a
 * narrow viewport either clips columns or forces a horizontal scrollbar, both of which read as
 * "broken" on a phone; a card-per-row layout has no horizontal axis to overflow in the first place.
 */
function EnquiryTable<T extends DashboardEnquiry>({
  rows,
  emptyLabel,
  renderActions,
  extraColumn,
}: {
  rows: T[];
  emptyLabel: string;
  renderActions: (row: T) => ReactNode;
  extraColumn?: { header: string; render: (row: T) => ReactNode };
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Email</th>
              {extraColumn ? <th className="px-4 py-2 font-medium">{extraColumn.header}</th> : null}
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                <td className="px-4 py-2 whitespace-nowrap">
                  {row.serviceInterested?.name ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {row.name}
                    {row.nextFollowUpAt && row.nextFollowUpAt < new Date() ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{row.phone}</td>
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                  {row.email ?? "—"}
                </td>
                {extraColumn ? <td className="px-4 py-2">{extraColumn.render(row)}</td> : null}
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">{renderActions(row)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{row.name}</span>
                {row.nextFollowUpAt && row.nextFollowUpAt < new Date() ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : null}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Service</dt>
                <dd>{row.serviceInterested?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{row.phone}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{row.email ?? "—"}</dd>
                {extraColumn ? (
                  <>
                    <dt className="text-muted-foreground">{extraColumn.header}</dt>
                    <dd>{extraColumn.render(row)}</dd>
                  </>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">{renderActions(row)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
