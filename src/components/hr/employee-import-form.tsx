"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPLOYEE_IMPORT_TEMPLATE, MAX_EMPLOYEE_IMPORT_BYTES } from "@/lib/hr-csv";
import type { EmployeeImportPreviewRow } from "@/services/hr-import";

type Preview = { batchId: string | null; rows: EmployeeImportPreviewRow[] };

export function EmployeeImportForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState<"preview" | "commit" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const templateUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(EMPLOYEE_IMPORT_TEMPLATE)}`;

  async function submit(kind: "preview" | "commit") {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setMessage("Choose a CSV file first.");
      return;
    }
    if (file.size > MAX_EMPLOYEE_IMPORT_BYTES) {
      setMessage("CSV exceeds the 1 MB limit.");
      return;
    }
    if (kind === "commit" && !preview?.batchId) return;
    const formData = new FormData();
    formData.set("file", file);
    if (kind === "commit" && preview?.batchId) formData.set("batchId", preview.batchId);
    setPending(kind);
    setMessage(null);
    try {
      const response = await fetch(`/api/hr/import/${kind}`, { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        if (Array.isArray(body.rows)) setPreview({ batchId: null, rows: body.rows });
        setMessage(body.error ?? "Import failed.");
        return;
      }
      if (kind === "preview") {
        setPreview(body as Preview);
        setMessage(
          body.batchId
            ? "Preview is ready. Review every row before committing."
            : "Fix the row errors and preview again.",
        );
      } else {
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
        setMessage(
          `Import complete: ${body.created} draft profiles created, ${body.updated} profiles updated.`,
        );
        router.refresh();
      }
    } catch {
      setMessage("Import request failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  const invalidCount = preview?.rows.filter((row) => row.errors.length).length ?? 0;
  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Import up to 500 employees whose CRM accounts already exist. New HR profiles start as
          draft; existing employment status never changes.
        </p>
        <p>
          Use the exact template headers. Blank optional cells clear those profile fields. Existing
          employee codes and join dates cannot be changed by import.
        </p>
        <a
          href={templateUrl}
          download="employee-import-template.csv"
          className="font-medium text-sky-700 hover:underline"
        >
          Download CSV template
        </a>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="employeeCsvFile">Employee CSV (UTF-8, up to 1 MB)</Label>
          <Input
            ref={fileInput}
            id="employeeCsvFile"
            type="file"
            accept=".csv,text/csv"
            onChange={() => {
              setPreview(null);
              setMessage(null);
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => submit("preview")}
        >
          {pending === "preview" ? "Validating…" : "Validate and preview"}
        </Button>
      </div>
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
      {preview ? (
        <div className="space-y-4">
          <p className="text-sm font-medium">
            {preview.rows.length} rows · {invalidCount} with errors
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-3">Row</th>
                  <th className="p-3">CRM email</th>
                  <th className="p-3">Employee code</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="p-3">{row.rowNumber}</td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3">{row.employeeCode}</td>
                    <td className="p-3">{row.operation}</td>
                    <td className="p-3">{row.errors.length ? row.errors.join("; ") : "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            disabled={!preview.batchId || pending !== null}
            onClick={() => submit("commit")}
          >
            {pending === "commit" ? "Importing…" : "Commit all rows"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
