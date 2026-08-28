import {
  BadgeIndianRupeeIcon,
  Clock3Icon,
  MapPinnedIcon,
  NetworkIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { formatMoney } from "@/lib/money";
import type { getFranchiseNetworkOverview } from "@/services/franchise-commissions";

type NetworkData = Awaited<ReturnType<typeof getFranchiseNetworkOverview>>;

const LEVEL_LABEL: Record<NetworkData["rows"][number]["level"], string> = {
  state: "State",
  parliamentary: "Parliamentary",
  assembly: "Assembly",
  area: "Area",
};

export function FranchiseManagerDashboard({ data }: { data: NetworkData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Active franchises"
          value={String(data.franchiseCount)}
          icon={UsersRoundIcon}
          color="teal"
        />
        <StatCard
          label="Network sales"
          value={formatMoney(data.totalSalesPaise)}
          icon={MapPinnedIcon}
          color="blue"
        />
        <StatCard
          label="Expected commission"
          value={formatMoney(data.totalExpectedCommissionPaise)}
          subLabel="Across every territory"
          icon={Clock3Icon}
          color="amber"
        />
        <StatCard
          label="Earned commission"
          value={formatMoney(data.totalEarnedCommissionPaise)}
          subLabel="Completed and paid jobs"
          icon={BadgeIndianRupeeIcon}
          color="green"
        />
      </div>

      <SectionCard title="Franchise network" icon={NetworkIcon} color="teal">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-muted-foreground">
            Every active franchise territory and its commission performance.
          </p>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/settings/franchises" />}
          >
            Manage territories
          </Button>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-muted-foreground">
            No franchise territories are assigned yet. Assign one under Manage territories.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Franchise</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.territoryId}>
                  <TableCell className="font-medium">{row.franchiseName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{LEVEL_LABEL[row.level]}</Badge>
                  </TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(row.basicRateBps / 100).toFixed(2)}% +{" "}
                    {(row.additionalRateBps / 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.salesPaise)}
                    <p className="text-xs text-muted-foreground">{row.salesCount} jobs</p>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.expectedCommissionPaise)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(row.earnedCommissionPaise)}
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
