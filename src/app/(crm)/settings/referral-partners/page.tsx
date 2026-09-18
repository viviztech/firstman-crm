import { HandshakeIcon } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { DeleteReferralPartnerButton } from "@/components/settings/delete-referral-partner-button";
import { ReferralPartnerFormDialog } from "@/components/settings/referral-partner-form-dialog";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { Badge } from "@/components/ui/badge";
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
    <div className="settings-workflow flex min-w-0 flex-col gap-5">
      <SettingsPageHeader
        title="Referral partners"
        description="Manage external associates tracked for enquiry attribution and commission."
        icon={HandshakeIcon}
        actions={<ReferralPartnerFormDialog />}
      />

      <div className="min-w-0 overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-pink-50/70">
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
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No referral partners yet.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((partner) => (
                <TableRow key={partner.id} className="hover:bg-pink-50/40">
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
      </div>

      <ListPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/settings/referral-partners"
      />
    </div>
  );
}
