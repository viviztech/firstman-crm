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

// Quote PDF links go out over email/WhatsApp the same way invoice PDFs do (spec 4.8 extension,
// ADR 0010) — same long-lived window and the same "distinct prefix" reasoning as above.
const QUOTE_PDF_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function createQuotePdfToken(quoteId: string): string {
  const expiresAt = Date.now() + QUOTE_PDF_EXPIRY_MS;
  const signature = sign(`quote:${quoteId}.${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

/** Relative URL for the quote PDF route handler, ready to drop into an <a href> or send externally. */
export function getQuotePdfUrl(quoteId: string): string {
  return `/api/quotes/${quoteId}/pdf?token=${createQuotePdfToken(quoteId)}`;
}

export function verifyQuotePdfToken(quoteId: string, token: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = Buffer.from(sign(`quote:${quoteId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// The client-facing "Approve / Request changes" page, linked from the quote email and WhatsApp
// message — same long-lived window as the quote PDF link above (a client may sit on a quote for
// weeks before responding), with its own "quote-response:" prefix so a leaked PDF token can never
// be replayed against the response action, and vice versa.
const QUOTE_RESPONSE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function createQuoteResponseToken(quoteId: string): string {
  const expiresAt = Date.now() + QUOTE_RESPONSE_EXPIRY_MS;
  const signature = sign(`quote-response:${quoteId}.${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

/** Relative URL for the public quote-response page, ready to drop into an <a href> or send externally. */
export function getQuoteResponseUrl(quoteId: string): string {
  return `/quotes/${quoteId}/respond?token=${createQuoteResponseToken(quoteId)}`;
}

export function verifyQuoteResponseToken(quoteId: string, token: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = Buffer.from(sign(`quote-response:${quoteId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
