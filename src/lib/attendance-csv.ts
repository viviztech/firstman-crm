export const ATTENDANCE_IMPORT_COLUMNS = [
  "employee_code",
  "work_date",
  "first_in",
  "last_out",
  "status",
  "note",
] as const;
export type AttendanceImportColumn = (typeof ATTENDANCE_IMPORT_COLUMNS)[number];
export const ATTENDANCE_IMPORT_TEMPLATE = `${ATTENDANCE_IMPORT_COLUMNS.join(",")}\r\n`;
export const MAX_ATTENDANCE_IMPORT_BYTES = 1024 * 1024;
export const MAX_ATTENDANCE_IMPORT_ROWS = 1000;

export function parseAttendanceCsv(source: string) {
  const content = source.replace(/^\uFEFF/, "");
  const records: Array<{ rowNumber: number; fields: string[] }> = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;
  let line = 1;
  let recordLine = 1;
  const finishField = () => {
    fields.push(field);
    field = "";
    closedQuote = false;
  };
  const finishRecord = () => {
    finishField();
    if (fields.some((value) => value.trim())) records.push({ rowNumber: recordLine, fields });
    fields = [];
    recordLine = line + 1;
  };
  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += char;
        if (char === "\n") line++;
      }
    } else if (char === '"') {
      if (field || closedQuote) throw new Error(`Malformed CSV near line ${line}.`);
      inQuotes = true;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[index + 1] === "\n") index++;
      finishRecord();
      line++;
    } else if (closedQuote) throw new Error(`Malformed CSV near line ${line}.`);
    else field += char;
  }
  if (inQuotes) throw new Error("CSV has an unclosed quoted field.");
  if (field || fields.length || closedQuote) finishRecord();
  if (records.length < 2)
    throw new Error("CSV must contain a header and at least one attendance row.");
  if (records.length - 1 > MAX_ATTENDANCE_IMPORT_ROWS)
    throw new Error(`CSV is limited to ${MAX_ATTENDANCE_IMPORT_ROWS} attendance rows.`);
  const headers = records[0]?.fields.map((value) => value.trim().toLowerCase()) ?? [];
  if (headers.join(",") !== ATTENDANCE_IMPORT_COLUMNS.join(","))
    throw new Error(`CSV headers must be: ${ATTENDANCE_IMPORT_COLUMNS.join(", ")}.`);
  return records.slice(1).map((record) => {
    if (record.fields.length !== headers.length)
      throw new Error(
        `Row ${record.rowNumber} has ${record.fields.length} columns; expected ${headers.length}.`,
      );
    const values = Object.fromEntries(
      headers.map((header, index) => [header, record.fields[index]?.trim() ?? ""]),
    ) as Record<AttendanceImportColumn, string>;
    return { rowNumber: record.rowNumber, values };
  });
}
