import { describe, expect, it } from "vitest";
import { listDistrictsByState, listStates, lookupByPincode } from "@/services/geography";

describe("geography service (integration)", () => {
  describe("listStates", () => {
    it("returns all 36 states/UTs ordered by name, each with a GST code", async () => {
      const rows = await listStates();
      expect(rows).toHaveLength(36);
      expect(rows.every((row) => row.gstCode)).toBe(true);

      const names = rows.map((row) => row.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

      const karnataka = rows.find((row) => row.name === "Karnataka");
      expect(karnataka?.gstCode).toBe("29");
      expect(karnataka?.isUnionTerritory).toBe(false);

      const delhi = rows.find((row) => row.name === "Delhi");
      expect(delhi?.isUnionTerritory).toBe(true);
    });
  });

  describe("listDistrictsByState", () => {
    it("returns districts scoped to the given state, ordered by name", async () => {
      const states = await listStates();
      const karnataka = states.find((row) => row.name === "Karnataka");
      if (!karnataka) throw new Error("Seed geography first — Karnataka not found");

      const rows = await listDistrictsByState(karnataka.id);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((row) => row.name === "Bangalore")).toBe(true);

      const names = rows.map((row) => row.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it("returns an empty list for a state with no seeded districts (Ladakh, a known source-data gap)", async () => {
      const states = await listStates();
      const ladakh = states.find((row) => row.name === "Ladakh");
      if (!ladakh) throw new Error("Seed geography first — Ladakh not found");

      const rows = await listDistrictsByState(ladakh.id);
      expect(rows).toHaveLength(0);
    });
  });

  describe("lookupByPincode", () => {
    it("resolves a known pincode to its city, district, and state", async () => {
      const match = await lookupByPincode("560001");
      expect(match?.city).toBe("Bangalore");
      expect(match?.district.name).toBe("Bangalore");
      expect(match?.state.name).toBe("Karnataka");
    });

    it("resolves a Telangana pincode correctly, not the stale pre-2014 Andhra Pradesh tag", async () => {
      const match = await lookupByPincode("500004");
      expect(match?.state.name).toBe("Telangana");
    });

    it("returns undefined for an unknown pincode", async () => {
      const match = await lookupByPincode("999999");
      expect(match).toBeUndefined();
    });
  });
});
