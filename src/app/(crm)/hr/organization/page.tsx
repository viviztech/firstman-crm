import { Building2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import {
  createDepartmentAction,
  createDesignationAction,
  createWorkLocationAction,
} from "@/actions/hr";
import { OrganizationForm } from "@/components/hr/organization-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getHrCapabilities, listOrganizationOptions } from "@/services/hr";

export default async function HrOrganizationPage() {
  const actor = await requireUser();
  const capabilities = await getHrCapabilities(actor);
  if (!capabilities.includes("hr_admin")) redirect("/hr");
  const organization = await listOrganizationOptions();

  const sections = [
    { title: "Department", rows: organization.departments, action: createDepartmentAction },
    { title: "Designation", rows: organization.designations, action: createDesignationAction },
    {
      title: "Work location",
      rows: organization.locations,
      action: createWorkLocationAction,
      location: true,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Building2Icon />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Departments, designations, and work locations used by employee records.
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}s</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <OrganizationForm
                title={section.title}
                action={section.action}
                includeLocationFields={section.location}
              />
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {section.rows.length ? (
                  section.rows.map((row) => (
                    <Badge key={row.id} variant="secondary">
                      {row.name} · {row.code}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">None configured yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
