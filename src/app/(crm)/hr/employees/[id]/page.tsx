import { ArrowLeftIcon, UserRoundCogIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmployeeDocumentList } from "@/components/hr/employee-document-list";
import { EmployeeDocumentUploadForm } from "@/components/hr/employee-document-upload-form";
import { EmployeeProfileForm } from "@/components/hr/employee-profile-form";
import { EmploymentLifecycleForm } from "@/components/hr/employment-lifecycle-form";
import { PrivateDetailsForm } from "@/components/hr/private-details-form";
import { RehireEmployeeForm } from "@/components/hr/rehire-employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import {
  getEmployeeProfileForHr,
  getHrCapabilities,
  listEmployeeDirectory,
  listOrganizationOptions,
} from "@/services/hr";
import { listEmployeeDocuments } from "@/services/hr-documents";
import { allowedEmploymentTransitions, listEmployeeStatusHistory } from "@/services/hr-lifecycle";
import { getEmployeePrivateDetails } from "@/services/hr-private";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  const capabilities = await getHrCapabilities(actor);
  if (!capabilities.includes("hr_admin")) redirect("/hr");

  const [employee, organization, managers, history, privateData, documents] = await Promise.all([
    getEmployeeProfileForHr(id, actor),
    listOrganizationOptions(),
    listEmployeeDirectory(),
    listEmployeeStatusHistory(id, actor),
    getEmployeePrivateDetails(id, actor),
    listEmployeeDocuments(id, actor),
  ]);
  if (!employee) notFound();
  const activeManagers = managers
    .filter((manager) => ["active", "probation", "notice"].includes(manager.employmentStatus ?? ""))
    .map((manager) => ({ userId: manager.userId, name: manager.name }));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <UserRoundCogIcon />
        </span>
        <div>
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700"
          >
            <ArrowLeftIcon className="size-3" /> Employees
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employment profile</CardTitle>
        </CardHeader>
        <CardContent>
          {employee.employmentStatus === "exited" ? (
            <p className="text-sm text-muted-foreground">
              This profile is locked while the employee is exited. Use the rehire workflow below to
              start a new employment period.
            </p>
          ) : (
            <EmployeeProfileForm
              employee={employee}
              departments={organization.departments}
              designations={organization.designations}
              locations={organization.locations}
              managers={activeManagers}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Private employee details</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivateDetailsForm userId={employee.userId} existing={privateData} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employee documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <EmployeeDocumentUploadForm userId={employee.userId} />
          <EmployeeDocumentList documents={documents} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employment lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {employee.employmentStatus === "exited" ? (
            <RehireEmployeeForm
              userId={employee.userId}
              previousJoinDate={employee.joinDate}
              lastWorkingDate={employee.lastWorkingDate}
              managers={activeManagers}
            />
          ) : (
            <EmploymentLifecycleForm
              userId={employee.userId}
              currentStatus={employee.employmentStatus ?? "draft"}
              transitions={allowedEmploymentTransitions(employee.employmentStatus ?? "draft")}
            />
          )}
          <div className="space-y-3 border-t pt-5">
            <h2 className="text-sm font-semibold">Status history</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {entry.fromStatus} → {entry.toStatus}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.effectiveDate} · {entry.reason}
                    </p>
                    {entry.previousJoinDate ? (
                      <p className="text-muted-foreground">
                        Prior join date: {entry.previousJoinDate}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
