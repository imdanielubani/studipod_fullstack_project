import { describe, expect, it } from "vitest";
import { emptyToUndefined, normalizeEmail, normalizeText } from "@/lib/security/sanitize";

describe("normalizeText", () => {
  it("collapses internal whitespace and trims the ends", () => {
    expect(normalizeText("  Ada \t\n  Lovelace  ")).toBe("Ada Lovelace");
  });

  it("replaces control characters with spaces", () => {
    expect(normalizeText("Ada\u0000Lovelace\u001B")).toBe("Ada Lovelace");
  });

  it("removes zero-width, bidi-override and BOM characters", () => {
    expect(normalizeText("A​da ‮Love﻿lace⁦")).toBe("Ada Lovelace");
  });

  it("applies NFKC normalisation to compatibility characters", () => {
    expect(normalizeText("Ｆｕｌｌ Ｗｉｄｔｈ")).toBe("Full Width");
  });

  it("preserves letters from any script", () => {
    expect(normalizeText("  Zoë   O’Brien ")).toBe("Zoë O’Brien");
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases the address", () => {
    expect(normalizeEmail("  Ada.Lovelace@Example.COM ")).toBe("ada.lovelace@example.com");
  });

  it("removes invisible characters that could create look-alike duplicates", () => {
    expect(normalizeEmail("ada​@example.com")).toBe("ada@example.com");
  });

  it("keeps control characters so validation rejects the address", () => {
    expect(normalizeEmail("ada\u0007@example.com")).toContain("\u0007");
  });
});

describe("emptyToUndefined", () => {
  it("maps empty and missing values to undefined", () => {
    expect(emptyToUndefined("")).toBeUndefined();
    expect(emptyToUndefined(undefined)).toBeUndefined();
  });

  it("returns non-empty values unchanged", () => {
    expect(emptyToUndefined("PLAB")).toBe("PLAB");
  });
});
