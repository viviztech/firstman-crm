import { describe, expect, it } from "vitest";
import { hasStaffTeam } from "@/lib/teams";

describe("hasStaffTeam", () => {
  it("allows combined members into both executive workflows", () => {
    expect(hasStaffTeam("sales_operations", "sales")).toBe(true);
    expect(hasStaffTeam("sales_operations", "operations")).toBe(true);
  });

  it("keeps single-team membership separate", () => {
    expect(hasStaffTeam("sales", "sales")).toBe(true);
    expect(hasStaffTeam("operations", "operations")).toBe(true);
    expect(hasStaffTeam("sales", "operations")).toBe(false);
    expect(hasStaffTeam("operations", "sales")).toBe(false);
  });

  it("does not turn combined or unset membership into a manager workspace", () => {
    for (const team of ["backoffice", "workforce", "franchise"] as const) {
      expect(hasStaffTeam("sales_operations", team)).toBe(false);
      expect(hasStaffTeam(null, team)).toBe(false);
      expect(hasStaffTeam(team, team)).toBe(true);
    }
  });

  it("does not grant explicit workflow membership to unset teams", () => {
    for (const team of [null, undefined] as const) {
      expect(hasStaffTeam(team, "sales")).toBe(false);
      expect(hasStaffTeam(team, "operations")).toBe(false);
    }
  });
});
