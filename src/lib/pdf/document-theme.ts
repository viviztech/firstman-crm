import { StyleSheet } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import { env } from "@/lib/env";

/**
 * Shared brand system for every printed document (quotation, proforma/tax invoice, and any
 * future one) — one place to keep FirstMan's document look consistent, since these are the only
 * PDFs a client ever sees.
 */
export const BRAND = "#ba2a66";
export const BRAND_DEEP = "#29292d";
export const BRAND_INK = "#58585b";
export const BRAND_MUTED = "#f9e4ed";
export const BORDER = "#e3dfe1";
export const ROW_ALT = "#faf7f8";

/** The brand mark shown next to the company name — drawn as a vector badge (View + Text) rather
 *  than the PNG favicon: @react-pdf/renderer's raster image decoder (tested against the installed
 *  4.5.1 under Node 24, both locally and in the Dockerfile's node:24-alpine) corrupts every PNG/JPEG
 *  source it's given — even a trivial solid-color PNG comes out solid black — so embedding the real
 *  favicon file would ship a broken image into a client-facing document. Revisit once that's fixed
 *  upstream (github.com/diegomura/react-pdf) or the dependency is pinned to a working version. */
export const BRAND_INITIAL = "F";

export function formatPdfDate(date: Date): string {
  return formatInTimeZone(date, env.TZ_DISPLAY, "d MMM yyyy");
}

/**
 * The full visual scaffold shared by every document: brand header, doc-info badge, two-up info
 * boxes, line-items table, totals/amount-in-words row, terms & conditions, and signature footer.
 * Documents only supply their own titles, labels, and body content against these classes.
 */
export const documentStyles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: BRAND_DEEP,
  },
  topBar: { height: 6, backgroundColor: BRAND, marginBottom: 22 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  brandBadgeText: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  brandWordmark: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DEEP,
    letterSpacing: 0.3,
    maxWidth: 260,
  },
  brandTagline: { fontSize: 8, color: BRAND, marginTop: 2, letterSpacing: 1.2 },
  companyMeta: { fontSize: 8, color: BRAND_INK, marginTop: 6, lineHeight: 1.5, maxWidth: 240 },

  docBadge: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "flex-end",
  },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 1 },
  docMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 190,
    marginTop: 5,
  },
  docMetaLabel: { fontSize: 8, color: BRAND_INK },
  docMetaValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },

  disclaimer: {
    marginTop: 16,
    fontSize: 8,
    color: BRAND_INK,
    backgroundColor: BRAND_MUTED,
    padding: 8,
    borderRadius: 3,
    lineHeight: 1.4,
  },

  infoRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
  },
  infoLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  infoName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },
  infoLine: { fontSize: 8.5, color: BRAND_INK, marginTop: 2 },

  table: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHeaderRow: { flexDirection: "row", backgroundColor: BRAND_DEEP, paddingVertical: 7 },
  headerCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cell: { fontSize: 8.8, color: BRAND_DEEP },
  cellMuted: { fontSize: 8, color: BRAND_INK },
  colIndex: { width: "6%", paddingLeft: 8 },
  colDescription: { width: "36%", paddingRight: 6 },
  colQty: { width: "9%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colGst: { width: "11%", textAlign: "right" },
  colAmount: { width: "22%", textAlign: "right", paddingRight: 8 },

  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  wordsBox: {
    flex: 1,
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 10,
    justifyContent: "center",
  },
  wordsLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  wordsText: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: BRAND_DEEP, lineHeight: 1.4 },

  totalsBox: { width: 210, borderWidth: 1, borderColor: BORDER, borderRadius: 3 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  totalsLabel: { fontSize: 8.5, color: BRAND_INK },
  totalsValue: { fontSize: 8.5, color: BRAND_DEEP },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND_MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },
  grandTotalValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BRAND },

  termsSection: { marginTop: 20 },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  termsColumns: { flexDirection: "row", gap: 16 },
  termsColumn: { flex: 1 },
  termRow: { flexDirection: "row", marginBottom: 4 },
  termBullet: { fontSize: 7.5, color: BRAND, width: 12 },
  termText: { fontSize: 7.5, color: BRAND_INK, flex: 1, lineHeight: 1.35 },

  footer: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerNote: { fontSize: 7.5, color: BRAND_INK, maxWidth: 260, lineHeight: 1.4 },
  signatureBlock: { alignItems: "center" },
  signatureFor: { fontSize: 8, color: BRAND_INK },
  signatureLine: {
    marginTop: 26,
    width: 140,
    borderTopWidth: 1,
    borderTopColor: BRAND_INK,
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 8, color: BRAND_DEEP, textAlign: "center" },

  pageFooterRule: { marginTop: 18, borderTopWidth: 1, borderTopColor: BORDER },
  pageFooterText: {
    marginTop: 6,
    fontSize: 7,
    color: BRAND_INK,
    textAlign: "center",
  },
});
