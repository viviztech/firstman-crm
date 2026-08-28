import { describe, expect, it } from "vitest";
import { getPortalRole } from "@/lib/portal-role";

describe("getPortalRole", () => {
  it("labels a manager by their team workspace (ADR 0006/0008)", () => {
    expect(getPortalRole("manager", "workforce", "internal")).toBe("Workforce Manager");
    expect(getPortalRole("manager", "franchise", "internal")).toBe("Franchise Manager");
    expect(getPortalRole("manager", "backoffice", "internal")).toBe("Backoffice Admin");
    expect(getPortalRole("manager", null, "internal")).toBe("Backoffice Admin");
  });

  it("team is manager-only presentation — it never changes a non-manager's label", () => {
    expect(getPortalRole("executive", "franchise", "internal")).not.toBe("Franchise Manager");
  });

  it("super_admin and accountant ignore team and employeeType entirely", () => {
    expect(getPortalRole("super_admin", "franchise", "franchise")).toBe("Super Admin");
    expect(getPortalRole("accountant", "workforce", "franchise")).toBe("Accounts");
  });

  it("labels franchise-type and associate executives distinctly from the plain sales/operations teams", () => {
    expect(getPortalRole("executive", null, "franchise")).toBe("Franchise");
    expect(getPortalRole("executive", "sales", "associate")).toBe("Associate Sales");
    expect(getPortalRole("executive", "operations", "associate")).toBe("Associate Operations");
    expect(getPortalRole("executive", "operations", "internal")).toBe("Operations");
    expect(getPortalRole("executive", "sales", "internal")).toBe("Sales");
    expect(getPortalRole("executive", null, "internal")).toBe("Sales");
  });
});
