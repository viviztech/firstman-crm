import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { listAttendanceTeam } from "@/services/hr-attendance";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const actor = await getApiUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  try {
    const attendance = await listAttendanceTeam(actor, month);
    const rows = [
      ["employee_code", "employee_name", "work_date", "status", "work_minutes", "source", "locked"],
      ...attendance.summary.flatMap((employee) =>
        employee.records.map((record) => [
          employee.employeeCode ?? "",
          employee.name,
          record.workDate,
          record.status,
          record.workMinutes,
          record.source,
          record.lockedAt ? "yes" : "no",
        ]),
      ),
    ];
    const csv = `${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${attendance.month}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not export attendance" },
      { status: 403 },
    );
  }
}
