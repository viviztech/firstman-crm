import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyInvoicePdfToken } from "@/lib/signed-url";
import { renderInvoicePdf } from "@/services/invoice-pdf";

/**
 * Public route (no session check) — the signed token is the sole authorization, since this
 * link is meant to work for external clients emailed/WhatsApp'd a PDF with no CRM account.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!verifyInvoicePdfToken(id, token)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 403 });
  }

  let buffer: Buffer | null;
  try {
    buffer = await renderInvoicePdf(id);
  } catch (error) {
    logger.error({ err: error, invoiceId: id }, "failed to render invoice PDF");
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }

  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice.pdf"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
