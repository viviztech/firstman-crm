import type { LucideIcon } from "lucide-react";
import {
  BookOpenIcon,
  BriefcaseBusinessIcon,
  ClipboardPlusIcon,
  FilePlus2Icon,
  ListChecksIcon,
  UserCogIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";

type Workspace = "backoffice" | "workforce";

const ACTIONS: Record<
  Workspace,
  { title: string; description: string; href: string; icon: LucideIcon }[]
> = {
  backoffice: [
    {
      title: "Add enquiry",
      description: "Capture a new CRM lead",
      href: "/enquiries/new",
      icon: ClipboardPlusIcon,
    },
    {
      title: "Add client",
      description: "Create a customer record",
      href: "/clients/new",
      icon: UserPlusIcon,
    },
    {
      title: "Create job card",
      description: "Start service fulfilment",
      href: "/orders/new",
      icon: FilePlus2Icon,
    },
    {
      title: "Service catalog",
      description: "Maintain CRM services",
      href: "/catalog",
      icon: BookOpenIcon,
    },
  ],
  workforce: [
    {
      title: "Manage workforce",
      description: "Teams, types and scopes",
      href: "/settings/users",
      icon: UserCogIcon,
    },
    {
      title: "Allocate enquiries",
      description: "Review the sales queue",
      href: "/enquiries",
      icon: UsersRoundIcon,
    },
    {
      title: "Allocate job cards",
      description: "Review operations workload",
      href: "/orders",
      icon: BriefcaseBusinessIcon,
    },
    {
      title: "Review compliance",
      description: "Track upcoming work",
      href: "/compliance",
      icon: ListChecksIcon,
    },
  ],
};

export function RoleWorkspaceDashboard({
  workspace,
  enquiryCount,
  jobCardCount,
  overdueTaskCount,
}: {
  workspace: Workspace;
  enquiryCount: number;
  jobCardCount: number;
  overdueTaskCount: number;
}) {
  const isWorkforce = workspace === "workforce";
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Enquiries this month"
          value={String(enquiryCount)}
          icon={UsersRoundIcon}
          color="blue"
        />
        <StatCard
          label="Active job cards"
          value={String(jobCardCount)}
          icon={BriefcaseBusinessIcon}
          color="purple"
        />
        <StatCard
          label="Overdue tasks"
          value={String(overdueTaskCount)}
          icon={ListChecksIcon}
          color={overdueTaskCount ? "red" : "slate"}
        />
      </div>
      <SectionCard
        title={isWorkforce ? "Allocation workspace" : "Data entry workspace"}
        icon={isWorkforce ? UserCogIcon : ClipboardPlusIcon}
        color={isWorkforce ? "teal" : "blue"}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS[workspace].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <action.icon className="mb-3 size-5 text-primary" />
              <p className="font-medium group-hover:text-primary">{action.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
