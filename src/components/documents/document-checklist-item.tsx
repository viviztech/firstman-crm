"use client";

import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, ComponentType } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { rejectDocumentAction, verifyDocumentAction } from "@/actions/documents";
import { STAT_COLOR_CLASSES } from "@/components/dashboard/dashboard-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_STATUS_BADGE,
  DOCUMENT_STATUS_STAT_COLOR,
  type DocumentStatus,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

const DOCUMENT_STATUS_ICON: Record<DocumentStatus, ComponentType<{ className?: string }>> = {
  pending: CircleDashed,
  received: Clock,
  verified: CheckCircle2,
  rejected: AlertCircle,
};

export type DocumentChecklistItemData = {
  id: string;
  label: string;
  status: DocumentStatus;
  fileName: string | null;
  rejectReason: string | null;
  downloadUrl: string | null;
};

export function DocumentChecklistItem({
  document,
  canManage,
}: {
  document: DocumentChecklistItemData;
  canManage: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/documents/${document.id}/file`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Upload failed" }));
        toast.error(body.error ?? "Upload failed");
        return;
      }
      toast.success("File uploaded");
      router.refresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyDocumentAction(document.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) return;
    setRejectOpen(false);
    setRejectReason("");
    startTransition(async () => {
      const result = await rejectDocumentAction(document.id, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const { label: statusLabel, className: statusClassName } = DOCUMENT_STATUS_BADGE[document.status];
  const busy = isUploading || isPending;
  const colors = STAT_COLOR_CLASSES[DOCUMENT_STATUS_STAT_COLOR[document.status]];
  const Icon = DOCUMENT_STATUS_ICON[document.status];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-l-4 p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        colors.border,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
            colors.chip,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{document.label}</span>
          {document.status === "rejected" && document.rejectReason ? (
            <span className="text-xs text-destructive">Rejected: {document.rejectReason}</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn(statusClassName)}>{statusLabel}</Badge>
        {document.downloadUrl ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={document.downloadUrl} target="_blank" rel="noreferrer" />}
          >
            Download
          </Button>
        ) : null}
        {canManage ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading…" : document.fileName ? "Replace" : "Upload"}
            </Button>
            {document.status === "received" ? (
              <>
                <Button size="sm" disabled={busy} onClick={handleVerify}>
                  Verify
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {document.label}?</DialogTitle>
            <DialogDescription>This reason is saved with the document.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="e.g. Blurry scan, please re-upload"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
