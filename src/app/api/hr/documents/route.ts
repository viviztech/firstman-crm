import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { MAX_UPLOAD_BYTES } from "@/lib/file-validation";
import { hasHrCapability } from "@/services/hr";
import { employeeDocumentInputSchema, uploadEmployeeDocument } from "@/services/hr-documents";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const actor = await getApiUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasHrCapability(actor, "hr_admin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A non-empty file is required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 10 MB limit" }, { status: 413 });
  }
  const parsed = employeeDocumentInputSchema.safeParse({
    userId: formData.get("userId"),
    type: formData.get("type"),
    label: formData.get("label"),
    expiryDate: formData.get("expiryDate"),
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid document details" }, { status: 400 });
  try {
    const created = await uploadEmployeeDocument(
      parsed.data,
      Buffer.from(await file.arrayBuffer()),
      actor,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "File must be 1 byte to 10 MB.",
        "Only PDF, JPG, PNG, or DOCX files are allowed.",
        "Complete the employee profile first.",
      ].includes(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
