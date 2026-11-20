import { describe, expect, it } from "vitest";
import { parseWaitlistRequest } from "@/lib/validations/waitlist.schema";

const valid = { fullName: "Ada Lovelace", email: "ada@example.com" };

function expectFieldError(input: unknown, field: "fullName" | "email" | "examinationCategory") {
  const result = parseWaitlistRequest(input);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.fieldErrors[field]).toBeTruthy();
}

describe("parseWaitlistRequest", () => {
  it("accepts a valid registration and normalises every field", () => {
    const result = parseWaitlistRequest({
      fullName: "  Ada   Lovelace ",
      email: "  ADA@Example.com ",
      examinationCategory: "  PLAB   1 ",
    });

    expect(result).toEqual({
      success: true,
      data: { fullName: "Ada Lovelace", email: "ada@example.com", examinationCategory: "PLAB 1" },
    });
  });

  it("treats a blank category as not provided", () => {
    const result = parseWaitlistRequest({ ...valid, examinationCategory: "   " });
    expect(result.success && result.data.examinationCategory).toBeUndefined();
  });

  it.each(["Zoë O’Brien-Smith", "José María", "Nguyễn Thị Minh", "李小龍", "Dr. A. Okafor"])(
    "accepts the international name %s",
    (fullName) => {
      expect(parseWaitlistRequest({ ...valid, fullName }).success).toBe(true);
    },
  );

  it.each(["plainaddress", "ada@", "@example.com", "ada lovelace@example.com", "ada@example"])(
    "rejects the malformed email %s",
    (email) => expectFieldError({ ...valid, email }, "email"),
  );

  it("rejects email addresses containing control characters", () => {
    expectFieldError({ ...valid, email: "ada\u0007@example.com" }, "email");
  });

  it("rejects markup and script-like content in names", () => {
    expectFieldError({ ...valid, fullName: "<script>alert(1)</script>" }, "fullName");
  });

  it("enforces name length limits", () => {
    expectFieldError({ ...valid, fullName: "A" }, "fullName");
    expectFieldError({ ...valid, fullName: "a".repeat(101) }, "fullName");
  });

  it("enforces the email length limit", () => {
    expectFieldError({ ...valid, email: `${"a".repeat(250)}@example.com` }, "email");
  });

  it("rejects oversized raw input before normalising it", () => {
    expectFieldError({ ...valid, fullName: `${" ".repeat(600)}Ada` }, "fullName");
  });

  it("rejects disallowed characters and over-long categories", () => {
    expectFieldError({ ...valid, examinationCategory: "<b>MRCP</b>" }, "examinationCategory");
    expectFieldError({ ...valid, examinationCategory: "a".repeat(101) }, "examinationCategory");
  });

  it("rejects unknown keys to prevent mass assignment", () => {
    const result = parseWaitlistRequest({ ...valid, status: "INVITED", id: "x" });
    expect(result).toMatchObject({ success: false, hasUnknownKeys: true });
  });

  it("accepts the honeypot and bot-verification token fields", () => {
    const result = parseWaitlistRequest({ ...valid, company: "", turnstileToken: "token-value" });
    expect(result.success).toBe(true);
  });

  it("reports messages for missing required fields", () => {
    const result = parseWaitlistRequest({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.fullName).toBe("Please enter your full name.");
      expect(result.fieldErrors.email).toBe("Please enter your email address.");
    }
  });

  it.each([null, "text", 42, ["array"]])("rejects the non-object body %j", (input) => {
    expect(parseWaitlistRequest(input).success).toBe(false);
  });
});
