import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeImport, readImportForm } from "@/app/api/hr/import/_shared";
import { commitEmployeeImport, EmployeeImportValidationError } from "@/services/hr-import";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const actor = await authorizeImport();
  if (actor instanceof NextResponse) return actor;
  const uploaded = await readImportForm(request);
  if (uploaded instanceof NextResponse) return uploaded;
  const batchId = uploaded.formData.get("batchId");
  if (!z.string().uuid().safeParse(batchId).success) {
    return NextResponse.json({ error: "Invalid import preview" }, { status: 400 });
  }
  try {
    const result = await commitEmployeeImport(String(batchId), uploaded.csvText, actor);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EmployeeImportValidationError) {
      return NextResponse.json({ error: error.message, rows: error.rows }, { status: 409 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("Preview") ||
        error.message.includes("preview") ||
        error.message.startsWith("CSV ") ||
        error.message.startsWith("Row "))
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not commit employee CSV" }, { status: 500 });
  }
}
