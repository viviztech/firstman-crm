import { LeadAutoAssignmentToggle } from "@/components/settings/lead-auto-assignment-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { isLeadAutoAssignmentEnabled } from "@/services/leads";

export default async function SettingsPage() {
  await requireRole("super_admin", "manager");
  const leadAutoAssignmentEnabled = await isLeadAutoAssignmentEnabled();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

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
