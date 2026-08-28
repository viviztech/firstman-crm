"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/shared";
import { requireUser } from "@/lib/session";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notifications";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const currentUser = await requireUser();
  await markNotificationRead(id, currentUser.id);
  revalidatePath("/notifications");
  return { ok: true, data: undefined };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const currentUser = await requireUser();
  await markAllNotificationsRead(currentUser.id);
  revalidatePath("/notifications");
  return { ok: true, data: undefined };
}
