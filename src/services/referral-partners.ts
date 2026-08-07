import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { commissionTypeEnum, referralPartners } from "@/db/schema/referral-partners";
import type { ActorScope } from "@/lib/scope";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { recordActivity } from "@/services/activity-log";

const PAGE_SIZE = 20;

export const referralPartnerInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  phone: indianPhoneSchema,
  commissionType: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(commissionTypeEnum.enumValues).optional(),
  ),
  commissionRate: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().nonnegative().optional(),
  ),
  active: z.coerce.boolean().default(true),
});

export type ReferralPartnerInput = z.infer<typeof referralPartnerInputSchema>;

/** Minimal {id, name, phone} list for select dropdowns (e.g. the enquiry form's referral partner field). */
export async function listReferralPartnerOptions() {
  return db
    .select({ id: referralPartners.id, name: referralPartners.name, phone: referralPartners.phone })
    .from(referralPartners)
    .where(and(isNull(referralPartners.deletedAt), eq(referralPartners.active, true)))
    .orderBy(referralPartners.name);
}

export async function listReferralPartners(opts: { page?: number; search?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(referralPartners.deletedAt)];
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(
      ilike(referralPartners.name, term),
      ilike(referralPartners.phone, term),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(referralPartners)
      .where(where)
      .orderBy(referralPartners.name)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(referralPartners).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getReferralPartner(id: string) {
  return db.query.referralPartners.findFirst({
    where: and(eq(referralPartners.id, id), isNull(referralPartners.deletedAt)),
  });
}

export async function createReferralPartner(input: ReferralPartnerInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(referralPartners)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create referral partner");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "referral_partner",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

export async function updateReferralPartner(
  id: string,
  input: ReferralPartnerInput,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(referralPartners)
      .set({ ...input, updatedBy: actor.userId })
      .where(and(eq(referralPartners.id, id), isNull(referralPartners.deletedAt)))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "referral_partner",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

export async function deleteReferralPartner(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(referralPartners)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(referralPartners.id, id), isNull(referralPartners.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "referral_partner",
        entityId: deleted.id,
        action: "deleted",
      },
      tx,
    );

    return deleted;
  });
}
