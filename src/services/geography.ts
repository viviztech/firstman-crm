import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { districts, pincodes, states } from "@/db/schema/geography";

/** See catalog.ts's byNameCaseInsensitive — same cross-environment collation fix. */
const byNameCaseInsensitive = sql`lower(${states.name})`;
const byDistrictNameCaseInsensitive = sql`lower(${districts.name})`;

/** All states/UTs for a Select dropdown, e.g. the client form's state field. */
export async function listStates() {
  return db
    .select({
      id: states.id,
      name: states.name,
      gstCode: states.gstCode,
      isUnionTerritory: states.isUnionTerritory,
    })
    .from(states)
    .orderBy(byNameCaseInsensitive);
}

/** Districts within a state, for a state-scoped district picker. */
export async function listDistrictsByState(stateId: string) {
  return db
    .select({ id: districts.id, name: districts.name })
    .from(districts)
    .where(eq(districts.stateId, stateId))
    .orderBy(byDistrictNameCaseInsensitive);
}

/** Pincode -> city/district/state lookup, for client-side address autofill. */
export async function lookupByPincode(pincode: string) {
  return db.query.pincodes.findFirst({
    where: eq(pincodes.pincode, pincode),
    columns: { pincode: true, city: true },
    with: {
      district: { columns: { id: true, name: true } },
      state: { columns: { id: true, name: true } },
    },
  });
}
