import { describe, expect, it } from "vitest";
import { listAssignableStaff } from "@/services/users";

describe("listAssignableStaff (integration)", () => {
  it("returns only super_admin, manager, and executive users, ordered by name", async () => {
    const staff = await listAssignableStaff();

    expect(staff.length).toBeGreaterThan(0);
    for (const member of staff) {
      expect(["super_admin", "manager", "executive"]).toContain(member.role);
    }

    const names = staff.map((member) => member.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
