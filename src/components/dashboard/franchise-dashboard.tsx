import { BadgeIndianRupeeIcon, MapPinIcon, PercentIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { getFranchiseCommissionDashboard } from "@/services/franchise-commissions";

type CommissionData = Awaited<ReturnType<typeof getFranchiseCommissionDashboard>>;

function rateLabel(rateBps: number | null): string {
  return rateBps === null ? "Pending" : `${(rateBps / 100).toFixed(2)}%`;
}

export function FranchiseDashboard({ data }: { data: CommissionData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label="My direct sales"
          value={formatMoney(data.directSalesPaise)}
          subLabel={`${data.directSalesCount} closed sale${data.directSalesCount === 1 ? "" : "s"}`}
          icon={ShoppingBagIcon}
          color="green"
        />
        <StatCard
          label="Sales in my territory"
          value={formatMoney(data.territorySalesPaise)}
          subLabel={`${data.territorySalesCount} sale${data.territorySalesCount === 1 ? "" : "s"}`}
          icon={MapPinIcon}
          color="teal"
        />
        <StatCard
          label="Estimated commission"
          value={
            data.estimatedCommissionPaise === null
              ? "Rates pending"
              : formatMoney(data.estimatedCommissionPaise)
          }
          subLabel="Direct + territory commission"
          icon={BadgeIndianRupeeIcon}
          color="purple"
        />
      </div>

      <SectionCard title="Commission structure" icon={PercentIcon} color="amber">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Direct-sale commission</p>
            <p className="mt-1 font-semibold">{rateLabel(data.directRateBps)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Territory commission</p>
            <p className="mt-1 font-semibold">{rateLabel(data.territoryRateBps)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Territory:{" "}
          {data.pincodes.length > 0 ? data.pincodes.join(", ") : "No pincodes allocated yet"}. A
          direct sale inside your territory qualifies for both commission streams.
        </p>
      </SectionCard>

      <SectionCard title="Commissionable sales" icon={BadgeIndianRupeeIcon} color="green">
        {data.rows.length === 0 ? (
          <p className="text-muted-foreground">No commissionable sales yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale</TableHead>
                <TableHead>Pincode</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead className="text-right">Sale value</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((sale) => (
                <TableRow key={sale.enquiryId}>
                  <TableCell>
                    <Link
                      href={`/orders/${sale.orderId}`}
                      className="font-medium hover:text-primary"
                    >
                      {sale.orderNo}
                    </Link>
                    <p className="text-xs text-muted-foreground">{sale.customerName}</p>
                  </TableCell>
                  <TableCell>{sale.pincode ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sale.directEligible ? <Badge variant="secondary">Direct</Badge> : null}
                      {sale.territoryEligible ? <Badge variant="outline">Territory</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(sale.salePaise)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {sale.totalCommissionPaise === null
                      ? "Rate pending"
                      : formatMoney(sale.totalCommissionPaise)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
