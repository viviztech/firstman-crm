import type { employeeDocumentTypeEnum } from "@/db/schema/hr-documents";

const TYPE_LABELS: Record<(typeof employeeDocumentTypeEnum.enumValues)[number], string> = {
  offer_letter: "Offer letter",
  appointment_letter: "Appointment letter",
  employment_contract: "Employment contract",
  identity_proof: "Identity proof",
  address_proof: "Address proof",
  certificate: "Certificate",
  other: "Other",
};

type DocumentRow = {
  id: string;
  type: keyof typeof TYPE_LABELS;
  label: string;
  sizeBytes: number;
  expiryDate: string | null;
};

export function EmployeeDocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0)
    return <p className="text-sm text-muted-foreground">No documents on file.</p>;
  return (
    <ul className="divide-y">
      {documents.map((document) => (
        <li
          key={document.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{document.label}</p>
            <p className="text-muted-foreground">
              {TYPE_LABELS[document.type]} · {Math.ceil(document.sizeBytes / 1024)} KB
              {document.expiryDate ? ` · Expires ${document.expiryDate}` : ""}
            </p>
          </div>
          <a
            className="font-medium text-sky-700 hover:underline"
            href={`/api/hr/documents/${document.id}/download`}
          >
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}
