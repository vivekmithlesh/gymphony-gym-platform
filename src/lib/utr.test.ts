import { describe, it, expect } from "vitest";
import { isValidUtr, cleanUtr } from "@/lib/utr";

describe("cleanUtr", () => {
  it("strips whitespace", () => {
    expect(cleanUtr("4123 4567 8901")).toBe("412345678901");
    expect(cleanUtr("  abc123def456  ")).toBe("abc123def456");
    expect(cleanUtr(undefined)).toBe("");
  });
});

describe("isValidUtr", () => {
  it("accepts a canonical 12-digit UPI UTR (incl. spaced input)", () => {
    expect(isValidUtr("412345678901")).toBe(true);
    expect(isValidUtr("4123 4567 8901")).toBe(true);
  });

  it("accepts longer 12–22 char alphanumeric bank references", () => {
    expect(isValidUtr("ABCD1234EFGH5678")).toBe(true);
    expect(isValidUtr("a1b2c3d4e5f6g7h8i9j0")).toBe(true); // 20 chars
  });

  it("rejects too-short, too-long, empty, or symbol-laden input", () => {
    expect(isValidUtr("12345")).toBe(false); // too short
    expect(isValidUtr("1234567890123456789012345")).toBe(false); // >22
    expect(isValidUtr("4123-4567-8901")).toBe(false); // dashes
    expect(isValidUtr("412345678901!")).toBe(false); // symbol
    expect(isValidUtr("")).toBe(false);
    expect(isValidUtr(undefined)).toBe(false);
  });
});
