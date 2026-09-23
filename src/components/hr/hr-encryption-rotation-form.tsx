"use client";

import { useActionState } from "react";
import { rotateHrEncryptionAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HrEncryptionRotationForm() {
  const [result, action, pending] = useActionState(rotateHrEncryptionAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Operational procedure</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Back up the database and verify the backup.</li>
          <li>
            Set the new BETTER_AUTH_SECRET and put the old value temporarily in
            HR_DATA_PREVIOUS_AUTH_SECRET.
          </li>
          <li>Restart the app, sign in again, and run this rotation.</li>
          <li>
            Verify employee private records, then remove HR_DATA_PREVIOUS_AUTH_SECRET and restart.
          </li>
        </ol>
        <p className="mt-2">
          Legacy v1 records also require their original HR_DATA_ENCRYPTION_KEY during this run.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rotationConfirmation">Type ROTATE HR DATA</Label>
        <Input id="rotationConfirmation" name="confirmation" autoComplete="off" required />
      </div>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? (
        <p className="text-sm text-emerald-700">
          Rotation complete: {result.data.total} records re-encrypted.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Rotating…" : "Rotate HR encryption"}
      </Button>
    </form>
  );
}
