import {
  ArrowUpRightIcon,
  BadgePercentIcon,
  BanknoteIcon,
  ChartNoAxesCombinedIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/auth";
import { requireRole } from "@/lib/session";

const REPORTS: {
  href: string;
  title: string;
  description: string;
  roles: Role[];
  icon: LucideIcon;
  label: string;
}[] = [
  {
    href: "/reports/enquiries-by-source",
    title: "Enquiry source performance",
    description: "Enquiries, wins, and conversion rate by source.",
    roles: ["super_admin", "manager"],
    icon: ChartNoAxesCombinedIcon,
    label: "Sales intelligence",
  },
  {
    href: "/reports/conversion-rate",
    title: "Conversion rate",
    description: "Conversion rate broken down by source and by executive.",
    roles: ["super_admin", "manager"],
    icon: BadgePercentIcon,
    label: "Performance",
  },
  {
    href: "/reports/revenue-by-service",
    title: "Revenue by service",
    description: "Job card revenue grouped by catalog service.",
    roles: ["super_admin", "manager", "accountant"],
    icon: BanknoteIcon,
    label: "Revenue",
  },
  {
    href: "/reports/aging-receivables",
    title: "Aging receivables",
    description: "Open invoice balances bucketed by days past due.",
    roles: ["super_admin", "manager", "accountant"],
    icon: Clock3Icon,
    label: "Collections",
  },
  {
    href: "/reports/compliance-status",
    title: "Compliance filing status",
    description: "Compliance items grouped by current status.",
    roles: ["super_admin", "manager"],
    icon: ClipboardCheckIcon,
    label: "Operations",
  },
];

export default async function ReportsPage() {
  const user = await requireRole("super_admin", "manager", "accountant");
  const visibleReports = REPORTS.filter((report) => report.roles.includes(user.role));

  return (
    <div className="reports-workflow flex min-w-0 flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9c2054] via-[#ba2a66] to-[#d94b86] px-5 py-6 text-white shadow-[0_22px_55px_-30px_rgba(107,28,64,0.65)] sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, black, transparent)",
          }}
        />
        <div className="relative">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <ChartNoAxesCombinedIcon className="size-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold tracking-[0.18em] text-pink-100 uppercase">
            Business intelligence
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Reports</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-pink-50/90">
            Turn sales, finance, and operations data into decisions. Every report is ready to
            export.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 transition-colors group-hover:bg-pink-600 group-hover:text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <ArrowUpRightIcon className="size-4 text-slate-300 transition-colors group-hover:text-pink-600" />
                  </div>
                  <p className="text-[11px] font-bold tracking-[0.14em] text-pink-600 uppercase">
                    {report.label}
                  </p>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-slate-500">
                  {report.description}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
