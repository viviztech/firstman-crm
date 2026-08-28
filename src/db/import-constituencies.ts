import "dotenv/config";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assemblyConstituencies,
  parliamentaryConstituencies,
  pincodeConstituencies,
} from "@/db/schema/franchise";
import { states } from "@/db/schema/geography";

/**
 * Imports a reviewed official crosswalk CSV with columns:
 * state,pc_code,pc_name,ac_code,ac_name,pincode,source_url,source_version
 *
 * PC/AC values should come from ECI's current statistical report. Pincode rows may be assembled
 * from the relevant CEO polling-station exports; blank pincodes still import the official PC/AC
 * hierarchy. Existing manual pincode overrides are never replaced by a bulk import.
 */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else value += char;
  }
  fields.push(value.trim());
  return fields;
}

async function main() {
  const fileFlag = process.argv.indexOf("--file");
  const file = fileFlag >= 0 ? process.argv[fileFlag + 1] : undefined;
  if (!file)
    throw new Error(
      "Usage: npm run db:import-constituencies -- --file path/to/reviewed-official-crosswalk.csv",
    );
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const header = parseLine(lines[0] ?? "");
  const reviewedColumns = [
    "state",
    "pc_code",
    "pc_name",
    "ac_code",
    "ac_name",
    "pincode",
    "source_url",
    "source_version",
  ];
  const lgdColumns = [
    "State Name",
    "Parliament Constituency Code",
    "Parliament Constituency Name",
    "Assembly Constituency Code",
    "Assembly Constituency Name",
  ];
  const reviewedFormat = reviewedColumns.every((column) => header.includes(column));
  const lgdFormat = lgdColumns.every((column) => header.includes(column));
  if (!reviewedFormat && !lgdFormat) {
    throw new Error(
      `CSV must use the reviewed crosswalk format or LGD columns: ${lgdColumns.join(", ")}`,
    );
  }
  const at = (row: string[], name: string) => row[header.indexOf(name)]?.trim() ?? "";
  // Initial franchise rollout is Tamil Nadu only. Add further states deliberately when the
  // business activates them; do not seed nationwide constituency data by default.
  const targetStates = new Set(["Tamil Nadu"]);
  const sourceUrlDefault = lgdFormat
    ? "https://gist.github.com/planemad/96a5a3644a6fed2a43ddf579f6a9612d"
    : "";
  const sourceVersionDefault = lgdFormat ? "LGD-derived list, March 2024" : "";

  let pcCount = 0,
    acCount = 0,
    mappingCount = 0;
  for (const line of lines.slice(1)) {
    const row = parseLine(line);
    const stateName = at(row, reviewedFormat ? "state" : "State Name");
    if (lgdFormat && !targetStates.has(stateName)) continue;
    const state = await db.query.states.findFirst({ where: eq(states.name, stateName) });
    if (!state) throw new Error(`Unknown state: ${stateName}`);
    const sourceUrl = (reviewedFormat ? at(row, "source_url") : sourceUrlDefault) || null;
    const sourceVersion =
      (reviewedFormat ? at(row, "source_version") : sourceVersionDefault) || null;
    const pcCode = at(row, reviewedFormat ? "pc_code" : "Parliament Constituency Code");
    const pcName = at(row, reviewedFormat ? "pc_name" : "Parliament Constituency Name");
    const acCode = at(row, reviewedFormat ? "ac_code" : "Assembly Constituency Code");
    const acName = at(row, reviewedFormat ? "ac_name" : "Assembly Constituency Name");
    if (!pcCode || !pcName || !acCode || !acName) continue;

    const [pc] = await db
      .insert(parliamentaryConstituencies)
      .values({
        stateId: state.id,
        code: pcCode,
        name: pcName,
        sourceUrl,
        sourceVersion,
      })
      .onConflictDoUpdate({
        target: [parliamentaryConstituencies.stateId, parliamentaryConstituencies.code],
        set: { name: pcName, sourceUrl, sourceVersion },
      })
      .returning();
    if (!pc) throw new Error("Failed to import parliamentary constituency");
    pcCount++;
    const [ac] = await db
      .insert(assemblyConstituencies)
      .values({
        stateId: state.id,
        parliamentaryConstituencyId: pc.id,
        code: acCode,
        name: acName,
        sourceUrl,
        sourceVersion,
      })
      .onConflictDoUpdate({
        target: [assemblyConstituencies.stateId, assemblyConstituencies.code],
        set: {
          name: acName,
          parliamentaryConstituencyId: pc.id,
          sourceUrl,
          sourceVersion,
        },
      })
      .returning();
    if (!ac) throw new Error("Failed to import assembly constituency");
    acCount++;
    const pincode = reviewedFormat ? at(row, "pincode") : "";
    if (/^\d{6}$/.test(pincode)) {
      const existing = await db.query.pincodeConstituencies.findFirst({
        where: eq(pincodeConstituencies.pincode, pincode),
      });
      if (!existing?.isManualOverride) {
        await db
          .insert(pincodeConstituencies)
          .values({ pincode, assemblyConstituencyId: ac.id, sourceUrl, sourceVersion })
          .onConflictDoUpdate({
            target: pincodeConstituencies.pincode,
            set: { assemblyConstituencyId: ac.id, sourceUrl, sourceVersion },
          });
        mappingCount++;
      }
    }
  }
  // biome-ignore lint/suspicious/noConsole: CLI importer reports its completion summary.
  console.log(
    `Imported ${pcCount} PC rows, ${acCount} AC rows, and ${mappingCount} pincode mappings.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
