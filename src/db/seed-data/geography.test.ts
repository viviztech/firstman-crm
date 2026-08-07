import { describe, expect, it } from "vitest";
import {
  applyTelanganaSplit,
  normalizeStateName,
  parseGeographyCsv,
  STATE_SEED,
} from "@/db/seed-data/geography";

describe("STATE_SEED", () => {
  it("has exactly 36 entries (28 states + 8 union territories) with unique names and GST codes", () => {
    expect(STATE_SEED).toHaveLength(36);
    expect(new Set(STATE_SEED.map((s) => s.name)).size).toBe(36);
    expect(new Set(STATE_SEED.map((s) => s.gstCode)).size).toBe(36);
    expect(STATE_SEED.filter((s) => s.isUnionTerritory)).toHaveLength(8);
  });

  it("has the well-known GST codes for Telangana, Andhra Pradesh, and Ladakh", () => {
    const byName = new Map(STATE_SEED.map((s) => [s.name, s.gstCode]));
    expect(byName.get("Telangana")).toBe("36");
    expect(byName.get("Andhra Pradesh")).toBe("37");
    expect(byName.get("Ladakh")).toBe("38");
  });
});

describe("normalizeStateName", () => {
  it("renames pre-2011 official names to their current names", () => {
    expect(normalizeStateName("Orissa")).toBe("Odisha");
    expect(normalizeStateName("Uttaranchal")).toBe("Uttarakhand");
    expect(normalizeStateName("Pondicherry")).toBe("Puducherry");
  });

  it("fixes the source's misspelling and ampersand spacing", () => {
    expect(normalizeStateName("Lakshdweep")).toBe("Lakshadweep");
    expect(normalizeStateName("Jammu & Kashmir")).toBe("Jammu and Kashmir");
    expect(normalizeStateName("Andaman Nicobar")).toBe("Andaman and Nicobar Islands");
  });

  it("merges the two pre-2020 UTs into the single current UT", () => {
    expect(normalizeStateName("Dadra & Nagar Haveli")).toBe(
      "Dadra and Nagar Haveli and Daman and Diu",
    );
    expect(normalizeStateName("Daman & Diu")).toBe("Dadra and Nagar Haveli and Daman and Diu");
  });

  it("passes through names that are already canonical", () => {
    expect(normalizeStateName("Karnataka")).toBe("Karnataka");
    expect(normalizeStateName("  Karnataka  ")).toBe("Karnataka");
  });
});

describe("applyTelanganaSplit", () => {
  it("reassigns Andhra Pradesh pincodes in the 500000-509999 range to Telangana", () => {
    expect(applyTelanganaSplit("Andhra Pradesh", "500001")).toBe("Telangana");
    expect(applyTelanganaSplit("Andhra Pradesh", "509999")).toBe("Telangana");
  });

  it("leaves residual Andhra Pradesh pincodes outside that range unchanged", () => {
    expect(applyTelanganaSplit("Andhra Pradesh", "530001")).toBe("Andhra Pradesh");
    expect(applyTelanganaSplit("Andhra Pradesh", "499999")).toBe("Andhra Pradesh");
    expect(applyTelanganaSplit("Andhra Pradesh", "510000")).toBe("Andhra Pradesh");
  });

  it("never touches a different state's pincode", () => {
    expect(applyTelanganaSplit("Karnataka", "500001")).toBe("Karnataka");
  });
});

describe("parseGeographyCsv", () => {
  it("dedupes multiple post-office rows for the same pincode by majority vote", () => {
    const csv = [
      '"PostOfficeName","Pincode","DistrictsName","City","State"',
      '"Office A","560001","Bangalore","Bangalore","Karnataka"',
      '"Office B","560001","Bangalore","Bangalore","Karnataka"',
      '"Office C","560001","Bangalore Urban","Bengaluru","Karnataka"',
    ].join("\n");

    const rows = parseGeographyCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      pincode: "560001",
      district: "Bangalore",
      city: "Bangalore",
      state: "Karnataka",
    });
  });

  it("normalizes state names and applies the Telangana split while parsing", () => {
    const csv = [
      '"PostOfficeName","Pincode","DistrictsName","City","State"',
      '"Ac Guards","500004","Hyderabad","Hyderabad","Andhra Pradesh"',
      '"Some Office","530001","Visakhapatnam","Visakhapatnam","Andhra Pradesh"',
      '"Puri Office","752001","Puri","Puri","Orissa"',
    ].join("\n");

    const rows = parseGeographyCsv(csv);
    const byPincode = new Map(rows.map((r) => [r.pincode, r]));
    expect(byPincode.get("500004")?.state).toBe("Telangana");
    expect(byPincode.get("530001")?.state).toBe("Andhra Pradesh");
    expect(byPincode.get("752001")?.state).toBe("Odisha");
  });

  it("skips malformed rows (missing fields, non-6-digit pincodes) instead of throwing", () => {
    const csv = [
      '"PostOfficeName","Pincode","DistrictsName","City","State"',
      '"Bad Row","","","",""',
      '"Bad Pincode","ABCDEF","District","City","Karnataka"',
      '"Good Row","560001","Bangalore","Bangalore","Karnataka"',
    ].join("\n");

    const rows = parseGeographyCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pincode).toBe("560001");
  });

  it("falls back to the district name when city is blank", () => {
    const csv = [
      '"PostOfficeName","Pincode","DistrictsName","City","State"',
      '"Remote Office","110002","Central Delhi","","Delhi"',
    ].join("\n");

    const rows = parseGeographyCsv(csv);
    expect(rows[0]?.city).toBe("Central Delhi");
  });

  it("returns rows sorted by pincode", () => {
    const csv = [
      '"PostOfficeName","Pincode","DistrictsName","City","State"',
      '"B","560002","Bangalore","Bangalore","Karnataka"',
      '"A","560001","Bangalore","Bangalore","Karnataka"',
    ].join("\n");

    const rows = parseGeographyCsv(csv);
    expect(rows.map((r) => r.pincode)).toEqual(["560001", "560002"]);
  });
});
