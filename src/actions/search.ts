"use server";

import { requireUser } from "@/lib/session";
import { type GlobalSearchResults, globalSearch } from "@/services/search";

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  const currentUser = await requireUser();
  return globalSearch({ userId: currentUser.id, role: currentUser.role }, query);
}
