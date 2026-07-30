export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (spec 4.5)

export type DetectedFileKind = "pdf" | "jpg" | "png" | "docx";

const KIND_MIME: Record<DetectedFileKind, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const KIND_EXTENSION: Record<DetectedFileKind, string> = {
  pdf: "pdf",
  jpg: "jpg",
  png: "png",
  docx: "docx",
};

function matchesSignature(buffer: Buffer, offset: number, signature: number[]): boolean {
  if (buffer.length < offset + signature.length) return false;
  return signature.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Identifies a file by its magic bytes, never by client-supplied extension or MIME type
 * (spec 4.5: "validated server-side by magic bytes not extension"). DOCX is detected as a
 * ZIP container (PK\x03\x04) — the same signature as other OOXML/ZIP formats, which is an
 * accepted limitation for a first pass; a full OOXML content-type check can follow later.
 */
export function detectFileKind(buffer: Buffer): DetectedFileKind | null {
  if (matchesSignature(buffer, 0, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (matchesSignature(buffer, 0, [0xff, 0xd8, 0xff])) return "jpg";
  if (matchesSignature(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (matchesSignature(buffer, 0, [0x50, 0x4b, 0x03, 0x04])) return "docx"; // ZIP/OOXML
  return null;
}

export function mimeTypeForKind(kind: DetectedFileKind): string {
  return KIND_MIME[kind];
}

export function extensionForKind(kind: DetectedFileKind): string {
  return KIND_EXTENSION[kind];
}
