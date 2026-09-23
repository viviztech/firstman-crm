import { NextResponse } from "next/server";
import {
  authorizeAttendanceImport,
  readAttendanceImport,
} from "@/app/api/hr/attendance/import/_shared";
import { previewAttendanceImport } from "@/services/hr-attendance-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await authorizeAttendanceImport();
  if (actor instanceof NextResponse) return actor;
  const upload = await readAttendanceImport(request);
  if (upload instanceof NextResponse) return upload;
  try {
    return NextResponse.json(await previewAttendanceImport(upload.csvText, actor));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not preview attendance CSV" },
      { status: 400 },
    );
  }
}
