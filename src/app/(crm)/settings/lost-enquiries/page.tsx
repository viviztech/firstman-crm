import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { HardDeleteEnquiryButton } from "@/components/settings/hard-delete-enquiry-button";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/settings" />}
      >
        <ChevronLeft className="size-4" /> Settings
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Lost enquiries</h1>
        <p className="text-sm text-muted-foreground">
          Hidden from every other list, kanban, and search in the app. Permanently deleting one here
          cannot be undone.
        </p>
      </div>

      <Table>
        <TableHeader>
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
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No lost enquiries.
              </TableCell>
            </TableRow>
          ) : (
            enquiries.map((enquiry) => (
              <TableRow key={enquiry.id}>
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
  );
}
