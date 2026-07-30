import type { documentKindEnum } from "@/db/schema/documents";

export type DocumentKind = (typeof documentKindEnum.enumValues)[number];

const PATTERNS: [RegExp, DocumentKind][] = [
  [/pan card/i, "pan_card"],
  [/aadhaar/i, "aadhaar"],
  [/photo/i, "photo"],
  [/address proof|noc/i, "address_proof"],
  [/\bmoa\b|\baoa\b/i, "moa_aoa"],
  [/certificate/i, "certificate"],
];

/** Best-effort classification of a catalog service's free-text requiredDocuments entry. */
export function inferDocumentKind(label: string): DocumentKind {
  for (const [pattern, kind] of PATTERNS) {
    if (pattern.test(label)) return kind;
  }
  return "other";
}
