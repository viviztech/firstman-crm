import { z } from "zod";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const optionalGstinSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().toUpperCase().regex(GSTIN_REGEX, "Enter a valid 15-character GSTIN").optional(),
);

export const optionalPanSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().toUpperCase().regex(PAN_REGEX, "Enter a valid 10-character PAN").optional(),
);
