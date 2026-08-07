import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ListPagination } from "@/components/list-pagination";
import { DeleteReferralPartnerButton } from "@/components/settings/delete-referral-partner-button";
import { ReferralPartnerFormDialog } from "@/components/settings/referral-partner-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/session";
import { listReferralPartners } from "@/services/referral-partners";

export default async function ReferralPartnersSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("super_admin", "manager");
  const { page } = await searchParams;
  const result = await listReferralPartners({ page: page ? Number(page) : 1 });

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Referral partners</h1>
          <p className="text-sm text-muted-foreground">
            External associates tracked for enquiry attribution and commission — they never get a
            CRM login.
          </p>
        </div>
        <ReferralPartnerFormDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No referral partners yet.
              </TableCell>
            </TableRow>
          ) : (
            result.rows.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>{partner.phone}</TableCell>
                <TableCell>
                  {partner.commissionType
                    ? `${partner.commissionType} · ${partner.commissionRate ?? 0}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={partner.active ? "secondary" : "destructive"}>
                    {partner.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <ReferralPartnerFormDialog partner={partner} />
                    <DeleteReferralPartnerButton
                      partnerId={partner.id}
                      partnerName={partner.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/settings/referral-partners"
      />
    </div>
  );
}
