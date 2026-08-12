"use client";

import { useActionState, useEffect, useState } from "react";
import { createServiceCategoryAction, updateServiceCategoryAction } from "@/actions/catalog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ServiceCategory = { id: string; name: string; sort: number; verticalId: string };
type VerticalOption = { id: string; name: string };

export function CategoryFormDialog({
  category,
  verticals,
  defaultVerticalId,
}: {
  category?: ServiceCategory;
  verticals: VerticalOption[];
  defaultVerticalId?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = category
    ? updateServiceCategoryAction.bind(null, category.id)
    : createServiceCategoryAction;
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={category ? "outline" : "default"} size="sm" />}>
        {category ? "Edit" : "New category"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories group services on the catalog page.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-vertical">
              Vertical <span className="text-destructive">*</span>
            </Label>
            <Select
              name="verticalId"
              defaultValue={category?.verticalId ?? defaultVerticalId}
              items={verticals.map((vertical) => ({ value: vertical.id, label: vertical.name }))}
            >
              <SelectTrigger id="category-vertical" className="w-full">
                <SelectValue placeholder="Choose a vertical" />
              </SelectTrigger>
              <SelectContent>
                {verticals.map((vertical) => (
                  <SelectItem key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="category-name" name="name" required defaultValue={category?.name ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-sort">Sort order</Label>
            <Input
              id="category-sort"
              name="sort"
              type="number"
              defaultValue={category?.sort ?? 0}
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
