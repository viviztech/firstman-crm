import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  assemblyConstituencies,
  franchiseLevelEnum,
  franchiseTerritories,
  parliamentaryConstituencies,
  pincodeConstituencies,
} from "@/db/schema/franchise";
import { pincodes, states } from "@/db/schema/geography";
import { staffProfiles } from "@/db/schema/staff";
import type { ActorScope } from "@/lib/scope";
import { recordActivity } from "@/services/activity-log";

export const franchiseTerritoryInputSchema = z
  .object({
    userId: z.string().min(1),
    level: z.enum(franchiseLevelEnum.enumValues),
    stateId: z.string().uuid(),
    parliamentaryConstituencyId: z.string().uuid().nullable().optional(),
    assemblyConstituencyId: z.string().uuid().nullable().optional(),
    pincode: z
      .string()
      .regex(/^\d{6}$/)
      .nullable()
      .optional(),
    basicRateBps: z.coerce.number().int().min(0).max(10_000).optional(),
    additionalRateBps: z.coerce.number().int().min(0).max(10_000).default(1000),
  })
  .superRefine((value, ctx) => {
    if (value.level === "parliamentary" && !value.parliamentaryConstituencyId) {
      ctx.addIssue({
        code: "custom",
        path: ["parliamentaryConstituencyId"],
        message: "Select a parliamentary constituency",
      });
    }
    if (value.level === "assembly" && !value.assemblyConstituencyId) {
      ctx.addIssue({
        code: "custom",
        path: ["assemblyConstituencyId"],
        message: "Select an assembly constituency",
      });
    }
    if (value.level === "area" && !value.pincode) {
      ctx.addIssue({ code: "custom", path: ["pincode"], message: "Enter a pincode" });
    }
  });

export type FranchiseTerritoryInput = z.infer<typeof franchiseTerritoryInputSchema>;

function defaultBasicRate(level: FranchiseTerritoryInput["level"]): number {
  return level === "state" ? 100 : 500;
}

function territoryKey(input: FranchiseTerritoryInput): string {
  if (input.level === "state") return `state:${input.stateId}`;
  if (input.level === "parliamentary") return `parliamentary:${input.parliamentaryConstituencyId}`;
  if (input.level === "assembly") return `assembly:${input.assemblyConstituencyId}`;
  return `area:${input.pincode}`;
}

export async function setFranchiseTerritory(input: FranchiseTerritoryInput, actor: ActorScope) {
  const parsed = franchiseTerritoryInputSchema.parse(input);
  return db.transaction(async (tx) => {
    const staff = await tx.query.user.findFirst({ where: eq(user.id, parsed.userId) });
    if (staff?.role !== "executive") throw new Error("Franchise must be an executive user.");

    const profile = await tx.query.staffProfiles.findFirst({
      where: (row, { eq: equals }) => equals(row.userId, parsed.userId),
    });
    if (profile?.employeeType !== "franchise")
      throw new Error("Set the employee type to Franchise first.");

    const state = await tx.query.states.findFirst({ where: eq(states.id, parsed.stateId) });
    if (!state) throw new Error("State not found.");
    if (parsed.parliamentaryConstituencyId) {
      const pc = await tx.query.parliamentaryConstituencies.findFirst({
        where: and(
          eq(parliamentaryConstituencies.id, parsed.parliamentaryConstituencyId),
          eq(parliamentaryConstituencies.stateId, parsed.stateId),
        ),
      });
      if (!pc) throw new Error("Parliamentary constituency does not belong to the selected state.");
    }
    if (parsed.assemblyConstituencyId) {
      const ac = await tx.query.assemblyConstituencies.findFirst({
        where: and(
          eq(assemblyConstituencies.id, parsed.assemblyConstituencyId),
          eq(assemblyConstituencies.stateId, parsed.stateId),
        ),
      });
      if (!ac) throw new Error("Assembly constituency does not belong to the selected state.");
    }
    if (parsed.pincode) {
      const pin = await tx.query.pincodes.findFirst({
        where: and(eq(pincodes.pincode, parsed.pincode), eq(pincodes.stateId, parsed.stateId)),
      });
      if (!pin) throw new Error("Pincode does not belong to the selected state.");
    }

    const key = territoryKey(parsed);
    const collision = await tx.query.franchiseTerritories.findFirst({
      where: and(
        eq(franchiseTerritories.territoryKey, key),
        ne(franchiseTerritories.userId, parsed.userId),
        isNull(franchiseTerritories.deletedAt),
      ),
    });
    if (collision) throw new Error("This territory is already assigned to another franchise.");

    const values = {
      level: parsed.level,
      territoryKey: key,
      stateId: parsed.stateId,
      parliamentaryConstituencyId:
        parsed.level === "parliamentary" ? parsed.parliamentaryConstituencyId : null,
      assemblyConstituencyId: parsed.level === "assembly" ? parsed.assemblyConstituencyId : null,
      pincode: parsed.level === "area" ? parsed.pincode : null,
      basicRateBps: parsed.basicRateBps ?? defaultBasicRate(parsed.level),
      additionalRateBps: parsed.additionalRateBps,
      active: true,
      updatedBy: actor.userId,
      deletedAt: null,
    };
    const existing = await tx.query.franchiseTerritories.findFirst({
      where: eq(franchiseTerritories.userId, parsed.userId),
    });
    const [saved] = existing
      ? await tx
          .update(franchiseTerritories)
          .set(values)
          .where(eq(franchiseTerritories.id, existing.id))
          .returning()
      : await tx
          .insert(franchiseTerritories)
          .values({ ...values, userId: parsed.userId, createdBy: actor.userId })
          .returning();
    if (!saved) throw new Error("Failed to save franchise territory.");
    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "franchise_territory",
        entityId: saved.id,
        action: existing ? "updated" : "created",
        diff: values,
      },
      tx,
    );
    return saved;
  });
}

export async function removeFranchiseTerritory(id: string, actor: ActorScope) {
  const [removed] = await db
    .update(franchiseTerritories)
    .set({
      deletedAt: new Date(),
      active: false,
      territoryKey: `deleted:${id}`,
      updatedBy: actor.userId,
    })
    .where(eq(franchiseTerritories.id, id))
    .returning();
  return removed ?? null;
}

export async function listFranchiseAdminData() {
  const [territories, stateRows, pcs, acs, mappings, franchiseUsers] = await Promise.all([
    db.query.franchiseTerritories.findMany({
      where: isNull(franchiseTerritories.deletedAt),
      with: {
        user: true,
        state: true,
        parliamentaryConstituency: true,
        assemblyConstituency: true,
      },
      orderBy: (row, { asc }) => [asc(row.level), asc(row.territoryKey)],
    }),
    db
      .select({ id: states.id, name: states.name })
      .from(states)
      .orderBy(sql`lower(${states.name})`),
    db
      .select()
      .from(parliamentaryConstituencies)
      .where(isNull(parliamentaryConstituencies.deletedAt))
      .orderBy(parliamentaryConstituencies.code),
    db
      .select()
      .from(assemblyConstituencies)
      .where(isNull(assemblyConstituencies.deletedAt))
      .orderBy(assemblyConstituencies.code),
    db.select().from(pincodeConstituencies).where(isNull(pincodeConstituencies.deletedAt)),
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .where(eq(staffProfiles.employeeType, "franchise")),
  ]);
  return {
    territories,
    states: stateRows,
    parliamentaryConstituencies: pcs,
    assemblyConstituencies: acs,
    pincodeMappings: mappings,
    franchiseUsers,
  };
}

export const constituencyInputSchema = z.object({
  kind: z.enum(["parliamentary", "assembly"]),
  stateId: z.string().uuid(),
  parliamentaryConstituencyId: z.string().uuid().optional(),
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(160),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceVersion: z.string().max(80).optional(),
});

export async function createConstituency(
  input: z.infer<typeof constituencyInputSchema>,
  actor: ActorScope,
) {
  const value = constituencyInputSchema.parse(input);
  if (value.kind === "parliamentary") {
    const [created] = await db
      .insert(parliamentaryConstituencies)
      .values({
        stateId: value.stateId,
        code: value.code,
        name: value.name,
        sourceUrl: value.sourceUrl || null,
        sourceVersion: value.sourceVersion,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    return created;
  }
  if (!value.parliamentaryConstituencyId) throw new Error("Select a parliamentary constituency.");
  const [created] = await db
    .insert(assemblyConstituencies)
    .values({
      stateId: value.stateId,
      parliamentaryConstituencyId: value.parliamentaryConstituencyId,
      code: value.code,
      name: value.name,
      sourceUrl: value.sourceUrl || null,
      sourceVersion: value.sourceVersion,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning();
  return created;
}

export async function mapPincodeToAssembly(
  pincode: string,
  assemblyConstituencyId: string,
  actor: ActorScope,
) {
  if (!/^\d{6}$/.test(pincode)) throw new Error("Enter a valid six-digit pincode.");
  const existing = await db.query.pincodeConstituencies.findFirst({
    where: eq(pincodeConstituencies.pincode, pincode),
  });
  const values = {
    assemblyConstituencyId,
    isManualOverride: true,
    updatedBy: actor.userId,
    deletedAt: null,
  };
  const [saved] = existing
    ? await db
        .update(pincodeConstituencies)
        .set(values)
        .where(eq(pincodeConstituencies.id, existing.id))
        .returning()
    : await db
        .insert(pincodeConstituencies)
        .values({ ...values, pincode, createdBy: actor.userId })
        .returning();
  return saved;
}
