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
