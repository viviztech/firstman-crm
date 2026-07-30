import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const EXPIRY_MS = 5 * 60 * 1000; // short-lived signed URLs (spec 4.5)

function sign(payload: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("hex");
}

/** Token format: "<expiresAtMs>.<hmacHex>", scoped to a single documentId. */
export function createDownloadToken(documentId: string): string {
  const expiresAt = Date.now() + EXPIRY_MS;
  const signature = sign(`${documentId}.${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

/** Relative URL for the download route handler, ready to drop into an <a href>. */
export function getDocumentDownloadUrl(documentId: string): string {
  return `/api/documents/${documentId}/download?token=${createDownloadToken(documentId)}`;
}

export function verifyDownloadToken(documentId: string, token: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = Buffer.from(sign(`${documentId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// Invoice PDF links go out over email/WhatsApp to recipients with no CRM session at all (spec 4.7),
// so they need a much longer window than the in-app document download token above, and a distinct
// "invoice:" prefix so a leaked document token can never be replayed against the invoice route.
const INVOICE_PDF_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function createInvoicePdfToken(invoiceId: string): string {
  const expiresAt = Date.now() + INVOICE_PDF_EXPIRY_MS;
  const signature = sign(`invoice:${invoiceId}.${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

/** Relative URL for the invoice PDF route handler, ready to drop into an <a href> or send externally. */
export function getInvoicePdfUrl(invoiceId: string): string {
  return `/api/invoices/${invoiceId}/pdf?token=${createInvoicePdfToken(invoiceId)}`;
}

export function verifyInvoicePdfToken(invoiceId: string, token: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = Buffer.from(sign(`invoice:${invoiceId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
