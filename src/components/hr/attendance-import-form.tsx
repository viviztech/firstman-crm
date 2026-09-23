"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ATTENDANCE_IMPORT_TEMPLATE, MAX_ATTENDANCE_IMPORT_BYTES } from "@/lib/attendance-csv";
import type { AttendanceImportPreviewRow } from "@/services/hr-attendance-import";

type Preview = { batchId: string | null; rows: AttendanceImportPreviewRow[] };

export function AttendanceImportForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState<"preview" | "commit" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const templateUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(ATTENDANCE_IMPORT_TEMPLATE)}`;
  async function submit(kind: "preview" | "commit") {
    const file = fileInput.current?.files?.[0];
    if (!file) return setMessage("Choose a CSV file first.");
    if (file.size > MAX_ATTENDANCE_IMPORT_BYTES) return setMessage("CSV exceeds the 1 MB limit.");
    if (kind === "commit" && !preview?.batchId) return;
    const body = new FormData();
    body.set("file", file);
    if (preview?.batchId) body.set("batchId", preview.batchId);
    setPending(kind);
    setMessage(null);
    try {
      const response = await fetch(`/api/hr/attendance/import/${kind}`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) {
        if (Array.isArray(result.rows)) setPreview({ batchId: null, rows: result.rows });
        setMessage(result.error ?? "Import failed.");
      } else if (kind === "preview") {
        setPreview(result);
        setMessage(
          result.batchId
            ? "Preview ready. Review every derived status before committing."
            : "Fix row errors and preview again.",
        );
      } else {
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
        setMessage(`Import complete: ${result.committed} attendance records committed.`);
        router.refresh();
      }
    } catch {
      setMessage("Import request failed.");
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Import up to 1,000 rows. Date-time cells use YYYY-MM-DDTHH:mm in the employee location
          timezone. Leave, holidays, and weekly offs are derived server-side.
        </p>
        <a
          href={templateUrl}
          download="attendance-import-template.csv"
          className="font-medium text-sky-700 hover:underline"
        >
          Download CSV template
        </a>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="attendanceCsvFile">Attendance CSV</Label>
          <Input
            ref={fileInput}
            id="attendanceCsvFile"
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
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">Row</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Derived status</th>
                  <th className="p-3">Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="p-3">{row.rowNumber}</td>
                    <td className="p-3">{row.employeeCode}</td>
                    <td className="p-3">{row.workDate}</td>
                    <td className="p-3">{row.operation}</td>
                    <td className="p-3">{row.derivedStatus ?? "—"}</td>
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
