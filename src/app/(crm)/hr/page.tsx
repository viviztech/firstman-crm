import {
  Building2Icon,
  CalendarDaysIcon,
  CircleUserRoundIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WalletCardsIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getEmployeeSelfProfile, getHrCapabilities } from "@/services/hr";

export default async function HrDashboardPage() {
  const user = await requireUser();
  const [profile, capabilities] = await Promise.all([
    getEmployeeSelfProfile(user.id),
    getHrCapabilities(user),
  ]);
  const canManageHr = capabilities.includes("hr_admin");
  const canManagePayroll = capabilities.includes("payroll_admin");

  const links = [
    {
      href: "/hr/me",
      title: "My profile",
      description: "Review your employment and organization details.",
      icon: CircleUserRoundIcon,
      visible: true,
    },
    {
      href: "/hr/directory",
      title: "Employee directory",
      description: "Find colleagues, teams, designations, and locations.",
      icon: UsersRoundIcon,
      visible: true,
    },
    {
      href: "/hr/employees",
      title: "Employee administration",
      description: "Maintain employee codes, reporting lines, status, and payroll eligibility.",
      icon: ShieldCheckIcon,
      visible: canManageHr,
    },
    {
      href: "/hr/organization",
      title: "Organization setup",
      description: "Configure departments, designations, and work locations.",
      icon: Building2Icon,
      visible: canManageHr,
    },
    {
      href: "/hr/leave",
      title: "Leave",
      description: "Review balances, request time off, and manage team approvals.",
      icon: CalendarDaysIcon,
      visible: true,
    },
    {
      href: "/hr/attendance",
      title: "Attendance",
      description: "Review daily attendance, exceptions, shifts, and correction requests.",
      icon: CalendarDaysIcon,
      visible: true,
    },
    {
      href: "/hr/bank",
      title: "Employee bank details",
      description: "Maintain encrypted payroll bank instructions.",
      icon: WalletCardsIcon,
      visible: canManagePayroll,
    },
    {
      href: "/hr/statutory",
      title: "Statutory details",
      description: "Maintain PAN, UAN, ESI, and eligibility settings.",
      icon: ShieldCheckIcon,
      visible: canManagePayroll,
    },
    {
      href: "/hr/security",
      title: "HR data security",
      description: "Recover and rotate encrypted HR records.",
      icon: ShieldCheckIcon,
      visible: user.role === "super_admin",
    },
    {
      href: "/hr/payroll",
      title: "Payroll",
      description: "Salary structures, monthly payroll runs, approvals, and posting.",
      icon: WalletCardsIcon,
      visible: canManagePayroll,
    },
    {
      href: "/hr/payslips",
      title: "My payslips",
      description: "Download your published monthly payslips.",
      icon: WalletCardsIcon,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#132a46] via-[#173c62] to-[#23638a] px-6 py-7 text-white shadow-lg sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-sky-200 uppercase">
          People workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Human resources</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/85">
          Employee records, organization structure, self-service, and workforce administration.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className="bg-white/15 text-white">
            {profile?.employmentStatus ?? "Profile pending"}
          </Badge>
          {capabilities.map((capability) => (
            <Badge key={capability} className="bg-sky-200/15 text-sky-50">
              {capability.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => {
          const Icon = item.icon;
          const card = (
            <Card
              key={item.href}
              className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="pt-2">{item.title}</CardTitle>
                <CardDescription className="leading-6">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
          return (
            <Link key={item.href} href={item.href}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
