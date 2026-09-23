"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizationFormProps = {
  title: string;
  action: (previous: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  includeLocationFields?: boolean;
};

export function OrganizationForm({ title, action, includeLocationFields }: OrganizationFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${title}-name`}>Name</Label>
          <Input id={`${title}-name`} name="name" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${title}-code`}>Code</Label>
          <Input id={`${title}-code`} name="code" required minLength={2} className="uppercase" />
        </div>
      </div>
      {includeLocationFields ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${title}-address`}>Address</Label>
            <Input id={`${title}-address`} name="address" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${title}-state`}>State</Label>
              <Input id={`${title}-state`} name="state" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${title}-timezone`}>Timezone</Label>
              <Input
                id={`${title}-timezone`}
                name="timezone"
                defaultValue="Asia/Kolkata"
                required
              />
            </div>
          </div>
        </>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-700">{title} created.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : `Add ${title.toLowerCase()}`}
      </Button>
    </form>
  );
}
