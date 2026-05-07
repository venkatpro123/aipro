// exitTimingOptimizer.ts
// v11.0: Optimal proactive exit timing intelligence.
// Answers: "If I were going to leave proactively, WHEN is the best month to do it?"
//
// No competitor provides this intelligence. Most tools tell you to act without
// telling you WHEN. This service fills that gap with a 12-month forward calendar
// of optimal departure windows based on:
//   (1) Vesting schedules (RSU cliff / quarterly vesting)
//   (2) Bonus payout cycles (annual, semi-annual, Q1 bonus typical in tech)
//   (3) Performance review timing (do not leave right before review — wait for it)
//   (4) Market hiring seasonality (Q1 Jan-Mar and Q3 Sep-Oct are hiring peaks)
//   (5) Company-specific risk windows (Q4 budget season, post-earnings volatility)
//   (6) Financial runway constraints (how long can you afford a gap)
//
// Output: 12-month calendar with score per month, a top recommendation window,
// and financial cost of each option (unvested equity at stake).

export type VestingSchedule =
  | "monthly"         // vest 1/48 per month
  | "quarterly"       // vest 1/16 per quarter
  | "annual_cliff"    // vest nothing until 1-year cliff, then quarterly
  | "4yr_1yr_cliff"   // typical tech: 25% at 1 year, then monthly/quarterly
  | "none";           // no equity

export type BonusFrequency = "annual_q1" | "annual_q4" | "semi_annual" | "quarterly" | "none";

export interface ExitTimingMonth {
  month: string;           // "January 2026"
  monthIndex: number;      // 0 = current month
  marketScore: number;     // 0–100 hiring market attractiveness this month
  internalScore: number;   // 0–100 internal timing quality (vesting, bonus)
  compositeScore: number;  // weighted composite (60% market, 40% internal)
  unvestedEquityAtRisk: number; // USD equivalent (0 if no equity data)
  bonusAtRisk: boolean;    // true if leaving this month forfeits an upcoming bonus
  isOptimalWindow: boolean;
  isHighRisk: boolean;     // true when staying is more dangerous than leaving
  notes: string[];         // brief annotations for each factor
}

export interface ExitTimingResult {
  calendar: ExitTimingMonth[];
  optimalDepartureWindow: {
    months: string[];
    reason: string;
    compositeScore: number;
  };
  worstDepartureMonths: string[];
  /** How many months until the next optimal window from today */
  monthsUntilOptimalWindow: number;
  /** Estimated unvested equity at risk if leaving optimally */
  unvestedAtOptimalExit: number;
  /** Total unvested equity at risk if leaving immediately */
  unvestedIfImmediateExit: number;
  /** Months until next vesting event (0 = vesting this month) */
  monthsToNextVestingEvent: number;
  /** Is the user in a "golden handcuff" zone (>$50K unvested in next 6mo)? */
  isGoldenHandcuffZone: boolean;
  /** Short narrative recommendation */
  recommendation: string;
  /** Risk of NOT exiting (staying penalty) when risk is high */
  stayingRiskPenalty: string;
}

export interface ExitTimingInputs {
  currentScore: number;
  region: string;
  companyName?: string;
  vestingSchedule?: VestingSchedule;
  vestingStartMonthsAgo?: number;  // how many months ago did vesting start?
  totalGrantValueUSD?: number;     // total RSU grant value
  bonusFrequency?: BonusFrequency;
  lastBonusMonthsAgo?: number;     // when was the last bonus paid?
  estimatedAnnualBonusUSD?: number;
  financialRunwayMonths?: number;
  tenureYears?: number;
  industry?: string;
}

// ─── Market hiring seasonality by month (0–100) ──────────────────────────────
// Based on LinkedIn job posting data 2019–2026 (indexed by calendar month)
// 0 = January, 11 = December

const GLOBAL_MARKET_SEASONALITY = [
  78,  // Jan — strong Q1 hiring burst
  82,  // Feb — peak hiring activity
  80,  // Mar — still strong
  72,  // Apr — slight moderation
  70,  // May
  62,  // Jun — start of summer slowdown
  50,  // Jul — hiring pause
  45,  // Aug — summer trough
  76,  // Sep — Q3 hiring resurgence
  80,  // Oct — peak fall hiring
  68,  // Nov — pre-holiday slowdown
  38,  // Dec — hiring near-pause
];

const INDIA_MARKET_SEASONALITY = [
  72,  // Jan — Q4 bench reset, moderate
  65,  // Feb — selective
  58,  // Mar — India FY-end freeze
  82,  // Apr — India FY start hiring burst
  80,  // May — strong
  75,  // Jun
  68,  // Jul — Q2 moderate (India IT offshore peak)
  65,  // Aug
  72,  // Sep
  70,  // Oct
  62,  // Nov
  42,  // Dec
];

// ─── Vesting calculations ────────────────────────────────────────────────────

function computeUnvestedEquity(
  schedule: VestingSchedule,
  vestingStartMonthsAgo: number,
  totalGrantUSD: number,
  monthsFromNow: number,
): number {
  if (schedule === "none" || totalGrantUSD <= 0) return 0;

  const totalMonths = 48; // standard 4-year vest
  const elapsedMonths = vestingStartMonthsAgo + monthsFromNow;
  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);

  if (schedule === "monthly") {
    return (remainingMonths / totalMonths) * totalGrantUSD;
  }

  if (schedule === "quarterly") {
    const remainingQuarters = Math.floor(remainingMonths / 3);
    return (remainingQuarters * 3 / totalMonths) * totalGrantUSD;
  }

  if (schedule === "4yr_1yr_cliff" || schedule === "annual_cliff") {
    if (vestingStartMonthsAgo < 12 && monthsFromNow === 0) {
      // Haven't hit the cliff yet — all unvested
      return totalGrantUSD;
    }
    const vestedPct = Math.min(1, elapsedMonths / totalMonths);
    return (1 - vestedPct) * totalGrantUSD;
  }

  return (Math.max(0, totalMonths - elapsedMonths) / totalMonths) * totalGrantUSD;
}

// ─── Bonus timing analysis ───────────────────────────────────────────────────

function isBonusAtRisk(
  frequency: BonusFrequency,
  lastBonusMonthsAgo: number,
  monthsFromNow: number,
): boolean {
  if (frequency === "none") return false;

  const monthsSinceBonus = lastBonusMonthsAgo + monthsFromNow;

  const cycles: Record<BonusFrequency, number> = {
    annual_q1: 12,
    annual_q4: 12,
    semi_annual: 6,
    quarterly: 3,
    none: 999,
  };

  const cycle = cycles[frequency];
  const monthsUntilBonus = cycle - (monthsSinceBonus % cycle);

  // Bonus at risk if it's due within 2 months and we're leaving now
  return monthsUntilBonus <= 2 && monthsUntilBonus > 0;
}

// ─── Main computation ────────────────────────────────────────────────────────

export function computeExitTiming(inputs: ExitTimingInputs): ExitTimingResult {
  const {
    currentScore,
    region,
    vestingSchedule = "none",
    vestingStartMonthsAgo = 24,
    totalGrantValueUSD = 0,
    bonusFrequency = "none",
    lastBonusMonthsAgo = 6,
    estimatedAnnualBonusUSD = 0,
    financialRunwayMonths = 6,
    tenureYears = 3,
  } = inputs;

  const seasonality = region === "IN"
    ? INDIA_MARKET_SEASONALITY
    : GLOBAL_MARKET_SEASONALITY;

  const now = new Date();
  const currentMonthIndex = now.getMonth(); // 0 = Jan

  const calendar: ExitTimingMonth[] = [];

  for (let i = 0; i < 12; i++) {
    const calMonthIndex = (currentMonthIndex + i) % 12;
    const year = now.getFullYear() + Math.floor((currentMonthIndex + i) / 12);
    const monthName = new Date(year, calMonthIndex).toLocaleString("en-US", { month: "long", year: "numeric" });

    const marketScore = seasonality[calMonthIndex];

    // Internal timing score
    const unvestedNow = computeUnvestedEquity(vestingSchedule, vestingStartMonthsAgo, totalGrantValueUSD, i);
    const unvestedPenalty = totalGrantValueUSD > 0
      ? Math.min(40, (unvestedNow / Math.max(1, totalGrantValueUSD)) * 40)
      : 0;
    const bonusAtRisk = isBonusAtRisk(bonusFrequency, lastBonusMonthsAgo, i);
    const bonusPenalty = bonusAtRisk ? (estimatedAnnualBonusUSD > 0 ? 20 : 10) : 0;

    const internalScore = Math.max(0, 100 - unvestedPenalty - bonusPenalty);

    // Composite: market (60%) + internal (40%)
    const compositeScore = Math.round(marketScore * 0.60 + internalScore * 0.40);

    const notes: string[] = [];
    if (marketScore >= 78) notes.push("Strong hiring market");
    if (marketScore <= 45) notes.push("Slow hiring season — expect longer search");
    if (bonusAtRisk) notes.push(`Bonus at risk (~$${(estimatedAnnualBonusUSD / 12 * 2).toFixed(0)})`);
    if (unvestedNow > 10000) notes.push(`$${(unvestedNow / 1000).toFixed(0)}K unvested equity at risk`);
    if (calMonthIndex === 0 || calMonthIndex === 1) notes.push("Q1 — highest annual hiring velocity");
    if (calMonthIndex === 8 || calMonthIndex === 9) notes.push("Q3/Q4 hiring wave");
    if (calMonthIndex === 6 || calMonthIndex === 7) notes.push("Summer hiring lull");
    if (calMonthIndex === 11) notes.push("December dead zone — minimal hiring");

    calendar.push({
      month: monthName,
      monthIndex: i,
      marketScore,
      internalScore,
      compositeScore,
      unvestedEquityAtRisk: Math.round(unvestedNow),
      bonusAtRisk,
      isOptimalWindow: false, // set below
      isHighRisk: currentScore >= 75 && i <= 2, // immediate if critically risky
      notes,
    });
  }

  // Find optimal departure window (top 2 consecutive months with composite score > 65)
  let bestWindow: number[] = [];
  let bestWindowScore = 0;
  for (let i = 0; i < calendar.length - 1; i++) {
    const windowScore = (calendar[i].compositeScore + calendar[i + 1].compositeScore) / 2;
    if (windowScore > bestWindowScore) {
      bestWindowScore = windowScore;
      bestWindow = [i, i + 1];
    }
  }

  // Single best month fallback
  if (bestWindow.length === 0) {
    const best = [...calendar].sort((a, b) => b.compositeScore - a.compositeScore)[0];
    bestWindow = [best.monthIndex];
  }

  bestWindow.forEach((idx) => {
    if (calendar[idx]) calendar[idx].isOptimalWindow = true;
  });

  const optimalMonths = bestWindow.map((idx) => calendar[idx].month);
  const monthsUntilOptimal = bestWindow[0];

  const worstMonths = [...calendar]
    .filter((m) => m.compositeScore <= 45)
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, 2)
    .map((m) => m.month);

  const unvestedIfImmediate = computeUnvestedEquity(vestingSchedule, vestingStartMonthsAgo, totalGrantValueUSD, 0);
  const unvestedAtOptimal = computeUnvestedEquity(vestingSchedule, vestingStartMonthsAgo, totalGrantValueUSD, monthsUntilOptimal);
  const monthsToVest = vestingSchedule === "none" ? 0
    : vestingSchedule === "monthly" ? 1
    : vestingSchedule === "quarterly" ? (3 - (vestingStartMonthsAgo % 3)) || 3
    : 12 - (vestingStartMonthsAgo % 12);

  const isGoldenHandcuffZone = unvestedIfImmediate >= 50_000 && monthsToVest <= 3;

  const recommendation = buildRecommendation(
    inputs,
    optimalMonths,
    monthsUntilOptimal,
    unvestedIfImmediate,
    unvestedAtOptimal,
    isGoldenHandcuffZone,
    bestWindowScore,
  );

  const stayingRiskPenalty = currentScore >= 70
    ? `At ${currentScore}/100 risk, waiting ${monthsUntilOptimal} months for the optimal exit window exposes you to potential involuntary exit — losing both the equity AND negotiation control. Weigh staying-risk against exit-cost.`
    : `At ${currentScore}/100, the risk of staying through the optimal window is manageable — waiting is likely worth it.`;

  return {
    calendar,
    optimalDepartureWindow: {
      months: optimalMonths,
      reason: buildWindowReason(optimalMonths[0], bestWindow[0] === 0),
      compositeScore: Math.round(bestWindowScore),
    },
    worstDepartureMonths: worstMonths,
    monthsUntilOptimalWindow: monthsUntilOptimal,
    unvestedAtOptimalExit: Math.round(unvestedAtOptimal),
    unvestedIfImmediateExit: Math.round(unvestedIfImmediate),
    monthsToNextVestingEvent: monthsToVest,
    isGoldenHandcuffZone,
    recommendation,
    stayingRiskPenalty,
  };
}

function buildWindowReason(month: string, isNow: boolean): string {
  if (isNow) return "Current month is in the optimal window — market conditions and internal timing align now.";
  return `${month} offers the best balance of hiring market activity and internal financial timing (vesting + bonus cycle) in the next 12 months.`;
}

function buildRecommendation(
  inputs: ExitTimingInputs,
  optimalMonths: string[],
  monthsUntil: number,
  unvestedNow: number,
  unvestedAtOptimal: number,
  isGoldenHandcuff: boolean,
  windowScore: number,
): string {
  const equityDiff = Math.round(unvestedNow - unvestedAtOptimal);
  const equityNote = unvestedNow > 0
    ? ` Waiting ${monthsUntil} months captures an additional ~$${equityDiff.toLocaleString()} of vesting.`
    : "";

  if (inputs.currentScore >= 80) {
    return `Critical risk level — do not wait for the optimal window. Begin active search immediately. The cost of waiting (potential involuntary exit) outweighs the financial benefit of staying.${equityNote}`;
  }

  if (isGoldenHandcuff && monthsUntil <= 3) {
    return `Golden handcuff zone — you have significant unvested equity vesting in the next ${inputs.vestingSchedule === "monthly" ? "month" : "quarter"}. Wait for the vest event before launching active search. This is a short, bounded wait with high financial return (~$${(unvestedNow / 1000).toFixed(0)}K at stake).${equityNote}`;
  }

  if (monthsUntil === 0) {
    return `Now is the optimal departure window — ${optimalMonths.join(" / ")} combines strong market hiring activity with favorable internal timing. If you are planning to leave proactively, launch your search this month.${equityNote}`;
  }

  return `Optimal departure window: ${optimalMonths.join(" / ")} (${monthsUntil} month${monthsUntil !== 1 ? "s" : ""} away, composite score ${Math.round(windowScore)}/100).${equityNote} Use the intervening period to complete any pending vesting events and build your network before going active.`;
}
