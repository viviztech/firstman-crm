import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { auth, type Role } from "@/lib/auth";
import { env } from "@/lib/env";

const STAFF: { role: Role; count: number }[] = [
  { role: "manager", count: 3 },
  { role: "executive", count: 3 },
  { role: "accountant", count: 3 },
];

async function upsertUser(email: string, name: string, role: Role): Promise<void> {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });

  if (existing) {
    await db.update(user).set({ role }).where(eq(user.id, existing.id));
    console.log(`updated role for ${email} -> ${role}`);
    return;
  }

  const result = await auth.api.signUpEmail({
    body: { email, password: env.ADMIN_DEFAULT_PASSWORD, name },
  });
  await db.update(user).set({ role }).where(eq(user.id, result.user.id));
  console.log(`created ${email} -> ${role}`);
}

async function main(): Promise<void> {
  await upsertUser("admin@firstman.in", "Admin", "super_admin");

  for (const group of STAFF) {
    for (let i = 1; i <= group.count; i++) {
      const email = `${group.role}${i}@firstman.in`;
      await upsertUser(email, `${group.role} ${i}`, group.role);
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
