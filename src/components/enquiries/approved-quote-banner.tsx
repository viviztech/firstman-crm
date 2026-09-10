import { formatInTimeZone } from "date-fns-tz";
import { BadgeCheck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { ApprovedQuoteSummary } from "@/services/quotes";

// Hardcoded rather than imported from lib/env: this component renders inside SalesForm/SalesDialog,
// both Client Components, and lib/env validates the full server env schema (DATABASE_URL, SMTP_*,
// etc.) at module load — pulling it into the client bundle crashes on load since those vars don't
// exist in the browser. Matches spec 2's fixed Asia/Kolkata display timezone.
const DISPLAY_TIMEZONE = "Asia/Kolkata";

/** Shared between SalesForm (the dedicated Sales page) and SalesDialog (the kanban drag-to-Won
 *  flow) — both close a sale from the same client-approved figure, so the callout reads
 *  identically regardless of which entry point the executive used. */
export function ApprovedQuoteBanner({ approvedQuote }: { approvedQuote: ApprovedQuoteSummary }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
      <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Customer approved {approvedQuote.quoteNo}
        {approvedQuote.professionalFeePaise != null ? (
          <> — professional fee {formatMoney(approvedQuote.professionalFeePaise)}</>
        ) : null}{" "}
        (total {formatMoney(approvedQuote.totalPaise)} incl. GST)
        {approvedQuote.respondedAt
          ? ` on ${formatInTimeZone(approvedQuote.respondedAt, DISPLAY_TIMEZONE, "d MMM yyyy")}`
          : ""}
        . The price below is pre-filled from it.
      </span>
    </div>
  );
}
