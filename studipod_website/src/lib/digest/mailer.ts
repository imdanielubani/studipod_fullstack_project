import "server-only";
import nodemailer from "nodemailer";
import type { ServerEnv } from "@/lib/env";

export interface DigestMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; content: string; contentType: string }[];
}

/** Anything that can deliver a digest (SMTP in production, fakes in tests). */
export interface Mailer {
  send(message: DigestMessage): Promise<void>;
}

/** The one transport capability the mailer needs (nodemailer Transporter-compatible). */
export interface SendMailTransport {
  sendMail(options: DigestMessage & { from: string }): Promise<unknown>;
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

/** Hostinger's SMTP default: implicit TLS on port 465. */
const DEFAULT_SMTP_PORT = 465;

/** SMTP settings from the environment, or null when email delivery is not configured. */
export function getSmtpSettings(env: ServerEnv): SmtpSettings | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  return {
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : DEFAULT_SMTP_PORT,
    user: SMTP_USER,
    password: SMTP_PASSWORD,
    from: SMTP_FROM ?? SMTP_USER,
  };
}

/**
 * Nodemailer SMTP options. Encryption is always required: implicit TLS on 465,
 * otherwise STARTTLS is mandatory (requireTLS) — credentials are never sent in
 * plain text. Timeouts keep a stalled mail server from hanging the request.
 */
export function smtpTransportOptions(settings: SmtpSettings) {
  const implicitTls = settings.port === 465;
  return {
    host: settings.host,
    port: settings.port,
    secure: implicitTls,
    requireTLS: !implicitTls,
    auth: { user: settings.user, pass: settings.password },
    tls: { minVersion: "TLSv1.2" as const },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  };
}

export function createMailer(transport: SendMailTransport, from: string): Mailer {
  return {
    async send(message) {
      await transport.sendMail({ from, ...message });
    },
  };
}

export function createSmtpMailer(settings: SmtpSettings): Mailer {
  return createMailer(nodemailer.createTransport(smtpTransportOptions(settings)), settings.from);
}
