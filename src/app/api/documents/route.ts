import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import type { Role } from "@/lib/auth";
import { detectFileKind, MAX_UPLOAD_BYTES } from "@/lib/file-validation";
import { logger } from "@/lib/logger";
import { createClientDocument, createDocumentInputSchema } from "@/services/documents";

const CAN_UPLOAD: Role[] = ["super_admin", "manager", "executive"];

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!CAN_UPLOAD.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10 MB limit" }, { status: 413 });
  }

  const parsed = createDocumentInputSchema.safeParse({
    ownerType: formData.get("ownerType"),
    ownerId: formData.get("ownerId"),
    kind: formData.get("kind"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedKind = detectFileKind(buffer);
  if (!detectedKind) {
    return NextResponse.json(
      { error: "Only PDF, JPG, PNG, or DOCX files are allowed" },
      { status: 400 },
    );
  }

  const created = await createClientDocument(
    parsed.data,
    { buffer, detectedKind },
    { userId: user.id, role: user.role },
  );
  if (!created) {
    return NextResponse.json(
      { error: "Not found, or you do not have access to it" },
      { status: 404 },
    );
  }

  logger.info({ documentId: created.id, ownerType: created.ownerType }, "document uploaded");
  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}
