import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/session";

const REPORTS = [
  {
    href: "/reports/enquiries-by-source",
    title: "Enquiry source performance",
    description: "Enquiries, wins, and conversion rate by source.",
  },
  {
    href: "/reports/conversion-rate",
    title: "Conversion rate",
    description: "Conversion rate broken down by source and by executive.",
  },
  {
    href: "/reports/revenue-by-service",
    title: "Revenue by service",
    description: "Order revenue grouped by catalog service.",
  },
  {
    href: "/reports/aging-receivables",
    title: "Aging receivables",
    description: "Open invoice balances bucketed by days past due.",
  },
  {
    href: "/reports/compliance-status",
    title: "Compliance filing status",
    description: "Compliance items grouped by current status.",
  },
];

export default async function ReportsPage() {
  await requireRole("super_admin", "manager", "accountant");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Each report can be exported to Excel from its own page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
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
