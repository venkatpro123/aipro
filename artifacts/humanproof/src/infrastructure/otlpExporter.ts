// otlpExporter.ts — DEBT-5 wire-up: ship structured logs to an OTLP HTTP endpoint.
//
// Adapts the in-process structured logger (shared/logger.ts) to the
// OpenTelemetry Protocol over HTTP/JSON. When `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`
// is configured, every emitted LogRecord is batched and POSTed to the
// configured collector (Axiom, Honeycomb, Datadog, OTel Collector, …).
//
// Design constraints:
//   * Batched + debounced — one POST per 5s window (or every 50 records)
//     to avoid one fetch per log line.
//   * Failure-tolerant — drops batches on persistent failure rather than
//     hanging the app. Telemetry must NEVER break the audit.
//   * Sample rate honours `VITE_OTEL_SAMPLE_RATE` for `info`/`debug`.
//     Warnings and errors are always exported regardless of sample rate.
//
// To activate: call `installOtlpSinkIfConfigured()` from the app
// bootstrap once the env is loaded. When the env var is absent, no sink
// is installed and the logger writes only to console.

import { configureSinks, type LogRecord, type LogSink } from '../shared/logger';
import { env, envValidationErrors } from '../config/env';

// ── Configuration ──────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_BYTES = 1 * 1024 * 1024; // 1 MB; older entries dropped past this

interface Endpoint {
  url: string;
  headers: Record<string, string>;
  serviceName: string;
  serviceVersion: string;
  sampleRate: number;
}

let endpoint: Endpoint | null = null;
let buffer: LogRecord[] = [];
let bufferBytes = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let exporting = false;

// ── OTLP JSON envelope ─────────────────────────────────────────────────────

/**
 * Convert a LogRecord into the OTLP/HTTP `ExportLogsServiceRequest`
 * payload format. We emit one ResourceLogs scope per batch with the
 * service identity, and each LogRecord becomes a logRecords entry.
 *
 * Spec: opentelemetry.io/docs/specs/otlp/#otlphttp-request
 *       Severity numbers: DEBUG=5, INFO=9, WARN=13, ERROR=17.
 */
const SEVERITY_NUMBER: Record<LogRecord['level'], number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
};

function recordToOtlp(record: LogRecord, scope: Endpoint) {
  const attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }> = [
    { key: 'event', value: { stringValue: record.event } },
  ];
  if (record.requestId) attributes.push({ key: 'request.id', value: { stringValue: record.requestId } });
  if (record.userId)    attributes.push({ key: 'user.id',    value: { stringValue: record.userId } });
  if (record.tenantId)  attributes.push({ key: 'tenant.id',  value: { stringValue: record.tenantId } });
  if (record.err) {
    attributes.push({ key: 'exception.type',    value: { stringValue: record.err.name } });
    attributes.push({ key: 'exception.message', value: { stringValue: record.err.message } });
    if (record.err.stack) {
      attributes.push({ key: 'exception.stacktrace', value: { stringValue: record.err.stack } });
    }
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

function buildOtlpRequest(records: LogRecord[], scope: Endpoint): string {
  return JSON.stringify({
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name',    value: { stringValue: scope.serviceName } },
            { key: 'service.version', value: { stringValue: scope.serviceVersion } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: scope.serviceName },
            logRecords: records.map((r) => recordToOtlp(r, scope)),
          },
        ],
      },
    ],
  });
}

// ── Sampling ───────────────────────────────────────────────────────────────

function shouldExport(record: LogRecord, sampleRate: number): boolean {
  if (record.level === 'warn' || record.level === 'error') return true;
  // Math.random gives us a uniform sample of info/debug at the configured rate.
  return Math.random() < sampleRate;
}

// ── Buffer + flush ─────────────────────────────────────────────────────────

function enqueue(record: LogRecord): void {
  if (!endpoint) return;
  if (!shouldExport(record, endpoint.sampleRate)) return;
  const size = JSON.stringify(record).length;
  while (bufferBytes + size > MAX_BUFFER_BYTES && buffer.length > 0) {
    const dropped = buffer.shift();
    if (dropped) bufferBytes -= JSON.stringify(dropped).length;
  }
  buffer.push(record);
  bufferBytes += size;
  if (buffer.length >= BATCH_SIZE) void flushNow();
}

async function flushNow(): Promise<void> {
  if (exporting || !endpoint || buffer.length === 0) return;
  exporting = true;
  const batch = buffer;
  buffer = [];
  bufferBytes = 0;
  try {
    const body = buildOtlpRequest(batch, endpoint);
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...endpoint.headers },
      body,
      keepalive: true,
    });
    if (!response.ok) {
      // Don't re-enqueue — risk of poisoning. Drop and move on.
      // eslint-disable-next-line no-console
      console.warn('[otlpExporter] non-2xx response, dropping batch', {
        status: response.status,
        records: batch.length,
      });
    }
  } catch (err) {
    // Transport failure; drop. Retry would just stall the audit.
    // eslint-disable-next-line no-console
    console.warn('[otlpExporter] transport error, dropping batch', {
      records: batch.length,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    exporting = false;
  }
}

// ── Sink installation ──────────────────────────────────────────────────────

const otlpSink: LogSink = (record) => enqueue(record);

/**
 * Install the OTLP sink IF the env is configured and valid. Returns a
 * function that uninstalls it (for tests / hot-reload scenarios).
 *
 * When the env is absent or invalid, this is a no-op and the default
 * console sink remains the only sink.
 */
export function installOtlpSinkIfConfigured(): () => void {
  // If env hasn't been validated yet, this throws inside env(); guard.
  const errors = envValidationErrors();
  if (errors) {
    // eslint-disable-next-line no-console
    console.warn('[otlpExporter] env validation failed; OTLP sink not installed');
    return () => undefined;
  }
  const config = env();
  if (!config.VITE_OTEL_EXPORTER_OTLP_ENDPOINT) {
    return () => undefined;
  }
  endpoint = {
    url: config.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {},
    serviceName: 'humanproof-web',
    serviceVersion: config.VITE_RELEASE_VERSION,
    sampleRate: config.VITE_OTEL_SAMPLE_RATE,
  };

  // Compose with the default console sink — both fire per record.
  configureSinks([defaultConsoleEcho, otlpSink]);

  flushTimer = setInterval(() => { void flushNow(); }, FLUSH_INTERVAL_MS);

  if (typeof window !== 'undefined') {
    // Flush on unload so a tab close still ships pending logs.
    window.addEventListener('beforeunload', () => { void flushNow(); });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushNow();
    });
  }

  return () => {
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
    endpoint = null;
    buffer = [];
    bufferBytes = 0;
  };
}

// Default console echo so we still see logs locally when the OTLP sink is on.
function defaultConsoleEcho(record: LogRecord): void {
  // eslint-disable-next-line no-console
  const out = `${record.level.toUpperCase().padEnd(5)} ${record.service}::${record.event}`;
  if (record.level === 'error') console.error(out, record.fields, record.err ?? '');
  else if (record.level === 'warn') console.warn(out, record.fields);
  else console.log(out, record.fields);
}

/** Test-only: force flush. */
export async function __flushForTesting(): Promise<void> {
  await flushNow();
}
