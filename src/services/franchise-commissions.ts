import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { enquiries } from "@/db/schema/enquiries";
import { orders } from "@/db/schema/orders";
import type { ActorScope } from "@/lib/scope";
import { getSetting } from "@/services/settings";

export const FRANCHISE_DIRECT_COMMISSION_BPS_KEY = "franchise_direct_commission_bps";
export const FRANCHISE_TERRITORY_COMMISSION_BPS_KEY = "franchise_territory_commission_bps";

type SaleRow = {
  enquiryId: string;
  customerName: string;
  orderId: string;
  orderNo: string;
  pincode: string | null;
  salePaise: number;
  soldAt: Date;
};

function commissionPaise(salePaise: number, rateBps: number | null): number | null {
  return rateBps === null ? null : Math.round((salePaise * rateBps) / 10_000);
}

const saleSelection = {
  enquiryId: enquiries.id,
  customerName: enquiries.name,
  orderId: orders.id,
  orderNo: orders.orderNo,
  pincode: sql<string | null>`coalesce(${clients.pincode}, ${enquiries.pincode})`,
  salePaise: orders.quotedPricePaise,
  soldAt: enquiries.updatedAt,
};

function baseSalesQuery() {
  return db
    .select(saleSelection)
    .from(enquiries)
    .innerJoin(orders, eq(enquiries.convertedOrderId, orders.id))
    .innerJoin(clients, eq(enquiries.convertedClientId, clients.id));
}

export async function getFranchiseCommissionDashboard(scope: ActorScope) {
  if (scope.role !== "executive" || scope.employeeType !== "franchise") {
    throw new Error("Franchise commission data is only available to franchise users.");
  }

  const territoryPincode = sql<string>`coalesce(${clients.pincode}, ${enquiries.pincode})`;
  const [directSales, territorySales, directRateBps, territoryRateBps] = await Promise.all([
    baseSalesQuery().where(
      and(
        isNull(enquiries.deletedAt),
        eq(enquiries.status, "won"),
        eq(enquiries.assignedTo, scope.userId),
      ),
    ),
    scope.pincodes.length > 0
      ? baseSalesQuery().where(
          and(
            isNull(enquiries.deletedAt),
            eq(enquiries.status, "won"),
            inArray(territoryPincode, scope.pincodes),
          ),
        )
      : Promise.resolve([] as SaleRow[]),
    getSetting<number | null>(FRANCHISE_DIRECT_COMMISSION_BPS_KEY, null),
    getSetting<number | null>(FRANCHISE_TERRITORY_COMMISSION_BPS_KEY, null),
  ]);

  const sales = new Map<
    string,
    SaleRow & { directEligible: boolean; territoryEligible: boolean }
  >();
  for (const sale of directSales) {
    sales.set(sale.enquiryId, { ...sale, directEligible: true, territoryEligible: false });
  }
  for (const sale of territorySales) {
    const existing = sales.get(sale.enquiryId);
    sales.set(sale.enquiryId, {
      ...(existing ?? sale),
      directEligible: existing?.directEligible ?? false,
      territoryEligible: true,
    });
  }

  const rows = Array.from(sales.values())
    .map((sale) => {
      const directCommissionPaise = sale.directEligible
        ? commissionPaise(sale.salePaise, directRateBps)
        : 0;
      const territoryCommissionPaise = sale.territoryEligible
        ? commissionPaise(sale.salePaise, territoryRateBps)
        : 0;
      const hasPendingRate = directCommissionPaise === null || territoryCommissionPaise === null;
      return {
        ...sale,
        directCommissionPaise,
        territoryCommissionPaise,
        totalCommissionPaise: hasPendingRate
          ? null
          : directCommissionPaise + territoryCommissionPaise,
      };
    })
    .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());

  return {
    directRateBps,
    territoryRateBps,
    pincodes: scope.pincodes,
    directSalesCount: directSales.length,
    directSalesPaise: directSales.reduce((total, sale) => total + sale.salePaise, 0),
    territorySalesCount: territorySales.length,
    territorySalesPaise: territorySales.reduce((total, sale) => total + sale.salePaise, 0),
    estimatedCommissionPaise: rows.every((row) => row.totalCommissionPaise !== null)
      ? rows.reduce((total, row) => total + (row.totalCommissionPaise ?? 0), 0)
      : null,
    rows,
  };
}
