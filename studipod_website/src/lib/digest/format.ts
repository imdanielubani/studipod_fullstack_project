/**
 * Builds the daily waitlist digest email (subject, plain text, HTML, CSV).
 * Pure functions. Every value that came from a visitor is escaped for its
 * output context: HTML-escaped in the email body, and neutralised against
 * spreadsheet formula injection in the CSV.
 */

export interface DigestEntry {
  fullName: string;
  email: string;
  examinationCategory: string | null;
  createdAt: Date;
}

export interface DigestEmailInput {
  entries: readonly DigestEntry[];
  totalCount: number;
  periodStart: Date | null;
  periodEnd: Date;
  siteUrl: string;
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
  csv: string;
  csvFilename: string;
}

/** Rows listed in the email body; the attached CSV always contains every row. */
export const MAX_ROWS_IN_EMAIL = 100;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/**
 * CSV cell. Values starting with =, +, -, @, tab or carriage return are
 * prefixed with an apostrophe so spreadsheet apps treat them as text, not
 * formulas (CSV injection). Quotes, commas and line breaks are quoted.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function buildDigestCsv(entries: readonly DigestEntry[]): string {
  const header = ["Full name", "Email", "Examination or professional category", "Signed up (UTC)"];
  const rows = entries.map((entry) => [
    entry.fullName,
    entry.email,
    entry.examinationCategory ?? "",
    entry.createdAt.toISOString(),
  ]);
  // BOM so spreadsheet apps detect UTF-8 (international names); CRLF per RFC 4180.
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString("en-GB")} ${word}${count === 1 ? "" : "s"}`;
}

export function buildDigestEmail({
  entries,
  totalCount,
  periodStart,
  periodEnd,
  siteUrl,
}: DigestEmailInput): DigestEmail {
  const newCount = entries.length;
  const listed = entries.slice(0, MAX_ROWS_IN_EMAIL);
  const hidden = newCount - listed.length;
  const total = totalCount.toLocaleString("en-GB");
  const period = periodStart
    ? `${formatUtc(periodStart)} – ${formatUtc(periodEnd)}`
    : `all sign-ups up to ${formatUtc(periodEnd)}`;

  const subject = `StudiPod waitlist: ${plural(newCount, "new sign-up")} (total ${total})`;
  const csvFilename = `studipod-waitlist-new-${periodEnd.toISOString().slice(0, 10)}.csv`;

  const textRows = listed.map((entry) => {
    const category = entry.examinationCategory ? ` — ${entry.examinationCategory}` : "";
    return `- ${entry.fullName} <${entry.email}>${category} (${formatUtc(entry.createdAt)})`;
  });
  const text = [
    "StudiPod waitlist digest",
    "",
    `New sign-ups: ${newCount.toLocaleString("en-GB")}`,
    `Total on the waitlist: ${total}`,
    `Period: ${period}`,
    "",
    ...textRows,
    ...(hidden > 0 ? ["", `…and ${plural(hidden, "more sign-up")} in the attached CSV.`] : []),
    "",
    `The attached CSV (${csvFilename}) lists every new sign-up in this period.`,
    "This email contains personal data. Store it securely and delete it when no longer needed.",
    "",
    siteUrl,
  ].join("\n");

  const cell = "padding:8px 12px;border-bottom:1px solid #e5e9f5;text-align:left;";
  const htmlRows = listed
    .map(
      (entry) =>
        `<tr><td style="${cell}">${escapeHtml(entry.fullName)}</td>` +
        `<td style="${cell}">${escapeHtml(entry.email)}</td>` +
        `<td style="${cell}">${escapeHtml(entry.examinationCategory ?? "—")}</td>` +
        `<td style="${cell}white-space:nowrap;">${escapeHtml(formatUtc(entry.createdAt))}</td></tr>`,
    )
    .join("");
  const more =
    hidden > 0
      ? `<p style="margin:16px 0 0;font-size:14px;">…and ${escapeHtml(plural(hidden, "more sign-up"))} in the attached CSV.</p>`
      : "";

  const html = `<!doctype html>
<html lang="en-GB"><body style="margin:0;padding:24px;background:#f7f9fe;font-family:Arial,Helvetica,sans-serif;color:#172554;">
<div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
<h1 style="margin:0 0 4px;font-size:22px;">StudiPod waitlist digest</h1>
<p style="margin:0 0 20px;color:#475073;font-size:14px;">${escapeHtml(period)}</p>
<p style="margin:0 0 20px;font-size:16px;"><strong style="color:#2563eb;">${escapeHtml(plural(newCount, "new sign-up"))}</strong> &middot; ${escapeHtml(total)} total on the waitlist</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
<thead><tr><th style="${cell}">Full name</th><th style="${cell}">Email</th><th style="${cell}">Category</th><th style="${cell}">Signed up</th></tr></thead>
<tbody>${htmlRows}</tbody>
</table>
${more}
<p style="margin:24px 0 0;color:#6b7394;font-size:12px;">The attached CSV lists every new sign-up in this period. This email contains personal data — store it securely and delete it when no longer needed.</p>
</div></body></html>`;

  return { subject, text, html, csv: buildDigestCsv(entries), csvFilename };
}
