import {
  DocumentChecklistItem,
  type DocumentChecklistItemData,
} from "@/components/documents/document-checklist-item";

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

  return (
    <div className="flex flex-col gap-2">
      {documents.map((document) => (
        <DocumentChecklistItem key={document.id} document={document} canManage={canManage} />
      ))}
    </div>
  );
}
