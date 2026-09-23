import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAttendanceImport,
  readAttendanceImport,
} from "@/app/api/hr/attendance/import/_shared";
import {
  AttendanceImportValidationError,
  commitAttendanceImport,
} from "@/services/hr-attendance-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await authorizeAttendanceImport();
  if (actor instanceof NextResponse) return actor;
  const upload = await readAttendanceImport(request);
  if (upload instanceof NextResponse) return upload;
  const batchId = upload.formData.get("batchId");
  if (!z.string().uuid().safeParse(batchId).success)
    return NextResponse.json({ error: "Invalid attendance import preview" }, { status: 400 });
  try {
    return NextResponse.json(await commitAttendanceImport(String(batchId), upload.csvText, actor));
  } catch (error) {
    if (error instanceof AttendanceImportValidationError)
      return NextResponse.json({ error: error.message, rows: error.rows }, { status: 409 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not commit attendance CSV" },
      { status: 409 },
    );
  }
}
