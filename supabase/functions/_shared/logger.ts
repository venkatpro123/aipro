// _shared/logger.ts — DEBT-5 (Deno mirror of the browser structured logger)
//
// Mirrors the contract of artifacts/humanproof/src/shared/logger.ts so
// edge functions emit the SAME JSON record shape. A log aggregator
// (Honeycomb, Axiom, Datadog) can therefore ingest records from both
// browser and edge with one parser.
//
// What's the same:
//   * Levels (debug/info/warn/error) and event-name conventions.
//   * PII redaction by key name.
//   * Auto-extraction of Error fields into the `err` slot.
//
// What's different:
//   * No browser-specific concerns (no `import.meta.env`, no `window`).
//   * Default sink writes ONLY to stdout via console.log. Supabase
//     function logs ship the stdout stream to the dashboard / Logflare /
//     any configured drain.
//
// IMPORTANT: do not import from the browser logger. Keeping them as
// separate files avoids accidentally pulling Vite-only types into Deno
// or vice versa. The CONTRACT (LogRecord shape) is identical; the
// implementations diverge only in their default sink and env reads.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogContext {
  service: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  defaultFields?: Record<string, unknown>;
}

export interface LogRecord {
  ts: string;
  level: LogLevel;
  service: string;
  event: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  fields: Record<string, unknown>;
  err?: { name: string; message: string; stack?: string };
}

export interface DenoLogger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown> | Error): void;
  child(extension: Partial<LogContext>): DenoLogger;
}

// ── PII redaction (kept in sync with browser logger) ────────────────────────

const PII_KEY_PATTERNS = [
  /^email$/i, /password/i, /secret/i, /token/i, /api[_-]?key/i,
  /authorization/i, /full_?name/i, /ssn/i, /credit[_-]?card/i, /^phone$/i,
];

function redact(value: unknown, keyHint: string | null = null): unknown {
  if (keyHint && PII_KEY_PATTERNS.some((re) => re.test(keyHint))) return '[REDACTED]';
  if (value == null) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…[truncated]` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => redact(v));
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      out[k] = redact(v, k);
    }
    return out;
  }
  return String(value);
}

// ── Config ──────────────────────────────────────────────────────────────────

let GLOBAL_MIN_LEVEL: LogLevel = (Deno.env.get('LOG_LEVEL') as LogLevel) ?? 'info';

export function setLogLevel(level: LogLevel): void {
  GLOBAL_MIN_LEVEL = level;
}

// ── Sinks ───────────────────────────────────────────────────────────────────

function defaultSink(record: LogRecord): void {
  const line = JSON.stringify(record);
  if (record.level === 'error') console.error(line);
  else if (record.level === 'warn') console.warn(line);
  else console.log(line);
}

// gap #9 — OTLP HTTP sink for edge functions. Mirrors the browser sink
// (artifacts/humanproof/src/infrastructure/otlpExporter.ts). Batching is
// less aggressive because edge functions are short-lived: per-record
// fire-and-forget POST is acceptable. The container is gone before
// retries would matter anyway.
const OTLP_ENDPOINT = Deno.env.get('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT');
const OTLP_SERVICE_NAME = Deno.env.get('OTEL_SERVICE_NAME') ?? 'humanproof-edge';
const OTLP_SERVICE_VERSION = Deno.env.get('RELEASE_VERSION') ?? 'unknown';

const SEVERITY_NUMBER: Record<LogLevel, number> = { debug: 5, info: 9, warn: 13, error: 17 };

function recordToOtlp(record: LogRecord) {
  const attributes: Array<{ key: string; value: { stringValue?: string; boolValue?: boolean; intValue?: string } }> = [
    { key: 'event', value: { stringValue: record.event } },
  ];
  if (record.requestId) attributes.push({ key: 'request.id', value: { stringValue: record.requestId } });
  if (record.userId)    attributes.push({ key: 'user.id',    value: { stringValue: record.userId } });
  if (record.tenantId)  attributes.push({ key: 'tenant.id',  value: { stringValue: record.tenantId } });
  if (record.err) {
    attributes.push({ key: 'exception.type',    value: { stringValue: record.err.name } });
    attributes.push({ key: 'exception.message', value: { stringValue: record.err.message } });
    if (record.err.stack) attributes.push({ key: 'exception.stacktrace', value: { stringValue: record.err.stack } });
  }
  for (const [k, v] of Object.entries(record.fields)) {
    if (v == null) continue;
    if (typeof v === 'string') attributes.push({ key: k, value: { stringValue: v } });
    else if (typeof v === 'number' && Number.isFinite(v)) attributes.push({ key: k, value: { intValue: String(Math.trunc(v)) } });
    else if (typeof v === 'boolean') attributes.push({ key: k, value: { boolValue: v } });
    else attributes.push({ key: k, value: { stringValue: JSON.stringify(v).slice(0, 4096) } });
  }
  return {
    timeUnixNano: String(Date.parse(record.ts) * 1_000_000),
    severityNumber: SEVERITY_NUMBER[record.level],
    severityText: record.level.toUpperCase(),
    body: { stringValue: record.event },
    attributes,
  };
}

function otlpSink(record: LogRecord): void {
  if (!OTLP_ENDPOINT) return;
  // Drop debug records to keep request volume bounded. Edge functions
  // typically run a handful of times per minute; we want the warnings +
  // errors + info events but not the chatter.
  if (record.level === 'debug') return;
  try {
    const body = JSON.stringify({
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: OTLP_SERVICE_NAME } },
              { key: 'service.version', value: { stringValue: OTLP_SERVICE_VERSION } },
            ],
          },
          scopeLogs: [
            {
              scope: { name: record.service },
              logRecords: [recordToOtlp(record)],
            },
          ],
        },
      ],
    });
    // Fire-and-forget. Failure to ship the log line must not break the
    // edge function's response path. The container terminates after the
    // response; pending requests may not complete, which is acceptable
    // for telemetry (we lose at most one log line per function instance).
    void fetch(OTLP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => undefined);
  } catch {
    // never throw from telemetry
  }
}

// ── Implementation ──────────────────────────────────────────────────────────

class DenoLoggerImpl implements DenoLogger {
  constructor(private readonly ctx: LogContext) {}

  debug(event: string, fields?: Record<string, unknown>): void { this.emit('debug', event, fields); }
  info(event: string, fields?: Record<string, unknown>): void  { this.emit('info', event, fields); }
  warn(event: string, fields?: Record<string, unknown>): void  { this.emit('warn', event, fields); }
  error(event: string, fields?: Record<string, unknown> | Error): void {
    if (fields instanceof Error) {
      this.emit('error', event, { error: fields });
    } else {
      this.emit('error', event, fields);
    }
  }

  child(extension: Partial<LogContext>): DenoLogger {
    return new DenoLoggerImpl({
      ...this.ctx,
      ...extension,
      defaultFields: { ...(this.ctx.defaultFields ?? {}), ...(extension.defaultFields ?? {}) },
    });
  }

  private emit(level: LogLevel, event: string, raw?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[GLOBAL_MIN_LEVEL]) return;
    const merged = { ...(this.ctx.defaultFields ?? {}), ...(raw ?? {}) };
    let err: LogRecord['err'] | undefined;
    if (merged.error instanceof Error) {
      err = { name: merged.error.name, message: merged.error.message, stack: merged.error.stack };
      delete merged.error;
    }
    const sanitised = redact(merged) as Record<string, unknown>;
    const record: LogRecord = {
      ts: new Date().toISOString(),
      level,
      service: this.ctx.service,
      event,
      requestId: this.ctx.requestId,
      userId: this.ctx.userId,
      tenantId: this.ctx.tenantId,
      fields: sanitised,
      err,
    };
    try { defaultSink(record); } catch { /* sink failure never breaks the function */ }
    try { otlpSink(record); }    catch { /* never throw from telemetry */ }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createLogger(ctx: LogContext): DenoLogger {
  return new DenoLoggerImpl(ctx);
}
