import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";
import {
  buildDigestCsv,
  buildDigestEmail,
  csvCell,
  escapeHtml,
  MAX_ROWS_IN_EMAIL,
  type DigestEntry,
} from "@/lib/digest/format";
import {
  createMailer,
  getSmtpSettings,
  smtpTransportOptions,
  type DigestMessage,
  type Mailer,
} from "@/lib/digest/mailer";
import type { DigestRepository } from "@/lib/digest/repository";
import { DIGEST_SAFETY_LAG_MS, sendWaitlistDigest } from "@/lib/digest/service";
import type { ServerEnv } from "@/lib/env";
import { isValidBearerToken } from "@/lib/security/bearer";

const entry = (overrides: Partial<DigestEntry> = {}): DigestEntry => ({
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  examinationCategory: "PLAB 1",
  createdAt: new Date("2026-11-20T09:30:00Z"),
  ...overrides,
});

const target = { recipient: "hello@x.test", siteUrl: "https://x.test" };

describe("digest formatting", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it.each(['=HYPERLINK("x")', "+1", "-2", "@SUM(A1)"])(
    "neutralises the spreadsheet formula %s",
    (value) => expect(csvCell(value).replace(/^"/, "")).toMatch(/^'/),
  );

  it("quotes cells containing commas, quotes or line breaks", () => {
    expect(csvCell('O"Brien, Jr')).toBe('"O""Brien, Jr"');
    expect(csvCell("plain")).toBe("plain");
  });

  it("builds a UTF-8 CSV with a header and one row per entry", () => {
    const csv = buildDigestCsv([entry(), entry({ fullName: "Zoë", examinationCategory: null })]);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines[0]).toBe("Full name,Email,Examination or professional category,Signed up (UTC)");
    expect(lines[1]).toBe("Ada Lovelace,ada@example.com,PLAB 1,2026-11-20T09:30:00.000Z");
    expect(lines[2]).toBe("Zoë,ada@example.com,,2026-11-20T09:30:00.000Z");
  });

  it("builds the subject, period and escaped body", () => {
    const email = buildDigestEmail({
      entries: [entry({ fullName: "A <b>bold</b> name" })],
      totalCount: 1234,
      periodStart: new Date("2026-11-19T07:00:00Z"),
      periodEnd: new Date("2026-11-20T07:00:00Z"),
      siteUrl: "https://studipod.com",
    });
    expect(email.subject).toBe("StudiPod waitlist: 1 new sign-up (total 1,234)");
    expect(email.csvFilename).toBe("studipod-waitlist-new-2026-11-20.csv");
    expect(email.html).toContain("A &lt;b&gt;bold&lt;/b&gt; name");
    expect(email.html).not.toContain("<b>bold</b>");
    expect(email.text).toContain("2026-11-19 07:00 UTC – 2026-11-20 07:00 UTC");
  });

  it("describes the first digest as everything up to now", () => {
    const email = buildDigestEmail({
      entries: [entry(), entry()],
      totalCount: 2,
      periodStart: null,
      periodEnd: new Date("2026-11-20T07:00:00Z"),
      siteUrl: "https://studipod.com",
    });
    expect(email.subject).toBe("StudiPod waitlist: 2 new sign-ups (total 2)");
    expect(email.text).toContain("all sign-ups up to 2026-11-20 07:00 UTC");
  });

  it("caps the rows in the email body but keeps every row in the CSV", () => {
    const entries = Array.from({ length: MAX_ROWS_IN_EMAIL + 5 }, (_, index) =>
      entry({ email: `person${index}@example.com` }),
    );
    const email = buildDigestEmail({
      entries,
      totalCount: entries.length,
      periodStart: null,
      periodEnd: new Date(),
      siteUrl: "https://studipod.com",
    });
    expect(email.html.match(/<tr>/g)).toHaveLength(MAX_ROWS_IN_EMAIL + 1); // + header row
    expect(email.text).toContain("…and 5 more sign-ups in the attached CSV.");
    expect(email.csv.trim().split("\r\n")).toHaveLength(entries.length + 1);
  });
});

describe("sendWaitlistDigest", () => {
  const dbNow = new Date("2026-11-21T07:00:00Z");

  function setup(entries: DigestEntry[], lastEnd: Date | null = null) {
    const repository: DigestRepository = {
      databaseNow: vi.fn(async () => dbNow),
      latestPeriodEnd: vi.fn(async () => lastEnd),
      entriesBetween: vi.fn(async () => entries),
      totalUntil: vi.fn(async () => 42),
      recordRun: vi.fn(async () => ({ id: "run-1" })),
    };
    const sent: DigestMessage[] = [];
    const mailer: Mailer = {
      send: vi.fn(async (message: DigestMessage) => {
        sent.push(message);
      }),
    };
    return { repository, mailer, sent };
  }

  it("sends nothing and records nothing when there are no new sign-ups", async () => {
    const { repository, mailer } = setup([]);
    const result = await sendWaitlistDigest({ repository, mailer, ...target });
    expect(result).toEqual({ status: "skipped", reason: "no-new-entries" });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(repository.recordRun).not.toHaveBeenCalled();
  });

  it("emails new sign-ups with a CSV and records the period afterwards", async () => {
    const lastEnd = new Date("2026-11-20T07:00:00Z");
    const { repository, mailer, sent } = setup([entry()], lastEnd);
    const result = await sendWaitlistDigest({ repository, mailer, ...target });

    const periodEnd = new Date(dbNow.getTime() - DIGEST_SAFETY_LAG_MS);
    expect(repository.entriesBetween).toHaveBeenCalledWith(lastEnd, periodEnd);
    expect(result).toEqual({ status: "sent", entryCount: 1, totalCount: 42 });
    expect(sent[0]?.to).toBe("hello@x.test");
    expect(sent[0]?.attachments[0]?.contentType).toBe("text/csv; charset=utf-8");
    expect(repository.recordRun).toHaveBeenCalledWith({
      periodStart: lastEnd,
      periodEnd,
      entryCount: 1,
    });
  });

  it("does not record the run if sending fails, so the next digest retries", async () => {
    const { repository, mailer } = setup([entry()]);
    vi.mocked(mailer.send).mockRejectedValueOnce(new Error("SMTP down"));
    await expect(sendWaitlistDigest({ repository, mailer, ...target })).rejects.toThrow(
      "SMTP down",
    );
    expect(repository.recordRun).not.toHaveBeenCalled();
  });
});

describe("mailer", () => {
  const env = (values: Partial<ServerEnv>) => values as ServerEnv;

  it("is not configured until host, user and password are set", () => {
    expect(
      getSmtpSettings(env({ SMTP_HOST: "smtp.hostinger.com", SMTP_USER: "hello@x.test" })),
    ).toBeNull();
  });

  it("defaults to port 465 and the SMTP user as sender", () => {
    expect(
      getSmtpSettings(
        env({ SMTP_HOST: "smtp.hostinger.com", SMTP_USER: "hello@x.test", SMTP_PASSWORD: "p" }),
      ),
    ).toEqual({
      host: "smtp.hostinger.com",
      port: 465,
      user: "hello@x.test",
      password: "p",
      from: "hello@x.test",
    });
  });

  it("always encrypts: implicit TLS on 465, mandatory STARTTLS otherwise", () => {
    const base = { host: "h", user: "u", password: "p", from: "u" };
    expect(smtpTransportOptions({ ...base, port: 465 })).toMatchObject({
      secure: true,
      requireTLS: false,
    });
    expect(smtpTransportOptions({ ...base, port: 587 })).toMatchObject({
      secure: false,
      requireTLS: true,
    });
  });

  it("composes a real message with the CSV attachment", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sendMail = vi.spyOn(transport, "sendMail");
    const mailer = createMailer(transport, "StudiPod Waitlist <hello@x.test>");
    await mailer.send({
      to: "hello@x.test",
      subject: "Digest",
      text: "body",
      html: "<p>body</p>",
      attachments: [{ filename: "a.csv", content: "a,b\r\n", contentType: "text/csv" }],
    });
    const info = (await sendMail.mock.results[0]?.value) as { message: string };
    const message = JSON.parse(info.message) as {
      from: { address: string };
      attachments: unknown[];
    };
    expect(message.from.address).toBe("hello@x.test");
    expect(message.attachments).toHaveLength(1);
  });
});

describe("isValidBearerToken", () => {
  const secret = "s".repeat(40);

  it("accepts the exact secret", () => {
    expect(isValidBearerToken(`Bearer ${secret}`, secret)).toBe(true);
  });

  it.each([null, "", secret, `Bearer ${secret}x`, `Basic ${secret}`, "Bearer "])(
    "rejects %j",
    (header) => expect(isValidBearerToken(header, secret)).toBe(false),
  );
});

describe("GET/POST /api/internal/waitlist-digest", () => {
  const SECRET = "c".repeat(40);

  async function call(headers: Record<string, string> = {}) {
    vi.resetModules();
    const { POST } = await import("@/app/api/internal/waitlist-digest/route");
    return POST(
      new Request("http://localhost/api/internal/waitlist-digest", { method: "POST", headers }),
    );
  }

  it("is disabled until CRON_SECRET is configured", async () => {
    expect((await call({ authorization: `Bearer ${SECRET}` })).status).toBe(503);
  });

  it("rejects missing or wrong secrets", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer wrong" })).status).toBe(401);
  });

  it("reports when email delivery is not configured", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const response = await call({ authorization: `Bearer ${SECRET}` });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_CONFIGURED" } });
  });

  it("returns a generic 500 if the digest fails, without details", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("SMTP_HOST", "smtp.invalid");
    vi.stubEnv("SMTP_USER", "hello@x.test");
    vi.stubEnv("SMTP_PASSWORD", "secret-password");
    vi.stubEnv("DIGEST_DATABASE_URL", "postgresql://nobody:nothing@127.0.0.1:1/none");
    const response = await call({ authorization: `Bearer ${SECRET}` });
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("secret-password");
    expect(text).not.toContain("127.0.0.1");
  });
});
