"use client";

import { useActionState } from "react";
import { saveEmployeePrivateDetailsAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PrivateDetailsInput } from "@/services/hr-private";

export function PrivateDetailsForm({
  userId,
  existing,
}: {
  userId: string;
  existing: {
    details: Omit<PrivateDetailsInput, "emergencyContacts"> | null;
    emergencyContacts: PrivateDetailsInput["emergencyContacts"];
  } | null;
}) {
  const [result, action, pending] = useActionState(
    saveEmployeePrivateDetailsAction.bind(null, userId),
    undefined,
  );
  const details = existing?.details;
  const contacts = existing?.emergencyContacts ?? [];

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={details?.dateOfBirth ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={details?.gender ?? ""}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Not set</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="residentialAddress">Residential address</Label>
          <Textarea
            id="residentialAddress"
            name="residentialAddress"
            defaultValue={details?.residentialAddress ?? ""}
            maxLength={1000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="permanentAddress">Permanent address</Label>
          <Textarea
            id="permanentAddress"
            name="permanentAddress"
            defaultValue={details?.permanentAddress ?? ""}
            maxLength={1000}
          />
        </div>
      </div>
      <div className="space-y-3 border-t pt-5">
        <h3 className="text-sm font-semibold">Emergency contacts</h3>
        <p className="text-xs text-muted-foreground">
          Up to three contacts. Leave a row blank to omit it.
        </p>
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`contactName${index}`}>Name {index + 1}</Label>
              <Input
                id={`contactName${index}`}
                name={`contactName${index}`}
                defaultValue={contacts[index]?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contactRelationship${index}`}>Relationship</Label>
              <Input
                id={`contactRelationship${index}`}
                name={`contactRelationship${index}`}
                defaultValue={contacts[index]?.relationship ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contactPhone${index}`}>Phone</Label>
              <Input
                id={`contactPhone${index}`}
                name={`contactPhone${index}`}
                type="tel"
                defaultValue={contacts[index]?.phone ?? ""}
              />
            </div>
          </div>
        ))}
      </div>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? <p className="text-sm text-emerald-700">Private details saved.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save private details"}
      </Button>
    </form>
  );
}
