import type { listLeadsForBoard } from "@/services/leads";

export type BoardLead = Awaited<ReturnType<typeof listLeadsForBoard>>[number];
