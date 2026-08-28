import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getCurrentPortalClient } from "@/lib/portal-session";
import { getStorageDriver } from "@/lib/storage";
import { getDocumentForPortalClient } from "@/services/portal";

/** Portal equivalent of the staff document-download route — auth is the portal session cookie, plus an explicit ownership check (ADR 0009). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const portalClient = await getCurrentPortalClient();
  if (!portalClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocumentForPortalClient(id, portalClient.clientId);
  if (!document?.path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await getStorageDriver().read(document.path);
  } catch (error) {
    logger.error({ err: error, documentId: id }, "portal: failed to read stored document");
    return NextResponse.json({ error: "File unavailable" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.fileName ?? "document"}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
