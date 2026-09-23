import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema/staff";
import { auth, type Role } from "@/lib/auth";

/**
 * Wraps better-auth's admin-plugin API (auth.api.createUser/setRole/banUser/unbanUser).
 * Lives in src/lib, not src/services, because it needs the caller's request headers
 * (next/headers) the same way src/lib/session.ts does — better-auth uses them to identify
 * and re-verify the acting admin's session, independent of our own requireRole() check in
 * the server action that calls this.
 */

export const inviteUserInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["super_admin", "manager", "executive", "accountant"]),
});
export type InviteUserInput = z.infer<typeof inviteUserInputSchema>;

export const updateUserInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const resetUserPasswordInputSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function generateTempPassword(): string {
  return randomBytes(15).toString("base64url");
}

export async function createStaffUser(
  input: InviteUserInput,
): Promise<{ id: string; email: string; tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const requestHeaders = await headers();

  const created = await auth.api.createUser({
    body: { email: input.email, password: tempPassword, name: input.name, role: input.role },
    headers: requestHeaders,
  });

  return { id: created.user.id, email: input.email, tempPassword };
}

export async function updateStaffUser(userId: string, input: UpdateUserInput): Promise<void> {
  await auth.api.adminUpdateUser({
    body: { userId, data: input },
    headers: await headers(),
  });
}

export async function resetStaffUserPassword(
  userId: string,
  newPassword: string,
  actingUserId: string,
): Promise<void> {
  if (userId === actingUserId) {
    throw new Error("You can't reset your own password from user management.");
  }

  const requestHeaders = await headers();
  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: requestHeaders,
  });
  await auth.api.revokeUserSessions({
    body: { userId },
    headers: requestHeaders,
  });
}

/** A super_admin can't demote their own account — avoids an accidental self-lockout. */
export async function changeUserRole(
  userId: string,
  role: Role,
  actingUserId: string,
): Promise<void> {
  if (userId === actingUserId) {
    throw new Error("You can't change your own role.");
  }
  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });
}

/** A super_admin can't ban their own account — avoids an accidental self-lockout. */
export async function setUserBanned(
  userId: string,
  banned: boolean,
  actingUserId: string,
): Promise<void> {
  if (userId === actingUserId) {
    throw new Error("You can't deactivate your own account.");
  }
  if (!banned) {
    const profile = await db.query.staffProfiles.findFirst({
      where: eq(staffProfiles.userId, userId),
      columns: { employmentStatus: true },
    });
    if (profile?.employmentStatus === "exited") {
      throw new Error("Use the HR rehire workflow to restore an exited employee's access.");
    }
  }
  if (banned) {
    await auth.api.banUser({ body: { userId }, headers: await headers() });
  } else {
    await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  }
}
