import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { MAX_ATTENDANCE_IMPORT_BYTES } from "@/lib/attendance-csv";
import { type HrActor, hasHrCapability } from "@/services/hr";

export async function authorizeAttendanceImport(): Promise<HrActor | NextResponse> {
  const actor = await getApiUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasHrCapability(actor, "hr_admin")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return actor;
}

export async function readAttendanceImport(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "A non-empty CSV file is required" }, { status: 400 });
  if (file.size > MAX_ATTENDANCE_IMPORT_BYTES)
    return NextResponse.json({ error: "Attendance CSV exceeds the 1 MB limit" }, { status: 413 });
  try {
    return {
      formData,
      csvText: new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()),
    };
  } catch {
    return NextResponse.json({ error: "CSV must be UTF-8 encoded" }, { status: 400 });
  }
}
