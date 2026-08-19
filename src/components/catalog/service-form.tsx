"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { ActionResult } from "@/actions/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recurrenceEnum, serviceRelationTypeEnum } from "@/db/schema/catalog";
import { SERVICE_RECURRENCE_LABEL, SERVICE_RELATION_TYPE_LABEL } from "@/lib/badges";

type CategoryOption = { id: string; name: string; verticalName: string };
type ServiceOption = { id: string; name: string };
type RelationType = (typeof serviceRelationTypeEnum.enumValues)[number];

// Client-only `key` fields give these dynamic rows a stable React key that survives
// add/remove without index-shifting issues; stripped back out before serializing to the
// hidden JSON inputs the server actually parses.
type ChecklistRow = { key: string; title: string; dayOffset: number };
type DocumentRow = { key: string; value: string };
type RelationRow = { key: string; relatedServiceId: string; relationType: RelationType };

export type ServiceFormDefaults = {
  categoryId?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  basePricePaise?: number;
  govtFeePaise?: number | null;
  estimatedDays?: number;
  isRecurring?: boolean;
  recurrence?: string | null;
  checklistTemplate?: { title: string; dayOffset: number }[];
  requiredDocuments?: string[];
};

export function ServiceForm<T extends { id: string } | undefined>({
  action,
  categories,
  otherServices,
  defaultValues,
  defaultRelations,
  submitLabel,
}: {
  action: (prev: ActionResult<T> | undefined, formData: FormData) => Promise<ActionResult<T>>;
  categories: CategoryOption[];
  otherServices: ServiceOption[];
  defaultValues?: ServiceFormDefaults;
  defaultRelations?: { relatedServiceId: string; relationType: RelationType }[];
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  const [isRecurring, setIsRecurring] = useState(defaultValues?.isRecurring ?? false);
  const [checklist, setChecklist] = useState<ChecklistRow[]>(() =>
    (defaultValues?.checklistTemplate ?? []).map((item) => ({
      key: crypto.randomUUID(),
      ...item,
    })),
  );
  const [documents, setDocuments] = useState<DocumentRow[]>(() =>
    (defaultValues?.requiredDocuments ?? []).map((value) => ({ key: crypto.randomUUID(), value })),
  );
  const [relations, setRelations] = useState<RelationRow[]>(() =>
    (defaultRelations ?? []).map((relation) => ({ key: crypto.randomUUID(), ...relation })),
  );

  useEffect(() => {
    if (state?.ok) router.push("/catalog");
  }, [state, router]);

  function addChecklistRow() {
    setChecklist((prev) => [...prev, { key: crypto.randomUUID(), title: "", dayOffset: 0 }]);
  }
  function updateChecklistRow(key: string, patch: Partial<ChecklistRow>) {
    setChecklist((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function removeChecklistRow(key: string) {
    setChecklist((prev) => prev.filter((item) => item.key !== key));
  }

  function addDocumentRow() {
    setDocuments((prev) => [...prev, { key: crypto.randomUUID(), value: "" }]);
  }
  function updateDocumentRow(key: string, value: string) {
    setDocuments((prev) => prev.map((item) => (item.key === key ? { ...item, value } : item)));
  }
  function removeDocumentRow(key: string) {
    setDocuments((prev) => prev.filter((item) => item.key !== key));
  }

  function addRelationRow() {
    const firstOther = otherServices.find(
      (service) => !relations.some((relation) => relation.relatedServiceId === service.id),
    );
    if (!firstOther) return;
    setRelations((prev) => [
      ...prev,
      { key: crypto.randomUUID(), relatedServiceId: firstOther.id, relationType: "upsell" },
    ]);
  }
  function updateRelationRow(key: string, patch: Partial<RelationRow>) {
    setRelations((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function removeRelationRow(key: string) {
    setRelations((prev) => prev.filter((item) => item.key !== key));
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="isRecurring" value={isRecurring ? "true" : "false"} />
      <input
        type="hidden"
        name="checklistTemplate"
        value={JSON.stringify(checklist.map(({ title, dayOffset }) => ({ title, dayOffset })))}
      />
      <input
        type="hidden"
        name="requiredDocuments"
        value={JSON.stringify(
          documents.map((doc) => doc.value).filter((value) => value.trim().length > 0),
        )}
      />
      <input
        type="hidden"
        name="serviceRelations"
        value={JSON.stringify(
          relations.map(({ relatedServiceId, relationType }) => ({
            relatedServiceId,
            relationType,
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="pvt-ltd-registration"
            defaultValue={defaultValues?.slug ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="categoryId">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          name="categoryId"
          defaultValue={defaultValues?.categoryId}
          items={categories.map((category) => ({
            value: category.id,
            label: `${category.verticalName} / ${category.name}`,
          }))}
        >
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.verticalName} / {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="basePricePaise">
            Base price (₹) <span className="text-destructive">*</span>
          </Label>
          <MoneyInput
            id="basePricePaise"
            name="basePricePaise"
            required
            defaultValuePaise={defaultValues?.basePricePaise}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="govtFeePaise">Govt. fee (₹)</Label>
          <MoneyInput
            id="govtFeePaise"
            name="govtFeePaise"
            defaultValuePaise={defaultValues?.govtFeePaise}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimatedDays">
            Estimated days <span className="text-destructive">*</span>
          </Label>
          <Input
            id="estimatedDays"
            name="estimatedDays"
            type="number"
            min={1}
            required
            defaultValue={defaultValues?.estimatedDays ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isRecurringToggle"
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked === true)}
          />
          <Label htmlFor="isRecurringToggle" className="font-normal">
            Recurring service
          </Label>
        </div>
        {isRecurring ? (
          <Select
            name="recurrence"
            defaultValue={defaultValues?.recurrence ?? "yearly"}
            items={recurrenceEnum.enumValues.map((value) => ({
              value,
              label: SERVICE_RECURRENCE_LABEL[value],
            }))}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recurrenceEnum.enumValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {SERVICE_RECURRENCE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">Task checklist</span>
        <p className="text-xs text-muted-foreground">
          Generated as order tasks when an order is created for this service.
        </p>
        {checklist.map((item) => (
          <div key={item.key} className="flex gap-2">
            <Input
              placeholder="Task title"
              value={item.title}
              onChange={(e) => updateChecklistRow(item.key, { title: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              placeholder="Day offset"
              value={item.dayOffset}
              onChange={(e) => updateChecklistRow(item.key, { dayOffset: Number(e.target.value) })}
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeChecklistRow(item.key)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={addChecklistRow}
        >
          Add task
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">Required documents</span>
        {documents.map((doc) => (
          <div key={doc.key} className="flex gap-2">
            <Input
              placeholder="Document label"
              value={doc.value}
              onChange={(e) => updateDocumentRow(doc.key, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeDocumentRow(doc.key)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={addDocumentRow}
        >
          Add document
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">Related services</span>
        <p className="text-xs text-muted-foreground">
          Surfaced as a suggestion on orders for this service.
        </p>
        {relations.map((relation) => (
          <div key={relation.key} className="flex gap-2">
            <Select
              value={relation.relatedServiceId}
              onValueChange={(value) =>
                value && updateRelationRow(relation.key, { relatedServiceId: value })
              }
              items={otherServices.map((service) => ({ value: service.id, label: service.name }))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {otherServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={relation.relationType}
              onValueChange={(value) =>
                value && updateRelationRow(relation.key, { relationType: value as RelationType })
              }
              items={serviceRelationTypeEnum.enumValues.map((value) => ({
                value,
                label: SERVICE_RELATION_TYPE_LABEL[value],
              }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceRelationTypeEnum.enumValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SERVICE_RELATION_TYPE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRelationRow(relation.key)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={addRelationRow}
          disabled={otherServices.length === 0}
        >
          Add related service
        </Button>
      </div>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
