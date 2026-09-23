import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api-auth";
import { getStorageDriver } from "@/lib/storage";
import {
  auditEmployeeDocumentDownload,
  getEmployeeDocumentForDownload,
} from "@/services/hr-documents";

export const runtime = "nodejs";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const actor = await getApiUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const document = await getEmployeeDocumentForDownload(id, actor);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let buffer: Buffer;
  try {
    buffer = await getStorageDriver().read(document.storageKey);
  } catch {
    return NextResponse.json({ error: "File unavailable" }, { status: 500 });
  }
  if (createHash("sha256").update(buffer).digest("hex") !== document.sha256) {
    return NextResponse.json({ error: "File integrity check failed" }, { status: 500 });
  }
  await auditEmployeeDocumentDownload(id, actor);
  const extension = EXTENSIONS[document.mimeType] ?? "bin";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="employee-document-${id}.${extension}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
