import { formatInTimeZone } from "date-fns-tz";
import { Trash2Icon } from "lucide-react";
import { HardDeleteEnquiryButton } from "@/components/settings/hard-delete-enquiry-button";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/session";
import { listLostEnquiries } from "@/services/enquiries";

export default async function LostEnquiriesSettingsPage() {
  await requireRole("super_admin");
  const enquiries = await listLostEnquiries();

  return (
    <div className="settings-workflow flex min-w-0 flex-col gap-5">
      <SettingsPageHeader
        title="Lost enquiries"
        description="Review enquiries hidden from active workflows and permanently remove records when required."
        icon={Trash2Icon}
      />

      <div className="min-w-0 overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-pink-50/70">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Lost reason</TableHead>
              <TableHead>Marked lost</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No lost enquiries.
                </TableCell>
              </TableRow>
            ) : (
              enquiries.map((enquiry) => (
                <TableRow key={enquiry.id} className="hover:bg-pink-50/40">
                  <TableCell className="font-medium">{enquiry.name}</TableCell>
                  <TableCell>{enquiry.phone}</TableCell>
                  <TableCell>{enquiry.serviceInterested?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{enquiry.lostReason ?? "—"}</TableCell>
                  <TableCell>
                    {formatInTimeZone(enquiry.updatedAt, env.TZ_DISPLAY, "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <HardDeleteEnquiryButton enquiryId={enquiry.id} enquiryName={enquiry.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
