import { describe, expect, it } from "vitest";
import { parseAttendanceCsv } from "@/lib/attendance-csv";
import { calculateWorkedMinutes, derivePunchStatus } from "@/services/hr-attendance";

describe("attendance punch derivation", () => {
  it("subtracts the configured unpaid break", () => {
    expect(
      calculateWorkedMinutes(
        new Date("2026-09-23T03:30:00Z"),
        new Date("2026-09-23T12:30:00Z"),
        60,
      ),
    ).toBe(480);
  });

  it("derives full-day, half-day, and short attendance from thresholds", () => {
    const base = {
      firstIn: new Date("2026-09-23T03:30:00Z"),
      lastOut: new Date("2026-09-23T12:30:00Z"),
      fullDayMinutes: 480,
      halfDayMinutes: 240,
      fallbackStatus: "absent" as const,
    };
    expect(derivePunchStatus({ ...base, workMinutes: 480 })).toBe("present");
    expect(derivePunchStatus({ ...base, workMinutes: 300 })).toBe("half_day");
    expect(derivePunchStatus({ ...base, workMinutes: 120 })).toBe("absent");
  });

  it("detects a missing punch deterministically", () => {
    expect(
      derivePunchStatus({
        firstIn: new Date("2026-09-23T03:30:00Z"),
        lastOut: null,
        workMinutes: 0,
        fullDayMinutes: 480,
        halfDayMinutes: 240,
        fallbackStatus: "present",
      }),
    ).toBe("missing_punch");
  });
});

describe("attendance CSV parser", () => {
  it("parses strict attendance headers and quoted notes", () => {
    const [row] = parseAttendanceCsv(
      'employee_code,work_date,first_in,last_out,status,note\r\nEMP-1,2026-09-23,2026-09-23T09:00,2026-09-23T18:00,present,"Office, Chennai"\r\n',
    );
    expect(row?.values.note).toBe("Office, Chennai");
  });

  it("rejects reordered or missing headers", () => {
    expect(() =>
      parseAttendanceCsv("work_date,employee_code,status\n2026-09-23,EMP-1,present\n"),
    ).toThrow("CSV headers must be");
  });
});
