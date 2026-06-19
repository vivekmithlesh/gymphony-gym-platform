// =============================================================================
// utr — validation for the UPI reference / bank RRN a payer enters as proof.
// -----------------------------------------------------------------------------
// A UPI UTR (a.k.a. RRN) is a number — canonically 12 digits, with some banks/PSPs
// surfacing a longer 12–22 digit reference. We accept DIGITS ONLY (letters and
// symbols are rejected) so the field can't take junk; inputs also strip
// non-digits as you type. The DB additionally enforces global uniqueness (a UTR
// can never be submitted twice).
// =============================================================================

export const UTR_REGEX = /^[0-9]{12,22}$/;

/** Strip whitespace so "4123 4567 8901" validates as "412345678901". */
export const cleanUtr = (value?: string): string => (value || "").replace(/\s+/g, "").trim();

/** True when the value is a plausible UPI UTR / RRN (12–22 digits, numbers only). */
export const isValidUtr = (value?: string): boolean => UTR_REGEX.test(cleanUtr(value));

/** Keep only digits — for filtering UTR inputs so letters can't be typed. */
export const digitsOnly = (value?: string): string => (value || "").replace(/\D/g, "");
