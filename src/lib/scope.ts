import type { Role } from "@/lib/auth";

/** Identifies the acting user for service-layer authorization and row scoping (spec 3). */
export type ActorScope = { userId: string; role: Role };
