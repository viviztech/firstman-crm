import { z } from "zod";

/**
 * Form fields submit blank optional inputs as "" rather than omitting them.
 * Normalize "" to undefined before the inner schema runs so `.optional()`
 * behaves as expected instead of failing string validations on an empty value.
 */
export function optionalTrimmed(max?: number) {
  const base = max ? z.string().trim().max(max) : z.string().trim();
  return z.preprocess((value) => (value === "" ? undefined : value), base.optional());
}

export const optionalEmailSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().toLowerCase().email("Enter a valid email").optional(),
);

export const pincodeSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional(),
);

/** Accepts a `datetime-local` input value ("" when cleared) and coerces it to a Date. */
export const optionalDateTime = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.date().optional(),
);

export const optionalUuid = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().uuid("Invalid selection").optional(),
);
