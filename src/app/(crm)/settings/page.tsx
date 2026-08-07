import { ChevronRight, Handshake, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { EnquiryAutoAssignmentToggle } from "@/components/settings/enquiry-auto-assignment-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { isEnquiryAutoAssignmentEnabled } from "@/services/enquiries";

export default async function SettingsPage() {
  const user = await requireRole("super_admin", "manager");
  const enquiryAutoAssignmentEnabled = await isEnquiryAutoAssignmentEnabled();

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

      <Link href="/settings/referral-partners">
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Handshake className="text-muted-foreground size-5" />
              <div>
                <CardTitle>Referral partners</CardTitle>
                <CardDescription>
                  External associates tracked for enquiry attribution and commission.
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-4" />
          </CardHeader>
        </Card>
      </Link>

      {user.role === "super_admin" ? (
        <Link href="/settings/lost-enquiries">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <Trash2 className="text-muted-foreground size-5" />
                <div>
                  <CardTitle>Lost enquiries</CardTitle>
                  <CardDescription>
                    Enquiries marked lost are hidden everywhere else — review or permanently delete
                    them here.
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
          <CardTitle>Enquiries</CardTitle>
          <CardDescription>Assignment behavior for new enquiries.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnquiryAutoAssignmentToggle initialEnabled={enquiryAutoAssignmentEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
