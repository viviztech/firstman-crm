"use server";

import { toScope } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import { type GlobalSearchResults, globalSearch } from "@/services/search";

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  const currentUser = await requireUser();
  return globalSearch(await toScope(currentUser), query);
}
