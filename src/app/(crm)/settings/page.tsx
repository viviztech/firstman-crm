import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { LeadAutoAssignmentToggle } from "@/components/settings/lead-auto-assignment-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { isLeadAutoAssignmentEnabled } from "@/services/leads";

export default async function SettingsPage() {
  const user = await requireRole("super_admin", "manager");
  const leadAutoAssignmentEnabled = await isLeadAutoAssignmentEnabled();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {user.role === "super_admin" ? (
        <Link href="/settings/users">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <Users className="text-muted-foreground size-5" />
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Invite staff, change roles, and deactivate accounts.
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4" />
            </CardHeader>
          </Card>
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>Assignment behavior for new leads.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeadAutoAssignmentToggle initialEnabled={leadAutoAssignmentEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
