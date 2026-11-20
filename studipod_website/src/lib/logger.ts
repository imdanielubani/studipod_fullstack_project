import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * Minimal structured (JSON-line) logger for server code.
 *
 * Rules: log event names and technical context only. Never log request
 * bodies, names, email addresses, tokens or connection strings.
 */
function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...context });
  if (level === "error") console.error(line);
  else console.warn(line);
}

/** Reduces an unknown error to non-sensitive diagnostics (type + code, no messages). */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return { errorName: error.name, errorCode: typeof code === "string" ? code : undefined };
  }
  return { errorName: typeof error };
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
