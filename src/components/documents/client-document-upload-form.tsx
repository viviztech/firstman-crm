"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentKindEnum } from "@/db/schema/documents";

const KIND_LABEL: Record<(typeof documentKindEnum.enumValues)[number], string> = {
  pan_card: "PAN Card",
  aadhaar: "Aadhaar Card",
  photo: "Photo",
  address_proof: "Address Proof",
  moa_aoa: "MOA/AOA",
  certificate: "Certificate",
  other: "Other",
};

export function ClientDocumentUploadForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("ownerType", "client");
    formData.set("ownerId", clientId);

    setIsUploading(true);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Upload failed" }));
        toast.error(body.error ?? "Upload failed");
        return;
      }
      toast.success("Document uploaded");
      formRef.current?.reset();
      router.refresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Kind</Label>
        <Select name="kind" defaultValue="other">
          <SelectTrigger id="kind" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {documentKindEnum.enumValues.map((value) => (
              <SelectItem key={value} value={value}>
                {KIND_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" required placeholder="e.g. Passport copy" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" required />
      </div>
      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Uploading…" : "Add document"}
      </Button>
    </form>
  );
}
