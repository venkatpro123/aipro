// pipelineTimer.ts
// Latency instrumentation for the complete scoring pipeline.
//
// Usage:
//   const timer = PipelineTimer.start('TCS');
//   timer.mark('osint_start');
//   ... work ...
//   timer.mark('osint_end');
//   const report = timer.report();
//
// The report is stored in sessionStorage under 'hp_pipeline_timings' so the
// TransparencyTab can surface it without requiring a prop-drill.
//
// Critical path: whichever series of dependent steps has the longest total
// duration. The timer identifies it by computing the longest sequential chain.

export interface TimingMark {
  label: CheckpointLabel;
  ts: number;          // Date.now() — absolute ms since epoch
  elapsed: number;     // ms since timer.start()
  stepMs?: number;     // ms since previous mark (gap = step latency)
}

export interface StepReport {
  step:    string;
  startMs: number;
  endMs:   number;
  durationMs: number;
  isCriticalPath: boolean;
}

export interface PipelineReport {
  runId:        string;
  companyName:  string;
  totalMs:      number;
  marks:        TimingMark[];
  steps:        StepReport[];
  criticalPath: string[];
  slowestStep:  StepReport | null;
  /** Fraction of total time the slowest step consumed */
  slowestStepPct: number;
  networkCondition: 'fast' | 'moderate' | 'slow' | 'unknown';
  timestamp: string;
  /** Private-company regulatory regime detected at audit time. Null for public/unknown companies. */
  regime?: string | null;
  /** Bucketed market segment for latency telemetry queries (p50/p95 by market). */
  marketSegment?: string;
  /** Quorum wait duration in ms. Null when quorum wait was skipped (_forceLiveUnavailable). */
  quorumWaitMs?: number | null;
  /** Whether quorum was fully satisfied before the ceiling fired. */
  quorumReached?: boolean;
  /** The ceiling used (ms) — regime-specific, not necessarily 45s. */
  quorumCeilingMs?: number;
}

// ── Checkpoint labels — every instrumented event in execution order ───────────
export type CheckpointLabel =
  | 'pipeline_start'
  // OSINT + live data
  | 'osint_start'
  | 'osint_end'
  // BSE/NSE connectors (sub-step of OSINT)
  | 'bse_fetch_start'
  | 'bse_fetch_end'
  // Alpha Vantage (via proxy-live-signals Edge Function)
  | 'alphavantage_start'
  | 'alphavantage_end'
  // NewsAPI (via proxy-live-signals)
  | 'newsapi_start'
  | 'newsapi_end'
  // Naukri / Serper (via proxy-live-signals hiring action)
  | 'serper_start'
  | 'serper_end'
  // Live quorum wait (v32+)
  | 'quorum_wait_start'
  | 'quorum_wait_end'
  // Deterministic scoring engine
  | 'engine_start'
  | 'engine_end'
  // Swarm layer (30 agents in parallel)
  | 'swarm_start'
  | 'swarm_end'
  // Slowest individual swarm agent
  | 'swarm_slowest_agent_start'
  | 'swarm_slowest_agent_end'
  // Tier A LLM call (Claude via llm-analyze EF)
  | 'llm_start'
  | 'llm_end'
  // Oracle compute-oracle EF
  | 'oracle_start'
  | 'oracle_end'
  // mapToHybridResult (synchronous transform)
  | 'map_to_hybrid_start'
  | 'map_to_hybrid_end'
  // First dashboard render (React paint)
  | 'first_render'
  // Intelligence upgrade layers (v9.0+)
  | 'intelligence_upgrade_start'
  | 'intelligence_upgrade_end'
  // Alpha Vantage proxy (liveDataService — proxy-live-signals EF)
  | 'alphavantage_start'
  | 'alphavantage_end'
  // DAG phase (migrated layers: macro_snapshot, cohort_class, stealth_layoff, etc.)
  | 'dag_phase_start'
  | 'dag_phase_end'
  // Total
  | 'pipeline_end';

// ── Pairs that define named steps ─────────────────────────────────────────────
const STEP_PAIRS: Array<{ name: string; start: CheckpointLabel; end: CheckpointLabel; parallel?: boolean }> = [
  { name: 'OSINT + live connectors', start: 'osint_start',         end: 'osint_end'         },
  { name: 'BSE/NSE fetch',           start: 'bse_fetch_start',     end: 'bse_fetch_end'     },
  { name: 'Alpha Vantage (proxy EF)',start: 'alphavantage_start',  end: 'alphavantage_end'  },
  { name: 'NewsAPI (proxy EF)',      start: 'newsapi_start',       end: 'newsapi_end'       },
  { name: 'Serper/Naukri (EF)',      start: 'serper_start',        end: 'serper_end'        },
  { name: 'Live quorum wait',        start: 'quorum_wait_start',   end: 'quorum_wait_end'   },
  { name: 'Swarm (30 agents ‖)',     start: 'swarm_start',         end: 'swarm_end', parallel: true },
  { name: 'Swarm slowest agent',     start: 'swarm_slowest_agent_start', end: 'swarm_slowest_agent_end' },
  { name: 'Deterministic engine',   start: 'engine_start',        end: 'engine_end'        },
  { name: 'Oracle EF',              start: 'oracle_start',        end: 'oracle_end'        },
  { name: 'Tier A LLM (Claude)',    start: 'llm_start',           end: 'llm_end'           },
  { name: 'mapToHybridResult',      start: 'map_to_hybrid_start',        end: 'map_to_hybrid_end'        },
  // 55-engine intelligence upgrade block — the only async step inside is
  // peerContagionLive (layer 22); all other 54 engines are synchronous CPU.
  // Reported here so computePercentiles() surfaces total engine-layer cost.
  { name: 'Intelligence layers (55)',start: 'intelligence_upgrade_start', end: 'intelligence_upgrade_end' },
  { name: 'DAG phase (5 layers)',    start: 'dag_phase_start',            end: 'dag_phase_end'            },
];

// ── Network condition heuristic ───────────────────────────────────────────────
// Uses a tiny GET to Supabase as a latency probe.
async function probeNetworkCondition(): Promise<'fast' | 'moderate' | 'slow'> {
  try {
    const t = Date.now();
    await fetch('https://ysenimczeasmaeojzlkt.supabase.co/rest/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    const rtt = Date.now() - t;
    if (rtt < 200) return 'fast';
    if (rtt < 600) return 'moderate';
    return 'slow';
  } catch {
    return 'slow';
  }
}

// ── Timer instance type (use this for parameter types) ────────────────────────
export type PipelineTimerInstance = {
  mark(label: CheckpointLabel): void;
  span(startLabel: CheckpointLabel, endLabel: CheckpointLabel): () => void;
  report(): PipelineReport;
};

// ── Timer class ───────────────────────────────────────────────────────────────

export class PipelineTimer implements PipelineTimerInstance {
  private readonly runId: string;
  private readonly companyName: string;
  private readonly origin: number;
  private readonly marks: TimingMark[] = [];
  private networkCondition: PipelineReport['networkCondition'] = 'unknown';
  /** Set by auditDataPipeline after regime detection. */
  regime: string | null = null;
  marketSegment: string = 'unknown';
  quorumWaitMs: number | null = null;
  quorumReached: boolean = false;
  quorumCeilingMs: number = 45_000;

  private constructor(companyName: string) {
    this.companyName = companyName;
    this.runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.origin = Date.now();
  }

  static start(companyName: string): PipelineTimer {
    const t = new PipelineTimer(companyName);
    t.mark('pipeline_start');
    // Probe network condition in background — does not block pipeline
    probeNetworkCondition().then(c => { t.networkCondition = c; }).catch(() => {}); // arch-allow:R2 fire-and-forget network probe
    return t;
  }

  mark(label: CheckpointLabel): void {
    const now = Date.now();
    const prev = this.marks[this.marks.length - 1];
    this.marks.push({
      label,
      ts:      now,
      elapsed: now - this.origin,
      stepMs:  prev ? now - prev.ts : 0,
    });
  }

  /** Convenience: mark start + return a function that marks end */
  span(startLabel: CheckpointLabel, endLabel: CheckpointLabel): () => void {
    this.mark(startLabel);
    return () => this.mark(endLabel);
  }

  report(): PipelineReport {
    // Ensure pipeline_end is recorded
    if (!this.marks.find(m => m.label === 'pipeline_end')) {
      this.mark('pipeline_end');
    }

    const byLabel = new Map<CheckpointLabel, number>(
      this.marks.map(m => [m.label, m.elapsed]),
    );

    // Build step reports
    const steps: StepReport[] = STEP_PAIRS
      .filter(p => byLabel.has(p.start) && byLabel.has(p.end))
      .map(p => ({
        step:        p.name,
        startMs:     byLabel.get(p.start)!,
        endMs:       byLabel.get(p.end)!,
        durationMs:  byLabel.get(p.end)! - byLabel.get(p.start)!,
        isCriticalPath: false,
      }))
      .sort((a, b) => a.startMs - b.startMs);

    // Mark critical path: the longest chain of sequential steps
    // Steps are sequential when step[n].startMs >= step[n-1].endMs
    // (no overlap). Parallel steps are excluded from critical path.
    const total = this.marks.find(m => m.label === 'pipeline_end')?.elapsed ?? 0;

    // Simple critical-path identification: any step whose duration > 200ms
    // and accounts for > 10% of total time is on the critical path.
    const criticalPath: string[] = [];
    steps.forEach(s => {
      if (s.durationMs > 200 && total > 0 && s.durationMs / total > 0.10) {
        s.isCriticalPath = true;
        criticalPath.push(s.step);
      }
    });

    const sorted = [...steps].sort((a, b) => b.durationMs - a.durationMs);
    const slowest = sorted[0] ?? null;

    const report: PipelineReport = {
      runId:          this.runId,
      companyName:    this.companyName,
      totalMs:        total,
      marks:          [...this.marks],
      steps,
      criticalPath,
      slowestStep:    slowest,
      slowestStepPct: slowest && total > 0 ? Math.round((slowest.durationMs / total) * 100) : 0,
      networkCondition: this.networkCondition,
      timestamp:      new Date().toISOString(),
      regime:         this.regime,
      marketSegment:  this.marketSegment,
      quorumWaitMs:   this.quorumWaitMs,
      quorumReached:  this.quorumReached,
      quorumCeilingMs: this.quorumCeilingMs,
    };

    // Persist to sessionStorage for TransparencyTab and console
    try {
      const existing = JSON.parse(sessionStorage.getItem('hp_pipeline_timings') ?? '[]');
      existing.unshift(report);
      // Keep last 10 runs only
      sessionStorage.setItem('hp_pipeline_timings', JSON.stringify(existing.slice(0, 10)));
    } catch { /* quota exceeded */ }

    this._logToConsole(report);
    return report;
  }

  private _logToConsole(r: PipelineReport): void {
    const bar = (ms: number, total: number, width = 30): string => {
      const filled = Math.round((ms / Math.max(total, 1)) * width);
      return '█'.repeat(filled) + '░'.repeat(width - filled);
    };

    console.group(
      `%c⏱ Pipeline Timing — ${r.companyName} — ${r.totalMs}ms total [${r.networkCondition}]`,
      'color: #10b981; font-weight: bold',
    );
    console.log(`Run ID: ${r.runId}`);
    console.log(`Network: ${r.networkCondition}`);
    console.log('');
    console.log('Step                          Duration   % total   Critical');
    console.log('─'.repeat(70));
    r.steps.forEach(s => {
      const pct   = r.totalMs > 0 ? Math.round((s.durationMs / r.totalMs) * 100) : 0;
      const label = s.step.padEnd(30);
      const dur   = `${s.durationMs}ms`.padStart(8);
      const chart = bar(s.durationMs, r.totalMs, 20);
      const flag  = s.isCriticalPath ? ' ◄ CRITICAL' : '';
      console.log(`${label} ${dur}  ${pct.toString().padStart(3)}%  ${chart}${flag}`);
    });
    console.log('─'.repeat(70));
    console.log(`${'TOTAL'.padEnd(30)} ${String(r.totalMs + 'ms').padStart(8)}`);
    if (r.slowestStep) {
      console.log(`\n🐢 Slowest: ${r.slowestStep.step} — ${r.slowestStep.durationMs}ms (${r.slowestStepPct}% of total)`);
    }
    if (r.criticalPath.length) {
      console.log(`🔴 Critical path: ${r.criticalPath.join(' → ')}`);
    }
    console.groupEnd();
  }

  /** Load historical timing runs from sessionStorage for variance analysis. */
  static loadHistory(): PipelineReport[] {
    try {
      return JSON.parse(sessionStorage.getItem('hp_pipeline_timings') ?? '[]');
    } catch {
      return [];
    }
  }

  /**
   * Compute p50 and p95 latency for each named step across historical runs.
   * Call this in the browser console: PipelineTimer.computePercentiles()
   */
  static computePercentiles(): Record<string, { p50: number; p95: number; n: number }> {
    const history = PipelineTimer.loadHistory();
    if (!history.length) {
      console.warn('[PipelineTimer] No history yet — run at least one audit first.');
      return {};
    }

    const byStep: Record<string, number[]> = {};
    for (const run of history) {
      for (const step of run.steps) {
        if (!byStep[step.step]) byStep[step.step] = [];
        byStep[step.step].push(step.durationMs);
      }
    }

    const percentile = (arr: number[], p: number): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    const result: Record<string, { p50: number; p95: number; n: number }> = {};
    for (const [step, durations] of Object.entries(byStep)) {
      result[step] = {
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        n:   durations.length,
      };
    }

    console.group('%c📊 Pipeline Percentiles', 'color: #6366f1; font-weight: bold');
    console.log(`Based on ${history.length} run(s)`);
    console.log('Step                          p50      p95      n');
    console.log('─'.repeat(55));
    Object.entries(result)
      .sort((a, b) => b[1].p95 - a[1].p95)
      .forEach(([step, v]) => {
        const label = step.padEnd(30);
        console.log(`${label} ${String(v.p50 + 'ms').padStart(7)}  ${String(v.p95 + 'ms').padStart(7)}  ${v.n}`);
      });
    console.groupEnd();

    return result;
  }
}

// ── Global accessor for use in browser console ───────────────────────────────
if (typeof window !== 'undefined') {
  (window as any).PipelineTimer = PipelineTimer;
}
