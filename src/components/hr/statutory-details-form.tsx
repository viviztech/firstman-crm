"use client";

import { useActionState } from "react";
import { saveEmployeeStatutoryDetailsAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Existing = {
  pan: string;
  uan: string;
  esiNumber: string;
  aadhaarLastFour: string;
  pfEligible: boolean;
  esiEligible: boolean;
  professionalTaxEligible: boolean;
} | null;

export function StatutoryDetailsForm({ userId, existing }: { userId: string; existing: Existing }) {
  const [result, action, pending] = useActionState(
    saveEmployeeStatutoryDetailsAction.bind(null, userId),
    undefined,
  );
  return (
    <form action={action} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Existing identifiers are shown masked. Leave an identifier blank to retain it. Aadhaar is
        limited to the last four digits; never enter or upload the full number here.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="pan" label={`PAN${existing ? ` (${existing.pan})` : ""}`} maxLength={10} />
        <Field
          name="uan"
          label={`UAN${existing ? ` (${existing.uan})` : ""}`}
          maxLength={12}
          inputMode="numeric"
        />
        <Field
          name="esiNumber"
          label={`ESI number${existing ? ` (${existing.esiNumber})` : ""}`}
          maxLength={17}
          inputMode="numeric"
        />
        <Field
          name="aadhaarLastFour"
          label={`Aadhaar last four${existing ? ` (${existing.aadhaarLastFour})` : ""}`}
          maxLength={4}
          inputMode="numeric"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Choice name="pfEligible" label="PF eligible" value={existing?.pfEligible ?? false} />
        <Choice name="esiEligible" label="ESI eligible" value={existing?.esiEligible ?? false} />
        <Choice
          name="professionalTaxEligible"
          label="Professional tax eligible"
          value={existing?.professionalTaxEligible ?? false}
        />
      </div>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? <p className="text-sm text-emerald-700">Statutory details saved.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save statutory details"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  maxLength,
  inputMode,
}: {
  name: string;
  label: string;
  maxLength: number;
  inputMode?: "numeric";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} maxLength={maxLength} inputMode={inputMode} autoComplete="off" />
    </div>
  );
}

function Choice({ name, label, value }: { name: string; label: string; value: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={String(value)}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}
