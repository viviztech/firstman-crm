import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { listUpcomingComplianceItems } from "@/services/compliance";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = { userId: user.id, role: user.role };

  const showCompliance =
    user.role === "super_admin" || user.role === "manager" || user.role === "executive";
  const upcomingCompliance = showCompliance ? await listUpcomingComplianceItems(scope, 14) : [];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Welcome back</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{user.name}</CardContent>
      </Card>

      {showCompliance ? (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming compliance deadlines (next 14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingCompliance.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 14 days.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingCompliance.map((item) => (
                  <Link
                    key={item.id}
                    href={`/compliance/${item.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-muted-foreground">{item.clientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{formatInTimeZone(item.dueDate, env.TZ_DISPLAY, "d MMM yyyy")}</span>
                      <ComplianceStatusBadge status={item.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
