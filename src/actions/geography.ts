"use server";

import { requireUser } from "@/lib/session";
import { lookupByPincode } from "@/services/geography";

export type PincodeLookupResult = { city: string; district: string; state: string } | null;

/** Client-side address autofill — gated behind auth like every other action, even though the data itself isn't sensitive. */
export async function lookupPincodeAction(pincode: string): Promise<PincodeLookupResult> {
  await requireUser();

  if (!/^\d{6}$/.test(pincode)) return null;

  const match = await lookupByPincode(pincode);
  if (!match) return null;

  return { city: match.city, district: match.district.name, state: match.state.name };
}
