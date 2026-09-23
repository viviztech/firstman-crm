export const EMPLOYEE_IMPORT_COLUMNS = [
  "email",
  "employee_code",
  "legal_name",
  "phone",
  "personal_email",
  "department_code",
  "designation_code",
  "manager_email",
  "location_code",
  "employment_category",
  "join_date",
  "payroll_eligible",
] as const;

export type EmployeeImportColumn = (typeof EMPLOYEE_IMPORT_COLUMNS)[number];
export type EmployeeCsvRow = { rowNumber: number; values: Record<EmployeeImportColumn, string> };
export const MAX_EMPLOYEE_IMPORT_BYTES = 1024 * 1024;
export const MAX_EMPLOYEE_IMPORT_ROWS = 500;

/** Small strict RFC-4180-style parser with quoted commas, newlines and escaped quotes. */
export function parseEmployeeCsv(source: string): EmployeeCsvRow[] {
  const content = source.replace(/^\uFEFF/, "");
  const records: Array<{ rowNumber: number; fields: string[] }> = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;
  let line = 1;
  let recordLine = 1;

  function finishField() {
    fields.push(field);
    field = "";
    closedQuote = false;
  }
  function finishRecord() {
    finishField();
    if (fields.some((value) => value.trim() !== "")) {
      records.push({ rowNumber: recordLine, fields });
    }
    fields = [];
    recordLine = line + 1;
  }

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
      continue;
    }
    if (char === '"') {
      if (field || closedQuote) throw new Error(`Malformed CSV near line ${line}.`);
      inQuotes = true;
    } else if (char === ",") {
      finishField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[index + 1] === "\n") index++;
      finishRecord();
      line++;
    } else if (closedQuote) {
      throw new Error(`Malformed CSV near line ${line}.`);
    } else {
      field += char;
    }
  }
  if (inQuotes) throw new Error("CSV has an unclosed quoted field.");
  if (field || fields.length || closedQuote) finishRecord();
  if (records.length < 2)
    throw new Error("CSV must contain a header and at least one employee row.");
  if (records.length - 1 > MAX_EMPLOYEE_IMPORT_ROWS) {
    throw new Error(`CSV is limited to ${MAX_EMPLOYEE_IMPORT_ROWS} employee rows.`);
  }

  const headers = records[0]?.fields.map((value) => value.trim().toLowerCase()) ?? [];
  const expected = new Set<string>(EMPLOYEE_IMPORT_COLUMNS);
  if (
    headers.length !== expected.size ||
    new Set(headers).size !== expected.size ||
    headers.some((value) => !expected.has(value))
  ) {
    throw new Error(`CSV headers must be: ${EMPLOYEE_IMPORT_COLUMNS.join(", ")}.`);
  }
  return records.slice(1).map((record) => {
    if (record.fields.length !== headers.length) {
      throw new Error(
        `Row ${record.rowNumber} has ${record.fields.length} columns; expected ${headers.length}.`,
      );
    }
    const values = Object.fromEntries(
      headers.map((header, index) => [header, record.fields[index]?.trim() ?? ""]),
    ) as Record<EmployeeImportColumn, string>;
    return { rowNumber: record.rowNumber, values };
  });
}

export const EMPLOYEE_IMPORT_TEMPLATE = `${EMPLOYEE_IMPORT_COLUMNS.join(",")}\r\n`;
