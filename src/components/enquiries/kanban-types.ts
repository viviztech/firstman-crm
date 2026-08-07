import type { listEnquiriesForBoard } from "@/services/enquiries";

export type BoardEnquiry = Awaited<ReturnType<typeof listEnquiriesForBoard>>[number];
