import {
  BadgeIndianRupeeIcon,
  Clock3Icon,
  MapPinIcon,
  NetworkIcon,
  PercentIcon,
} from "lucide-react";
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
import type {
  getFranchiseCommissionDashboard,
  getFranchiseTerritoryHierarchy,
} from "@/services/franchise-commissions";

type CommissionData = Awaited<ReturnType<typeof getFranchiseCommissionDashboard>>;
type HierarchyData = Awaited<ReturnType<typeof getFranchiseTerritoryHierarchy>>;
const rateLabel = (bps: number | null) => (bps === null ? "Pending" : `${(bps / 100).toFixed(2)}%`);

const CHILD_LEVEL_NOUN: Record<NonNullable<HierarchyData["childLevel"]>, string> = {
  parliamentary: "Parliamentary constituency",
  assembly: "Assembly constituency",
  area: "Pincode",
};

function FranchiseHierarchyCard({ hierarchy }: { hierarchy: HierarchyData }) {
  if (!hierarchy.level) return null;

  if (hierarchy.level === "area") {
    return (
      <SectionCard title="Your territory hierarchy" icon={NetworkIcon} color="teal">
        <p className="text-muted-foreground">
          You hold a single pincode ({hierarchy.parentLabel}) — the smallest territory unit, so
          there's nothing further to drill into.
        </p>
      </SectionCard>
    );
  }

  const childLevel = hierarchy.childLevel;
  if (!childLevel) return null;
  const noun = CHILD_LEVEL_NOUN[childLevel];

  return (
    <SectionCard title="Your territory hierarchy" icon={NetworkIcon} color="teal">
      <p className="text-muted-foreground">
        {noun}s in {hierarchy.parentLabel}
      </p>
      {hierarchy.children.length === 0 ? (
        <p className="text-muted-foreground">
          {childLevel === "area"
            ? "No pincodes have been mapped to this assembly constituency yet — ask an admin to add them under Settings → Franchise territories."
            : `No ${noun.toLowerCase()} records exist for this territory yet.`}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>{noun}</TableHead>
              <TableHead>Franchise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchy.children.map((child) => (
              <TableRow key={child.id}>
                <TableCell className="font-mono text-xs">{child.code ?? "—"}</TableCell>
                <TableCell>{child.label}</TableCell>
                <TableCell>
                  {child.franchise ? (
                    <Badge variant="secondary">{child.franchise.name}</Badge>
                  ) : (
                    <Badge variant="outline">Open</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

export function FranchiseDashboard({
  data,
  hierarchy,
}: {
  data: CommissionData;
  hierarchy: HierarchyData | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label="Territory sales"
          value={formatMoney(data.territorySalesPaise)}
          subLabel={`${data.territorySalesCount} jobs`}
          icon={MapPinIcon}
          color="teal"
        />
        <StatCard
          label="Expected earnings"
          value={formatMoney(data.expectedCommissionPaise)}
          subLabel="Awaiting completion and payment"
          icon={Clock3Icon}
          color="amber"
        />
        <StatCard
          label="Earned commission"
          value={formatMoney(data.earnedCommissionPaise)}
          subLabel="Completed and paid jobs"
          icon={BadgeIndianRupeeIcon}
          color="green"
        />
      </div>
      <SectionCard title="Commission structure" icon={PercentIcon} color="amber">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="mt-1 font-semibold capitalize">
              {data.territory?.level ?? "Not assigned"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Basic commission</p>
            <p className="mt-1 font-semibold">{rateLabel(data.basicRateBps)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Additional when I close</p>
            <p className="mt-1 font-semibold">{rateLabel(data.additionalRateBps)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Territory: {data.territory?.label ?? "No territory allocated"}. Commission remains
          expected until the job is completed and its proforma is fully paid.
        </p>
      </SectionCard>
      {hierarchy ? <FranchiseHierarchyCard hierarchy={hierarchy} /> : null}
      <SectionCard title="Commissionable jobs" icon={BadgeIndianRupeeIcon} color="green">
        {data.rows.length === 0 ? (
          <p className="text-muted-foreground">No commissionable jobs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Pincode</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((sale) => (
                <TableRow key={sale.orderId}>
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
                    <div className="flex gap-1">
                      <Badge variant="outline">Basic</Badge>
                      {sale.additionalEligible ? (
                        <Badge variant="secondary">Additional</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.commissionStatus === "earned" ? "secondary" : "outline"}>
                      {sale.commissionStatus === "earned" ? "Earned" : "Expected"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(sale.totalCommissionPaise)}
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
