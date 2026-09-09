import { formatInTimeZone } from "date-fns-tz";
import { QuoteResponseForm } from "@/components/quotes/quote-response-form";
import { QUOTE_CLIENT_RESPONSE_BADGE } from "@/lib/badges";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { verifyQuoteResponseToken } from "@/lib/signed-url";
import { cn } from "@/lib/utils";
import { getCompanyProfile } from "@/services/company-profile";
import { getQuoteForResponse } from "@/services/quotes";

function InvalidLink({ reason }: { reason: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-6 pt-16 text-center sm:pt-24">
      <h1 className="text-xl font-semibold">Link unavailable</h1>
      <p className="text-sm text-muted-foreground">{reason}</p>
    </div>
  );
}

export default async function QuoteResponsePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token || !verifyQuoteResponseToken(id, token)) {
    return (
      <InvalidLink reason="This link has expired or is invalid. Please ask us to resend your quote." />
    );
  }

  const [quote, company] = await Promise.all([getQuoteForResponse(id), getCompanyProfile()]);
  if (!quote) {
    return <InvalidLink reason="We couldn't find this quote." />;
  }

  const statusBadge = QUOTE_CLIENT_RESPONSE_BADGE[quote.clientResponse];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 sm:p-10">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm font-semibold text-brand">{company.name}</p>
        <h1 className="text-xl font-semibold">Your quote — {quote.quoteNo}</h1>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Service</span>
          <span className="text-sm font-medium">{quote.serviceName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total estimate</span>
          <span className="text-lg font-semibold">{formatMoney(quote.totalPaise)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sent on</span>
          <span className="text-sm">
            {formatInTimeZone(quote.createdAt, env.TZ_DISPLAY, "d MMM yyyy")}
          </span>
        </div>
        {quote.clientResponse !== "pending" ? (
          <div className="mt-1 flex items-center justify-between border-t pt-2">
            <span className="text-sm text-muted-foreground">Your current response</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs", statusBadge.className)}>
              {statusBadge.label}
            </span>
          </div>
        ) : null}
      </div>

      <QuoteResponseForm quoteId={quote.id} token={token} />

      <p className="text-center text-xs text-muted-foreground">
        Questions? Call us at {company.phone}
        {company.email ? ` or email ${company.email}` : ""}.
      </p>
    </div>
  );
}
