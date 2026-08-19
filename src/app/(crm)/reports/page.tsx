import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/auth";
import { requireRole } from "@/lib/session";

const REPORTS: { href: string; title: string; description: string; roles: Role[] }[] = [
  {
    href: "/reports/enquiries-by-source",
    title: "Enquiry source performance",
    description: "Enquiries, wins, and conversion rate by source.",
    roles: ["super_admin", "manager"],
  },
  {
    href: "/reports/conversion-rate",
    title: "Conversion rate",
    description: "Conversion rate broken down by source and by executive.",
    roles: ["super_admin", "manager"],
  },
  {
    href: "/reports/revenue-by-service",
    title: "Revenue by service",
    description: "Job card revenue grouped by catalog service.",
    roles: ["super_admin", "manager", "accountant"],
  },
  {
    href: "/reports/aging-receivables",
    title: "Aging receivables",
    description: "Open invoice balances bucketed by days past due.",
    roles: ["super_admin", "manager", "accountant"],
  },
  {
    href: "/reports/compliance-status",
    title: "Compliance filing status",
    description: "Compliance items grouped by current status.",
    roles: ["super_admin", "manager"],
  },
];

export default async function ReportsPage() {
  const user = await requireRole("super_admin", "manager", "accountant");
  // Accountant sees only the accounts-relevant reports (revenue, receivables) — enquiry/
  // conversion/compliance reports are sales and ops domain, not accounts data.
  const visibleReports = REPORTS.filter((report) => report.roles.includes(user.role));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Each report can be exported to Excel from its own page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{report.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {report.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
