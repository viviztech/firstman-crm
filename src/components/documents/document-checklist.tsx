import {
  DocumentChecklistItem,
  type DocumentChecklistItemData,
} from "@/components/documents/document-checklist-item";
import { cn } from "@/lib/utils";

export function DocumentChecklist({
  documents,
  canManage,
}: {
  documents: DocumentChecklistItemData[];
  canManage: boolean;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents on file.</p>;
  }

  const verifiedCount = documents.filter((document) => document.status === "verified").length;
  const percentVerified = Math.round((verifiedCount / documents.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {verifiedCount} of {documents.length} documents verified
          </span>
          <span className="font-medium">{percentVerified}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              percentVerified === 100 ? "bg-green-500" : "bg-amber-500",
            )}
            style={{ width: `${percentVerified}%` }}
          />
        </div>
      </div>
      {documents.map((document) => (
        <DocumentChecklistItem key={document.id} document={document} canManage={canManage} />
      ))}
    </div>
  );
}
