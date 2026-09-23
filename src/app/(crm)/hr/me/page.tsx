import { CircleUserRoundIcon } from "lucide-react";
import { EmployeeDocumentList } from "@/components/hr/employee-document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getEmployeeSelfProfile } from "@/services/hr";
import { getOwnEmployeeBankAccount } from "@/services/hr-bank";
import { listEmployeeDocuments } from "@/services/hr-documents";
import { getEmployeePrivateDetails } from "@/services/hr-private";
import { getOwnEmployeeStatutoryDetails } from "@/services/hr-statutory";

export default async function MyHrProfilePage() {
  const user = await requireUser();
  const [profile, privateData, bankAccount, documents, statutory] = await Promise.all([
    getEmployeeSelfProfile(user.id),
    getEmployeePrivateDetails(user.id, user),
    getOwnEmployeeBankAccount(user),
    listEmployeeDocuments(user.id, user),
    getOwnEmployeeStatutoryDetails(user),
  ]);
  const details = [
    ["Employee code", profile?.employeeCode],
    ["Legal name", profile?.legalName],
    ["Work email", profile?.email],
    ["Personal email", profile?.personalEmail],
    ["Phone", profile?.phone],
    ["Department", profile?.departmentName],
    ["Designation", profile?.designationName],
    ["Location", profile?.locationName],
    ["Employment status", profile?.employmentStatus],
    ["Employment category", profile?.employmentCategory],
    ["Join date", profile?.joinDate],
    ["Confirmation date", profile?.confirmationDate],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <CircleUserRoundIcon />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My HR profile</h1>
          <p className="text-sm text-muted-foreground">Your employment information on record.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{profile?.name ?? user.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium">{value || "Not set"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      {privateData?.details || privateData?.emergencyContacts.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Private details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {privateData.details?.dateOfBirth ? (
              <p>Date of birth: {privateData.details.dateOfBirth}</p>
            ) : null}
            {privateData.details?.residentialAddress ? (
              <p>Residential address: {privateData.details.residentialAddress}</p>
            ) : null}
            {privateData.emergencyContacts.map((contact) => (
              <p key={contact.id}>
                Emergency contact: {contact.name} ({contact.relationship}) · {contact.phone}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {bankAccount ? (
        <Card>
          <CardHeader>
            <CardTitle>Bank account on file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{bankAccount.accountHolderName}</p>
            <p>Account number: {bankAccount.accountNumber}</p>
            <p>IFSC: {bankAccount.ifsc}</p>
          </CardContent>
        </Card>
      ) : null}
      {statutory ? (
        <Card>
          <CardHeader>
            <CardTitle>My statutory details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>PAN: {statutory.pan || "Not set"}</p>
            <p>UAN: {statutory.uan || "Not set"}</p>
            <p>ESI: {statutory.esiNumber || "Not set"}</p>
            <p>Aadhaar last four: {statutory.aadhaarLastFour || "Not set"}</p>
            <p>PF eligible: {statutory.pfEligible ? "Yes" : "No"}</p>
            <p>ESI eligible: {statutory.esiEligible ? "Yes" : "No"}</p>
            <p>Professional tax eligible: {statutory.professionalTaxEligible ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>My documents</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeDocumentList documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}
