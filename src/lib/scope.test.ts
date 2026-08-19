import { describe, expect, it } from "vitest";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import { enquiries } from "@/db/schema/enquiries";
import {
  assignedToCondition,
  serviceCondition,
  territoryCondition,
  visibilityConditions,
} from "@/lib/scope";
import { makeScope } from "@/lib/test-scope";

describe("assignedToCondition", () => {
  it("applies only to internal-type executives", () => {
    expect(assignedToCondition(enquiries.assignedTo, makeScope("u1", "executive"))).toBeDefined();
  });

  it("applies assigned-only scope to associate executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "associate" });
    expect(assignedToCondition(enquiries.assignedTo, scope)).toBeDefined();
  });

  it("does not apply to franchise-type executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "franchise" });
    expect(assignedToCondition(enquiries.assignedTo, scope)).toBeUndefined();
  });

  it("does not apply to non-executive roles", () => {
    expect(assignedToCondition(enquiries.assignedTo, makeScope("u1", "manager"))).toBeUndefined();
    expect(
      assignedToCondition(enquiries.assignedTo, makeScope("u1", "super_admin")),
    ).toBeUndefined();
    expect(
      assignedToCondition(enquiries.assignedTo, makeScope("u1", "accountant")),
    ).toBeUndefined();
  });
});

describe("territoryCondition", () => {
  it("applies only to franchise-type executives", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    expect(territoryCondition(clients.pincode, scope)).toBeDefined();
  });

  it("does not apply to internal-type executives", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    expect(territoryCondition(clients.pincode, scope)).toBeUndefined();
  });

  it("fails closed (still returns a condition) when a franchise has zero allocated pincodes", () => {
    const scope = makeScope("u1", "executive", { employeeType: "franchise", pincodes: [] });
    // Must return a condition (that matches nothing) rather than undefined (which would mean "unscoped").
    expect(territoryCondition(clients.pincode, scope)).toBeDefined();
  });
});

describe("serviceCondition", () => {
  it("applies when the executive has explicit service assignments", () => {
    const scope = makeScope("u1", "executive", { serviceIds: ["s1", "s2"] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeDefined();
  });

  it("is unrestricted (undefined) when no service assignments are configured", () => {
    const scope = makeScope("u1", "executive", { serviceIds: [] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeUndefined();
  });

  it("does not apply to non-executive roles even with service assignments set", () => {
    const scope = makeScope("u1", "manager", { serviceIds: ["s1"] });
    expect(serviceCondition(enquiries.serviceInterestedId, scope)).toBeUndefined();
  });
});

describe("visibilityConditions", () => {
  it("returns undefined (unscoped) for manager/admin/accountant regardless of columns provided", () => {
    for (const role of ["manager", "super_admin", "accountant"] as const) {
      const scope = makeScope("u1", role, { pincodes: ["560001"], serviceIds: ["s1"] });
      expect(
        visibilityConditions(scope, {
          assignedToColumn: enquiries.assignedTo,
          pincodeColumn: enquiries.pincode,
          serviceIdColumn: enquiries.serviceInterestedId,
        }),
      ).toBeUndefined();
    }
  });

  it("scopes an internal executive by assignedTo only, ignoring pincode", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    const condition = visibilityConditions(scope, {
      assignedToColumn: enquiries.assignedTo,
      pincodeColumn: enquiries.pincode,
    });
    expect(condition).toBeDefined();
  });

  it("scopes a franchise executive by territory, ignoring assignedTo", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    const condition = visibilityConditions(scope, {
      assignedToColumn: enquiries.assignedTo,
      pincodeColumn: enquiries.pincode,
    });
    expect(condition).toBeDefined();
  });

  it("falls back to a via-client-id subquery when no direct pincode column is given", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
    });
    const condition = visibilityConditions(scope, { clientIdColumn: user.id });
    expect(condition).toBeDefined();
  });

  it("combines territory and service scoping for a franchise executive with service assignments", () => {
    const scope = makeScope("u1", "executive", {
      employeeType: "franchise",
      pincodes: ["560001"],
      serviceIds: ["s1"],
    });
    const condition = visibilityConditions(scope, {
      pincodeColumn: enquiries.pincode,
      serviceIdColumn: enquiries.serviceInterestedId,
    });
    expect(condition).toBeDefined();
  });

  it("returns undefined when an executive scope has no applicable columns and no service assignments", () => {
    const scope = makeScope("u1", "executive", { employeeType: "internal" });
    expect(visibilityConditions(scope, {})).toBeUndefined();
  });
});
