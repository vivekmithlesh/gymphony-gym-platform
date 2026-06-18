import { describe, it, expect } from "vitest";
import { isValidUtr, cleanUtr, digitsOnly } from "@/lib/utr";

describe("cleanUtr", () => {
  it("strips whitespace", () => {
    expect(cleanUtr("4123 4567 8901")).toBe("412345678901");
    expect(cleanUtr("  123456789012  ")).toBe("123456789012");
    expect(cleanUtr(undefined)).toBe("");
  });
});

describe("digitsOnly", () => {
  it("keeps only digits", () => {
    expect(digitsOnly("4123 4567 8901")).toBe("412345678901");
    expect(digitsOnly("abc123def456")).toBe("123456");
    expect(digitsOnly("412345678901!")).toBe("412345678901");
    expect(digitsOnly(undefined)).toBe("");
  });
});

describe("isValidUtr", () => {
  it("accepts a canonical 12-digit UPI UTR (incl. spaced input)", () => {
    expect(isValidUtr("412345678901")).toBe(true);
    expect(isValidUtr("4123 4567 8901")).toBe(true);
  });

  it("accepts longer 12–22 digit bank references", () => {
    expect(isValidUtr("1234567890123456")).toBe(true); // 16 digits
    expect(isValidUtr("12345678901234567890")).toBe(true); // 20 digits
  });

  it("rejects letters — UTR is numbers only", () => {
    expect(isValidUtr("ABCD1234EFGH5678")).toBe(false);
    expect(isValidUtr("a1b2c3d4e5f6g7h8i9j0")).toBe(false);
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
