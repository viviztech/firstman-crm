import { describe, expect, it } from "vitest";
import { EMPLOYEE_IMPORT_TEMPLATE, parseEmployeeCsv } from "@/lib/hr-csv";

describe("employee CSV parsing", () => {
  it("supports BOM, quoted commas and quoted newlines", () => {
    const headers = EMPLOYEE_IMPORT_TEMPLATE.trim().split(",");
    const values = [
      "person@test.local",
      "EMP-1",
      '"Last, First\nMiddle"',
      "",
      "",
      "",
      "",
      "",
      "",
      "permanent",
      "2026-01-01",
      "true",
    ];
    const rows = parseEmployeeCsv(`\uFEFF${headers.join(",")}\r\n${values.join(",")}\r\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.rowNumber).toBe(2);
    expect(rows[0]?.values.legal_name).toBe("Last, First\nMiddle");
  });

  it("accepts valid headers in a different order", () => {
    const headers = EMPLOYEE_IMPORT_TEMPLATE.trim().split(",").reverse();
    const values = headers.map((header) =>
      header === "email" ? "person@test.local" : header === "employee_code" ? "EMP-2" : "",
    );
    const rows = parseEmployeeCsv(`${headers.join(",")}\n${values.join(",")}\n`);
    expect(rows[0]?.values.email).toBe("person@test.local");
    expect(rows[0]?.values.employee_code).toBe("EMP-2");
  });

  it("rejects duplicate headers and malformed row widths", () => {
    const header = EMPLOYEE_IMPORT_TEMPLATE.trim();
    expect(() => parseEmployeeCsv(`${header.replace("email,", "email,email,")}\nvalue`)).toThrow(
      "headers",
    );
    expect(() => parseEmployeeCsv(`${header}\nonly-one-cell`)).toThrow("columns");
  });

  it("rejects unclosed quoted fields and empty files", () => {
    expect(() => parseEmployeeCsv(`${EMPLOYEE_IMPORT_TEMPLATE}"unfinished`)).toThrow("unclosed");
    expect(() => parseEmployeeCsv(EMPLOYEE_IMPORT_TEMPLATE)).toThrow("at least one");
  });
});
