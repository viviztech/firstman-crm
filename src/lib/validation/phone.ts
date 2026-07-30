import { z } from "zod";

const INDIAN_MOBILE_LOCAL = /^[6-9]\d{9}$/;

/** Strips a country-code/trunk prefix and returns the bare 10-digit local number, or null if invalid. */
function toLocalDigits(value: string): string | null {
  let digits = value;
  if (digits.startsWith("+91")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return INDIAN_MOBILE_LOCAL.test(digits) ? digits : null;
}

/** Accepts a bare 10-digit Indian mobile number or one prefixed with +91/91/0, normalizes to +91XXXXXXXXXX. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => toLocalDigits(value) !== null, {
    message: "Enter a valid 10-digit Indian mobile number",
  })
  .transform((value) => `+91${toLocalDigits(value)}`);
