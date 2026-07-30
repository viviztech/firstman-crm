import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { verifyDownloadToken } from "@/lib/signed-url";
import { getStorageDriver } from "@/lib/storage";
import { getDocumentForDownload } from "@/services/documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!verifyDownloadToken(id, token)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 403 });
  }

  const document = await getDocumentForDownload(id, { userId: user.id, role: user.role });
  if (!document?.path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await getStorageDriver().read(document.path);
  } catch (error) {
    logger.error({ err: error, documentId: id }, "failed to read stored document");
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
