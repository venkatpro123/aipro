// logger.ts — DEBT-5 fix (structured logging)
//
// Replaces ad-hoc `console.warn('[module] message:', err)` calls with a
// JSON-structured logger that:
//
//   * Emits one log line per event with named fields (parseable by any
//     log backend — Datadog, Honeycomb, Axiom, CloudWatch).
//   * Carries the per-audit `requestId` so a single bad audit can be
//     traced across every component that handled it.
//   * Auto-redacts known PII keys (email, full_name, ssn, ...) before
//     emission. Defence-in-depth — services should never log PII in the
//     first place, but accidents happen.
//   * In dev, pretty-prints with colours. In prod, emits compact JSON.
//
// Anti-pattern this replaces: the 60+ console.warn/error calls scattered
// across the codebase, each with its own string format. None of them are
// machine-parseable; none carry correlation IDs.

// ── Levels ──────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// ── Types ───────────────────────────────────────────────────────────────────

export interface LogContext {
  service: string;                       // 'audit-pipeline', 'feature-flags', ...
  requestId?: string;                    // propagated to OTel span IDs
  userId?: string;
  tenantId?: string;
  /** Static context attached to every log line emitted by this logger. */
  defaultFields?: Record<string, unknown>;
}

export interface LogRecord {
  ts: string;                            // ISO 8601
  level: LogLevel;
  service: string;
  event: string;                         // dot-separated, low-cardinality identifier
  message?: string;                      // optional human-readable explanation
  requestId?: string;
  userId?: string;
  tenantId?: string;
  fields: Record<string, unknown>;       // domain-specific structured data
  err?: { name: string; message: string; stack?: string };
}

export interface StructuredLogger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown> | Error): void;
  /** Create a child logger that inherits + extends the parent's context. */
  child(extension: Partial<LogContext>): StructuredLogger;
}

// ── Config ──────────────────────────────────────────────────────────────────

let GLOBAL_MIN_LEVEL: LogLevel = 'info';
let PRETTY = false;

/** Set the global minimum log level. Lines below this level are dropped. */
export function setLogLevel(level: LogLevel): void {
  GLOBAL_MIN_LEVEL = level;
}

/** Toggle pretty-print mode. Default: enabled in dev. */
export function setPrettyMode(on: boolean): void {
  PRETTY = on;
}

// ── PII redaction ───────────────────────────────────────────────────────────

const PII_KEY_PATTERNS = [
  /^email$/i, /password/i, /secret/i, /token/i, /api[_-]?key/i,
  /authorization/i, /full_?name/i, /ssn/i, /credit[_-]?card/i, /^phone$/i,
];

function redact(value: unknown, keyHint: string | null = null): unknown {
  if (keyHint && PII_KEY_PATTERNS.some((re) => re.test(keyHint))) {
    return '[REDACTED]';
  }
  if (value == null) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…[truncated]` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => redact(v));
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      out[k] = redact(v, k);
    }
    return out;
  }
  return String(value);
}

// ── Sinks ───────────────────────────────────────────────────────────────────

export type LogSink = (record: LogRecord) => void;

const sinks: LogSink[] = [];

function defaultConsoleSink(record: LogRecord): void {
  if (PRETTY) {
    const color = record.level === 'error' ? '\x1b[31m'
      : record.level === 'warn'  ? '\x1b[33m'
      : record.level === 'info'  ? '\x1b[36m'
      : '\x1b[90m';
    const reset = '\x1b[0m';
    // eslint-disable-next-line no-console
    console.log(
      `${color}${record.level.toUpperCase().padEnd(5)} ${reset}${record.service}::${record.event}`,
      record.fields,
      record.err ?? '',
    );
  } else {
    const line = JSON.stringify(record);
    if (record.level === 'error') console.error(line);
    else if (record.level === 'warn') console.warn(line);
    else console.log(line);
  }
}

/** Replace the default sinks (e.g. wire to OTel + Sentry). */
export function configureSinks(newSinks: LogSink[]): void {
  sinks.length = 0;
  sinks.push(...newSinks);
}

// Default: console only.
sinks.push(defaultConsoleSink);

// ── Implementation ──────────────────────────────────────────────────────────

class LoggerImpl implements StructuredLogger {
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

  child(extension: Partial<LogContext>): StructuredLogger {
    return new LoggerImpl({
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

    for (const sink of sinks) {
      try { sink(record); } catch { /* sink failure must not break callers */ }
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a logger bound to a service. Subsequent `.child()` calls add
 * the audit's requestId so cross-component correlation works.
 *
 *   const log = createLogger({ service: 'audit-pipeline' });
 *   const auditLog = log.child({ requestId: ctx.requestId });
 *   auditLog.info('layer.started', { layerId: 'L22' });
 */
export function createLogger(ctx: LogContext): StructuredLogger {
  return new LoggerImpl(ctx);
}

// ── Default loggers used by services that have no module-scoped logger ──────

export const rootLogger = createLogger({ service: 'humanproof' });
