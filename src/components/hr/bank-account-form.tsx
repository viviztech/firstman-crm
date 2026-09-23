"use client";

import { useActionState } from "react";
import { saveEmployeeBankAccountAction } from "@/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BankAccountForm({
  userId,
  existing,
}: {
  userId: string;
  existing: { accountHolderName: string; ifsc: string; maskedAccountNumber: string } | null;
}) {
  const [result, action, pending] = useActionState(
    saveEmployeeBankAccountAction.bind(null, userId),
    undefined,
  );
  return (
    <form action={action} className="space-y-4">
      {existing ? (
        <p className="text-sm text-muted-foreground">
          Account on file: {existing.maskedAccountNumber}. The full number is never displayed.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="accountHolderName">Account holder name</Label>
        <Input
          id="accountHolderName"
          name="accountHolderName"
          required
          maxLength={200}
          defaultValue={existing?.accountHolderName ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountNumber">Account number</Label>
        <Input
          id="accountNumber"
          name="accountNumber"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          minLength={9}
          maxLength={18}
          required={!existing}
          aria-describedby="accountNumberHint"
        />
        <p id="accountNumberHint" className="text-xs text-muted-foreground">
          {existing
            ? "Leave blank to retain the current number. Enter a new number to replace it."
            : "Enter a 9–18 digit account number."}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ifsc">IFSC</Label>
        <Input
          id="ifsc"
          name="ifsc"
          required
          maxLength={11}
          defaultValue={existing?.ifsc ?? ""}
          autoCapitalize="characters"
        />
      </div>
      {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result?.ok ? <p className="text-sm text-emerald-700">Bank details saved.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save bank details"}
      </Button>
    </form>
  );
}
