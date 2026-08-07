import { NextResponse } from "next/server";
import { toScope } from "@/actions/shared";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/session";
import { renderJobCardPdf } from "@/services/job-card-pdf";

/**
 * Session-authenticated (unlike the invoice PDF route) — a job card is an internal working
 * document, never emailed/WhatsApp'd to a client, so it needs no signed public link.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser();
  const { id } = await params;

  let buffer: Buffer | null;
  try {
    buffer = await renderJobCardPdf(id, await toScope(user));
  } catch (error) {
    logger.error({ err: error, orderId: id }, "failed to render job card PDF");
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }

  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="job-card.pdf"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
