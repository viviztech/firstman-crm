"use client";

import { useActionState, useEffect, useState } from "react";
import { createServiceVerticalAction, updateServiceVerticalAction } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceVertical = { id: string; name: string; sort: number };

export function VerticalFormDialog({ vertical }: { vertical?: ServiceVertical }) {
  const [open, setOpen] = useState(false);
  const action = vertical
    ? updateServiceVerticalAction.bind(null, vertical.id)
    : createServiceVerticalAction;
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={vertical ? "outline" : "default"} size="sm" />}>
        {vertical ? "Edit" : "New vertical"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vertical ? "Edit vertical" : "New vertical"}</DialogTitle>
          <DialogDescription>
            Verticals are the top-level grouping on the catalog page — each contains one or more
            categories.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vertical-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="vertical-name" name="name" required defaultValue={vertical?.name ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vertical-sort">Sort order</Label>
            <Input
              id="vertical-sort"
              name="sort"
              type="number"
              defaultValue={vertical?.sort ?? 0}
            />
          </div>

          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
