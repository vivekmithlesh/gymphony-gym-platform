// =============================================================================
// utr — validation for the UPI reference / bank RRN a payer enters as proof.
// -----------------------------------------------------------------------------
// A UPI UTR (a.k.a. RRN) is canonically a 12-digit number, but some banks/PSPs
// surface a longer 12–22 character alphanumeric reference. We accept that range
// and reject obvious junk (too short, spaces-only, symbols). The DB additionally
// enforces global uniqueness (a UTR can never be submitted twice).
// =============================================================================

export const UTR_REGEX = /^[a-zA-Z0-9]{12,22}$/;

/** Strip whitespace so "4123 4567 8901" validates as "412345678901". */
export const cleanUtr = (value?: string): string => (value || "").replace(/\s+/g, "").trim();

/** True when the value is a plausible UPI UTR / RRN (12–22 alphanumeric). */
export const isValidUtr = (value?: string): boolean => UTR_REGEX.test(cleanUtr(value));
