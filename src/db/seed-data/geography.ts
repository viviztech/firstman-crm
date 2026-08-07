export type StateSeed = { name: string; gstCode: string; isUnionTerritory: boolean };

/**
 * Authoritative, hand-verified list of all 28 states + 8 union territories with their GST state
 * codes (the first two digits of a GSTIN) — cross-checked against ClearTax's published GST state
 * code table. Not derived from the pincode CSV below; the CSV's state spellings are normalized to
 * match these canonical names instead, so this list is never at the mercy of a stale data dump.
 * Codes 25 and 28 are retired predecessor codes (old Daman & Diu, old undivided Andhra Pradesh)
 * and are intentionally not seeded.
 */
export const STATE_SEED: StateSeed[] = [
  { name: "Andhra Pradesh", gstCode: "37", isUnionTerritory: false },
  { name: "Arunachal Pradesh", gstCode: "12", isUnionTerritory: false },
  { name: "Assam", gstCode: "18", isUnionTerritory: false },
  { name: "Bihar", gstCode: "10", isUnionTerritory: false },
  { name: "Chhattisgarh", gstCode: "22", isUnionTerritory: false },
  { name: "Goa", gstCode: "30", isUnionTerritory: false },
  { name: "Gujarat", gstCode: "24", isUnionTerritory: false },
  { name: "Haryana", gstCode: "06", isUnionTerritory: false },
  { name: "Himachal Pradesh", gstCode: "02", isUnionTerritory: false },
  { name: "Jharkhand", gstCode: "20", isUnionTerritory: false },
  { name: "Karnataka", gstCode: "29", isUnionTerritory: false },
  { name: "Kerala", gstCode: "32", isUnionTerritory: false },
  { name: "Madhya Pradesh", gstCode: "23", isUnionTerritory: false },
  { name: "Maharashtra", gstCode: "27", isUnionTerritory: false },
  { name: "Manipur", gstCode: "14", isUnionTerritory: false },
  { name: "Meghalaya", gstCode: "17", isUnionTerritory: false },
  { name: "Mizoram", gstCode: "15", isUnionTerritory: false },
  { name: "Nagaland", gstCode: "13", isUnionTerritory: false },
  { name: "Odisha", gstCode: "21", isUnionTerritory: false },
  { name: "Punjab", gstCode: "03", isUnionTerritory: false },
  { name: "Rajasthan", gstCode: "08", isUnionTerritory: false },
  { name: "Sikkim", gstCode: "11", isUnionTerritory: false },
  { name: "Tamil Nadu", gstCode: "33", isUnionTerritory: false },
  { name: "Telangana", gstCode: "36", isUnionTerritory: false },
  { name: "Tripura", gstCode: "16", isUnionTerritory: false },
  { name: "Uttar Pradesh", gstCode: "09", isUnionTerritory: false },
  { name: "Uttarakhand", gstCode: "05", isUnionTerritory: false },
  { name: "West Bengal", gstCode: "19", isUnionTerritory: false },
  { name: "Andaman and Nicobar Islands", gstCode: "35", isUnionTerritory: true },
  { name: "Chandigarh", gstCode: "04", isUnionTerritory: true },
  { name: "Dadra and Nagar Haveli and Daman and Diu", gstCode: "26", isUnionTerritory: true },
  { name: "Delhi", gstCode: "07", isUnionTerritory: true },
  { name: "Jammu and Kashmir", gstCode: "01", isUnionTerritory: true },
  { name: "Ladakh", gstCode: "38", isUnionTerritory: true },
  { name: "Lakshadweep", gstCode: "31", isUnionTerritory: true },
  { name: "Puducherry", gstCode: "34", isUnionTerritory: true },
];

/**
 * Maps the pincode CSV's (sometimes stale or misspelled) state spellings to the canonical names
 * in STATE_SEED. "Orissa"/"Uttaranchal"/"Pondicherry" are pre-2011ish official renames;
 * "Lakshdweep" is a plain misspelling in the source; the two-part 2020 UT merger and the
 * "X & Y" -> "X and Y" spacing are handled here too. Anything not listed here passes through
 * unchanged (already matches, or is unrecognized and will be dropped by the seed step with a
 * warning rather than silently guessed at).
 */
const STATE_NAME_NORMALIZATION: Record<string, string> = {
  "Andaman Nicobar": "Andaman and Nicobar Islands",
  "Jammu & Kashmir": "Jammu and Kashmir",
  "Dadra & Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "Daman & Diu": "Dadra and Nagar Haveli and Daman and Diu",
  Lakshdweep: "Lakshadweep",
  Orissa: "Odisha",
  Pondicherry: "Puducherry",
  Uttaranchal: "Uttarakhand",
};

export function normalizeStateName(raw: string): string {
  const trimmed = raw.trim();
  return STATE_NAME_NORMALIZATION[trimmed] ?? trimmed;
}

/**
 * India Post kept the old "Andhra Pradesh circle" pincode numbering (500000-509999) after
 * Telangana split off in 2014 rather than renumbering — this is standard, documented postal
 * practice, not a guess. Everything else in the (post-2014-dated, pre-2019) source data that's
 * still tagged "Andhra Pradesh" genuinely is residual Andhra Pradesh.
 */
export function applyTelanganaSplit(state: string, pincode: string): string {
  if (state === "Andhra Pradesh" && pincode >= "500000" && pincode <= "509999") {
    return "Telangana";
  }
  return state;
}

export type GeographyRow = { pincode: string; district: string; city: string; state: string };

/** Minimal RFC-4180-ish line parser — handles quoted fields with embedded commas/escaped quotes. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses the raw India Post pincode CSV (PostOfficeName,Pincode,DistrictsName,City,State),
 * normalizes state names and applies the Telangana split, then dedupes to one row per unique
 * pincode — a pincode has many post-office rows in the source; this keeps whichever
 * (district, city, state) combination is most frequent for that pincode (first occurrence wins
 * on a tie, since Map iteration order follows insertion/file order).
 */
export function parseGeographyCsv(csvText: string): GeographyRow[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.slice(1); // drop the header row

  const pincodeGroups = new Map<
    string,
    Map<string, { district: string; city: string; state: string; count: number }>
  >();

  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    const [, rawPincode, rawDistrict, rawCity, rawState] = fields;
    if (!rawPincode || !rawDistrict || !rawState) continue;

    const pincode = rawPincode.trim();
    if (!/^\d{6}$/.test(pincode)) continue;

    const district = rawDistrict.trim();
    if (!district) continue;
    const city = (rawCity ?? "").trim() || district;
    const state = applyTelanganaSplit(normalizeStateName(rawState), pincode);

    const key = `${district}|||${city}|||${state}`;
    let group = pincodeGroups.get(pincode);
    if (!group) {
      group = new Map();
      pincodeGroups.set(pincode, group);
    }
    const existing = group.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      group.set(key, { district, city, state, count: 1 });
    }
  }

  const rows: GeographyRow[] = [];
  for (const [pincode, group] of pincodeGroups) {
    let best: { district: string; city: string; state: string; count: number } | undefined;
    for (const candidate of group.values()) {
      if (!best || candidate.count > best.count) best = candidate;
    }
    if (best) {
      rows.push({ pincode, district: best.district, city: best.city, state: best.state });
    }
  }

  return rows.sort((a, b) => a.pincode.localeCompare(b.pincode));
}
