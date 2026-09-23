"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeeDocumentTypeEnum } from "@/db/schema/hr-documents";

const TYPE_LABELS: Record<(typeof employeeDocumentTypeEnum.enumValues)[number], string> = {
  offer_letter: "Offer letter",
  appointment_letter: "Appointment letter",
  employment_contract: "Employment contract",
  identity_proof: "Identity proof",
  address_proof: "Address proof",
  certificate: "Certificate",
  other: "Other",
};

export function EmployeeDocumentUploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("userId", userId);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/hr/documents", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Upload failed" }));
        setMessage(body.error ?? "Upload failed");
        return;
      }
      formRef.current?.reset();
      setMessage("Document uploaded.");
      router.refresh();
    } catch {
      setMessage("Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="grid gap-4 rounded-lg border border-dashed p-4 sm:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="employeeDocumentType">Document type</Label>
        <select
          id="employeeDocumentType"
          name="type"
          required
          defaultValue="other"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {employeeDocumentTypeEnum.enumValues.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeDocumentLabel">Label</Label>
        <Input
          id="employeeDocumentLabel"
          name="label"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Signed appointment letter"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeDocumentExpiry">Expiry date (optional)</Label>
        <Input id="employeeDocumentExpiry" name="expiryDate" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeDocumentFile">File</Label>
        <Input
          id="employeeDocumentFile"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          required
        />
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, or DOCX; up to 10 MB.</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload document"}
        </Button>
      </div>
    </form>
  );
}
