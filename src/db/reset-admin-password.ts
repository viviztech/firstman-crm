import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, session, user } from "@/db/schema/auth-schema";

const email = process.env.ADMIN_RESET_EMAIL ?? "admin@firstman.in";
const newPassword = process.env.ADMIN_RESET_PASSWORD;

if (!newPassword || newPassword.length < 12) {
  throw new Error("ADMIN_RESET_PASSWORD must contain at least 12 characters.");
}

const adminUser = await db.query.user.findFirst({ where: eq(user.email, email) });

if (!adminUser) {
  throw new Error(`No user exists for ${email}.`);
}

const password = await hashPassword(newPassword);

await db.transaction(async (tx) => {
  const credential = await tx.query.account.findFirst({
    where: and(eq(account.userId, adminUser.id), eq(account.providerId, "credential")),
  });

  if (credential) {
    await tx
      .update(account)
      .set({ password, updatedAt: new Date() })
      .where(eq(account.id, credential.id));
  } else {
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: adminUser.id,
      providerId: "credential",
      userId: adminUser.id,
      password,
    });
  }

  await tx.delete(session).where(eq(session.userId, adminUser.id));
});

console.log(`Reset password and revoked existing sessions for ${email}.`);
