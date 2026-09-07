import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyQuotePdfToken } from "@/lib/signed-url";
import { renderQuotePdf } from "@/services/quote-pdf";

/**
 * Public route (no session check) — the signed token is the sole authorization, since this
 * link is meant to work for enquirers with no CRM account (mirrors /api/invoices/[id]/pdf).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!verifyQuotePdfToken(id, token)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 403 });
  }

  let buffer: Buffer | null;
  try {
    buffer = await renderQuotePdf(id);
  } catch (error) {
    logger.error({ err: error, quoteId: id }, "failed to render quote PDF");
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }

  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quote.pdf"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
