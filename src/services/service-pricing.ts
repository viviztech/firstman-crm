import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { serviceStatePrices, services } from "@/db/schema/catalog";
import { states } from "@/db/schema/geography";
import type { ActorScope } from "@/lib/scope";
import { recordActivity } from "@/services/activity-log";

/** See catalog.ts's byNameCaseInsensitive — same cross-environment collation fix. */
const byStateNameCaseInsensitive = sql`lower(${states.name})`;

export const serviceStateFeeComponentSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(200),
  amountPaise: z.coerce.number().int().nonnegative(),
  perDirector: z.coerce.boolean().default(false),
  perLakhCapital: z.coerce.boolean().default(false),
});

export type ServiceStateFeeComponentInput = z.infer<typeof serviceStateFeeComponentSchema>;

export const serviceStatePriceInputSchema = z.object({
  stateId: z.string().uuid("Choose a state"),
  feeComponents: z.array(serviceStateFeeComponentSchema).min(1, "Add at least one fee component"),
});

export type ServiceStatePriceInput = z.infer<typeof serviceStatePriceInputSchema>;

/** A service's configured state-wise price breakdowns, newest state name first. */
export async function listServiceStatePrices(serviceId: string) {
  return db
    .select({
      id: serviceStatePrices.id,
      stateId: serviceStatePrices.stateId,
      stateName: states.name,
      feeComponents: serviceStatePrices.feeComponents,
      updatedAt: serviceStatePrices.updatedAt,
    })
    .from(serviceStatePrices)
    .innerJoin(states, eq(serviceStatePrices.stateId, states.id))
    .where(eq(serviceStatePrices.serviceId, serviceId))
    .orderBy(byStateNameCaseInsensitive);
}

/**
 * Upsert — one row per (serviceId, stateId), so saving a state's breakdown always replaces
 * whatever was there before rather than appending (mirrors setServiceRelations's replace-all).
 */
export async function setServiceStatePriceComponents(
  serviceId: string,
  input: ServiceStatePriceInput,
  actor: ActorScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
  if (!service) return { ok: false, error: "Service not found." };

  await db.transaction(async (tx) => {
    await tx
      .insert(serviceStatePrices)
      .values({
        serviceId,
        stateId: input.stateId,
        feeComponents: input.feeComponents,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .onConflictDoUpdate({
        target: [serviceStatePrices.serviceId, serviceStatePrices.stateId],
        set: { feeComponents: input.feeComponents, updatedBy: actor.userId, updatedAt: new Date() },
      });

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service",
        entityId: serviceId,
        action: "state_price_set",
        diff: { stateId: input.stateId, feeComponents: input.feeComponents },
      },
      tx,
    );
  });

  return { ok: true } as const;
}

export async function deleteServiceStatePrice(
  serviceId: string,
  stateId: string,
  actor: ActorScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(serviceStatePrices)
      .where(
        and(eq(serviceStatePrices.serviceId, serviceId), eq(serviceStatePrices.stateId, stateId)),
      )
      .returning();
    if (!deleted) return { ok: false, error: "No pricing found for that state." };

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service",
        entityId: serviceId,
        action: "state_price_removed",
        diff: { stateId },
      },
      tx,
    );

    return { ok: true } as const;
  });
}

/** Mirrors InvoiceLineItem's qty/rate/amount split — qty is 1 for a flat component, or the
 *  resolved director count for one marked perDirector. */
export type ServiceQuoteComponent = {
  label: string;
  qty: number;
  ratePaise: number;
  amountPaise: number;
};

export type ServiceQuote = {
  components: ServiceQuoteComponent[];
  totalPaise: number;
  /** Whether the breakdown came from a state-specific row (true) or the service's flat fallback price (false). */
  stateSpecific: boolean;
};

/** A director count from a form/enquiry is untrusted input — floor it and never let it drop below 1. */
function resolveDirectorCount(numberOfDirectors: number | null | undefined): number {
  if (!numberOfDirectors || numberOfDirectors < 1) return 1;
  return Math.trunc(numberOfDirectors);
}

/** ₹1,00,000 (one lakh) in paise — the unit MOA/AOA stamp duty rates are normally quoted per. */
const PAISE_PER_LAKH = 10_000_000;
/** Default assumption (₹1,00,000 authorized capital) when an enquiry doesn't specify one — the
 *  common minimum for a fresh Pvt Ltd/LLP registration, so perLakhCapital rows still price at 1x
 *  rather than going unpriced. */
const DEFAULT_CAPITAL_PAISE = PAISE_PER_LAKH;

/** Authorized capital from a form/enquiry is untrusted input — floor to whole lakhs, minimum 1. */
function resolveCapitalLakhs(capitalAmountPaise: number | null | undefined): number {
  const paise =
    capitalAmountPaise && capitalAmountPaise > 0 ? capitalAmountPaise : DEFAULT_CAPITAL_PAISE;
  return Math.max(1, Math.ceil(paise / PAISE_PER_LAKH));
}

/**
 * The fee breakdown to quote for a service, optionally narrowed to a state (matched by name —
 * enquiries/clients store state as free text, not a stateId FK; see enquiries.ts schema), to a
 * director/partner count for components marked `perDirector` (e.g. DSC/DIN, one per director),
 * and to an authorized capital amount for components marked `perLakhCapital` (e.g. MOA/AOA stamp
 * duty, typically quoted per lakh of capital — ADR 0010 follow-up). A component can combine both
 * factors; each multiplies its own qty. Falls back to a single flat "Professional fee" +
 * "Government fee" line from the service's basePricePaise/govtFeePaise — never scaled by
 * director count or capital, since that split doesn't exist outside a configured state
 * breakdown — when no state-specific breakdown is configured, so every service is always
 * quotable even before an admin sets one up.
 */
export async function computeServiceQuote(
  serviceId: string,
  stateName: string | null | undefined,
  numberOfDirectors?: number | null,
  capitalAmountPaise?: number | null,
): Promise<ServiceQuote | null> {
  const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
  if (!service) return null;

  const directorCount = resolveDirectorCount(numberOfDirectors);
  const capitalLakhs = resolveCapitalLakhs(capitalAmountPaise);

  if (stateName) {
    const state = await db.query.states.findFirst({
      where: sql`lower(${states.name}) = lower(${stateName})`,
    });
    if (state) {
      const row = await db.query.serviceStatePrices.findFirst({
        where: and(
          eq(serviceStatePrices.serviceId, serviceId),
          eq(serviceStatePrices.stateId, state.id),
        ),
      });
      if (row) {
        const components: ServiceQuoteComponent[] = row.feeComponents.map((item) => {
          const qty =
            (item.perDirector ? directorCount : 1) * (item.perLakhCapital ? capitalLakhs : 1);
          return {
            label: item.label,
            qty,
            ratePaise: item.amountPaise,
            amountPaise: item.amountPaise * qty,
          };
        });
        const totalPaise = components.reduce((sum, item) => sum + item.amountPaise, 0);
        return { components, totalPaise, stateSpecific: true };
      }
    }
  }

  const components: ServiceQuoteComponent[] = [
    {
      label: "Professional fee",
      qty: 1,
      ratePaise: service.basePricePaise,
      amountPaise: service.basePricePaise,
    },
  ];
  if (service.govtFeePaise) {
    components.push({
      label: "Government fee",
      qty: 1,
      ratePaise: service.govtFeePaise,
      amountPaise: service.govtFeePaise,
    });
  }
  const totalPaise = components.reduce((sum, item) => sum + item.amountPaise, 0);
  return { components, totalPaise, stateSpecific: false };
}
