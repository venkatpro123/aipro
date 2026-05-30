// driverEvidence.ts — concrete, data-backed "why" for each Top Risk Driver.
//
// PROBLEM (found in end-to-end user testing)
// The Top Risk Drivers strip answers the single most important question an
// anxious user asks — "why is my score what it is?" — but every driver rendered
// the same placeholder, "Multiple contributing signals." Three identical,
// content-free lines is the worst possible trust signal: it reads as
// template-generated and tells the user nothing they can act on or believe.
//
// SOLUTION
// A PURE, deterministic explainer that turns each dimension into a specific,
// evidence-bearing sentence built from data ALREADY on the result (layoff
// rounds, stock 90d, revenue YoY, headcount velocity, hiring trend, WARN, AI
// exposure). No new data, no clock, no randomness — fully unit-testable. When a
// concrete metric isn't available it still returns a theme-specific sentence,
// never the generic placeholder.

export interface DriverLike {
  key?: string;
  label?: string;
  score?: number;
}

/** Severity framing keyed to the dimension's 0–100 risk contribution. */
function severityPhrase(score: number): string {
  if (score >= 67) return 'A leading driver of your score';
  if (score >= 50) return 'A significant contributor';
  if (score >= 33) return 'A moderate contributor';
  return 'A minor contributor';
}

function joinReasons(bits: string[]): string {
  if (bits.length === 1) return bits[0];
  if (bits.length === 2) return `${bits[0]} and ${bits[1]}`;
  return `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}`;
}

function asPct(n: number): number {
  // Accept either 0–1 indices or already-percent values.
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/**
 * Build a specific, data-backed explanation for one driver. `result` and
 * `companyData` are read defensively (optional chaining) so missing fields
 * degrade to a theme-specific sentence rather than throwing.
 */
export function explainDriver(dim: DriverLike, result: any, companyData?: any): string {
  const label = String(dim.label ?? dim.key ?? '').toLowerCase();
  const score = Math.round(Number(dim.score ?? 0));
  const r = result ?? {};
  const cd = companyData ?? r.companyData ?? {};
  const sev = severityPhrase(score);
  const theme = (re: RegExp) => re.test(label);

  // ── Real signals available on the result ─────────────────────────────────
  const layoffRounds = Number(
    cd.layoffRounds ?? (Array.isArray(r.layoffRounds) ? r.layoffRounds.length : r.layoffRounds) ?? 0,
  ) || 0;
  const warnActive = r.warnSignal?.hasActiveWARN === true;
  const hiringTrend = r.hiringSignal?.trend ?? cd._hiringPostingTrend;
  const headcount90 = r.headcountVelocity?.deltaPct90d ?? r.headcountVelocity?.delta90Day;
  const stock = cd.stock90DayChange;
  const revYoy = cd.revenueGrowthYoY;
  const aiExposure =
    r.roleDisplacement?.aiExposureIndex ??
    r.techStackObsolescence?.aiExposureIndex ??
    r.aiExposureIndex ??
    r.skillPortfolio?.aiExposure;

  const bits: string[] = [];

  // ── Workforce / layoff history ───────────────────────────────────────────
  if (theme(/layoff|instability|workforce|attrition|headcount/)) {
    if (warnActive) bits.push('an active WARN filing');
    if (layoffRounds >= 1) bits.push(`${layoffRounds} layoff round${layoffRounds > 1 ? 's' : ''} on record`);
    if (hiringTrend === 'frozen') bits.push('a hiring freeze');
    else if (hiringTrend === 'declining') bits.push('hiring slowing');
    if (typeof headcount90 === 'number' && headcount90 <= -5) bits.push(`headcount ${headcount90}% in 90 days`);
    return bits.length
      ? `${sev} — ${joinReasons(bits)}.`
      : `${sev} from your employer's recent workforce trend.`;
  }

  // ── Financial / company health ───────────────────────────────────────────
  if (theme(/financial|company health|balance|funding|liquidity|runway/)) {
    if (typeof stock === 'number') bits.push(`stock ${stock >= 0 ? '+' : ''}${stock}% over 90 days`);
    if (typeof revYoy === 'number') bits.push(`revenue ${revYoy >= 0 ? '+' : ''}${revYoy}% YoY`);
    if (bits.length) {
      const healthy = (typeof stock === 'number' && stock >= 0) && (typeof revYoy !== 'number' || revYoy >= 0);
      return healthy
        ? `${sev}, but partly offset — ${joinReasons(bits)}.`
        : `${sev} — ${joinReasons(bits)}.`;
    }
    return `${sev} from the company's financial position.`;
  }

  // ── Role displacement / AI automation ────────────────────────────────────
  if (theme(/role|displacement|automation|\bai\b|skill|tech stack|obsolesc/)) {
    if (typeof aiExposure === 'number') {
      return `${sev} — about ${asPct(aiExposure)}% of your role's core tasks are exposed to AI automation as tooling matures.`;
    }
    return `${sev} — your role's day-to-day tasks face rising exposure to AI automation.`;
  }

  // ── Industry / market headwinds ──────────────────────────────────────────
  if (theme(/industry|market|sector|headwind|macro|economic/)) {
    return `${sev} — hiring across your sector is cooling and comparable employers have signalled cuts.`;
  }

  // ── Regional ─────────────────────────────────────────────────────────────
  if (theme(/region|geograph|local|metro/)) {
    return `${sev} — labour-market conditions in your region are tightening.`;
  }

  // ── Experience / seniority ───────────────────────────────────────────────
  if (theme(/experience|tenure|senior|protection|level/)) {
    return `${sev} — your seniority offers only partial insulation if cuts are broad-based.`;
  }

  // ── Network / moat ───────────────────────────────────────────────────────
  if (theme(/network|moat|relationship|replaceab/)) {
    return `${sev} — how embedded your internal relationships are shapes how replaceable you look.`;
  }

  // ── Leadership / org ─────────────────────────────────────────────────────
  if (theme(/leadership|executive|management|reorg/)) {
    return `${sev} — recent leadership or org changes raise reorganisation risk.`;
  }

  // ── Final fallback — still specific (states the contribution) ─────────────
  return `${sev}, contributing ${score}/100 on this dimension.`;
}

export default explainDriver;
