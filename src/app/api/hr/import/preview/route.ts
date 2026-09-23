import { NextResponse } from "next/server";
import { authorizeImport, readImportForm } from "@/app/api/hr/import/_shared";
import { previewEmployeeImport } from "@/services/hr-import";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const actor = await authorizeImport();
  if (actor instanceof NextResponse) return actor;
  const uploaded = await readImportForm(request);
  if (uploaded instanceof NextResponse) return uploaded;
  try {
    return NextResponse.json(await previewEmployeeImport(uploaded.csvText, actor));
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith("CSV ") ||
        error.message.startsWith("Row ") ||
        error.message.startsWith("Employee CSV"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not preview employee CSV" }, { status: 500 });
  }
}
