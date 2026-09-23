import { describe, expect, it } from "vitest";
import { calculateLeaveHalfDays, requestsOverlap } from "@/services/hr-leave";
import { calculateProratedEntitlementHalfDays } from "@/services/hr-leave-entitlements";

describe("leave working-day calculation", () => {
  it("excludes weekends and configured holidays", () => {
    expect(
      calculateLeaveHalfDays("2026-09-21", "2026-09-28", "full_day", new Set(["2026-09-23"])),
    ).toBe(10);
  });

  it("counts an eligible half day as one half-day unit", () => {
    expect(calculateLeaveHalfDays("2026-09-22", "2026-09-22", "first_half", new Set())).toBe(1);
  });

  it("does not count half days on a weekly off", () => {
    expect(calculateLeaveHalfDays("2026-09-26", "2026-09-26", "second_half", new Set())).toBe(0);
  });
});

describe("leave overlap rules", () => {
  it("permits opposite halves of the same day", () => {
    expect(
      requestsOverlap(
        { startDate: "2026-09-22", endDate: "2026-09-22", dayPortion: "first_half" },
        { startDate: "2026-09-22", endDate: "2026-09-22", dayPortion: "second_half" },
      ),
    ).toBe(false);
  });

  it("blocks a full day that intersects an existing half day", () => {
    expect(
      requestsOverlap(
        { startDate: "2026-09-22", endDate: "2026-09-22", dayPortion: "full_day" },
        { startDate: "2026-09-22", endDate: "2026-09-22", dayPortion: "second_half" },
      ),
    ).toBe(true);
  });

  it("permits non-overlapping date ranges", () => {
    expect(
      requestsOverlap(
        { startDate: "2026-09-21", endDate: "2026-09-22", dayPortion: "full_day" },
        { startDate: "2026-09-23", endDate: "2026-09-24", dayPortion: "full_day" },
      ),
    ).toBe(false);
  });
});

describe("leave entitlement proration", () => {
  it("grants a full annual entitlement for a full-year assignment", () => {
    expect(
      calculateProratedEntitlementHalfDays({
        year: 2026,
        annualEntitlementHalfDays: 24,
        effectiveFrom: "2025-01-01",
        effectiveTo: null,
        joinDate: "2025-01-01",
        lastWorkingDate: null,
      }),
    ).toBe(24);
  });

  it("prorates from the employee join date", () => {
    expect(
      calculateProratedEntitlementHalfDays({
        year: 2026,
        annualEntitlementHalfDays: 24,
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        joinDate: "2026-07-01",
        lastWorkingDate: null,
      }),
    ).toBe(12);
  });

  it("uses the earliest policy or employment end date", () => {
    expect(
      calculateProratedEntitlementHalfDays({
        year: 2026,
        annualEntitlementHalfDays: 24,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-09-30",
        joinDate: "2025-01-01",
        lastWorkingDate: "2026-06-30",
      }),
    ).toBe(12);
  });
});
