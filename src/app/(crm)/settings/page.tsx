import {
  ArrowUpRightIcon,
  HandshakeIcon,
  type LucideIcon,
  MapPinnedIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { EnquiryAutoAssignmentToggle } from "@/components/settings/enquiry-auto-assignment-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { isEnquiryAutoAssignmentEnabled } from "@/services/enquiries";

type SettingLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  label: string;
  superAdminOnly?: boolean;
};

const SETTING_LINKS: SettingLink[] = [
  {
    href: "/settings/users",
    title: "Users",
    description: "Invite staff, manage roles, team access, and account status.",
    icon: UsersIcon,
    label: "People & access",
    superAdminOnly: true,
  },
  {
    href: "/settings/referral-partners",
    title: "Referral partners",
    description: "Manage external associates, attribution, and commission terms.",
    icon: HandshakeIcon,
    label: "Partner network",
  },
  {
    href: "/settings/franchises",
    title: "Franchise territories",
    description: "Control territory hierarchy, mappings, and commission rates.",
    icon: MapPinnedIcon,
    label: "Territory control",
  },
  {
    href: "/settings/lost-enquiries",
    title: "Lost enquiries",
    description: "Review archived enquiries and permanently remove records when required.",
    icon: Trash2Icon,
    label: "Data management",
    superAdminOnly: true,
  },
];

export default async function SettingsPage() {
  const user = await requireRole("super_admin", "manager");
  const enquiryAutoAssignmentEnabled = await isEnquiryAutoAssignmentEnabled();
  const visibleLinks = SETTING_LINKS.filter(
    (item) => !item.superAdminOnly || user.role === "super_admin",
  );

  return (
    <div className="settings-workflow flex min-w-0 flex-col gap-5">
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
            <Settings2Icon className="size-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold tracking-[0.18em] text-pink-100 uppercase">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-pink-50/90">
            Configure people, territories, partners, and workflow behavior from one control center.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 transition-colors group-hover:bg-pink-600 group-hover:text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <ArrowUpRightIcon className="size-4 text-slate-300 transition-colors group-hover:text-pink-600" />
                  </div>
                  <p className="pt-2 text-[11px] font-bold tracking-[0.14em] text-pink-600 uppercase">
                    {item.label}
                  </p>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="leading-6">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
              <SlidersHorizontalIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Enquiry routing</CardTitle>
              <CardDescription>Choose how new enquiries enter the sales workflow.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EnquiryAutoAssignmentToggle initialEnabled={enquiryAutoAssignmentEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
