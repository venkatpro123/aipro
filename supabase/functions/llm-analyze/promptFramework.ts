export const CANONICAL_QUESTIONS = [
  'primaryRiskDriver',
  'sixMonthInactionConsequence',
  'oneActionThisWeek',
  'whatChangesRiskMost',
  'estimatedTimeline',
  'keyProtectiveFactor',
] as const;

export type CanonicalQuestionKey = (typeof CANONICAL_QUESTIONS)[number];

export interface NormalizedAnalyzeRequest {
  companyName: string;
  roleTitle: string;
  industry: string;
  engineScore: number;
  engineBreakdown: Record<string, number>;
  signalContext: {
    stock90DayChange: number | null;
    revenueGrowthYoY: number | null;
    layoffRounds24m: number;
    lastLayoffMonthsAgo: number | null;
    lastLayoffPercent: number | null;
    recentLayoffHeadlines: number | null;
    aiInvestmentSignal: string;
    collapseStage: number | null;
    peerContagionCount: number | null;
    employeeCount: number | null;
    revenuePerEmployee: number | null;
    isPublic: boolean;
    region: string;
    experienceYears: number | null;
    tenureYears: number | null;
    performanceTier: string;
    uniquenessDepth: string;
    hasRecentPromotion: boolean;
    hasKeyRelationships: boolean;
    isReturningUser: boolean;
    previousScore: number | null;
    scoreDelta: number | null;
    daysSinceLastAudit: number | null;
    dataSource: string;
    dataFreshnessDays: number | null;
    dataSourceType: string;
  };
  userFactors: {
    tenureYears: number;
    performanceTier: string;
    isUniqueRole: boolean;
    uniquenessDepth: string;
    hasRecentPromotion: boolean;
    hasKeyRelationships: boolean;
  };
  historicalPatternCandidates: string | null;
  responseFormat: {
    questions: CanonicalQuestionKey[];
    questionMinWords: Record<CanonicalQuestionKey, number>;
    systemPrompt: string;
    priorityInstruction: string;
    outputFormat: string;
  };
}

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

export interface NormalizedModelResponse {
  primaryRiskDriver: string;
  sixMonthInactionConsequence: string;
  oneActionThisWeek: string;
  whatChangesRiskMost: string;
  estimatedTimeline: string;
  keyProtectiveFactor: string;
  patternId: string | null;
  urgencyLevel: string;
  synthesis: string;
  dominantRiskFactor: string;
  timeHorizon: string;
}

const DEFAULT_MIN_WORDS: Record<CanonicalQuestionKey, number> = {
  primaryRiskDriver: 50,
  sixMonthInactionConsequence: 80,
  oneActionThisWeek: 90,
  whatChangesRiskMost: 75,
  estimatedTimeline: 45,
  keyProtectiveFactor: 40,
};

const URGENCY_MAP = {
  critical: 'Immediate',
  high: 'High',
  medium: 'Moderate',
  low: 'Low',
} as const;

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatSignedPercent(value: number | null): string {
  if (value == null) return 'unknown';
  return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
}

function formatCount(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'unknown';
  return Math.round(value).toLocaleString('en-US');
}

function formatCurrencyPerEmployee(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'unknown';
  return `$${Math.round(value / 1000)}k`;
}

function normalizeBreakdownValue(value: unknown): number {
  const parsed = toNumber(value, 0) ?? 0;
  if (parsed > 0 && parsed <= 1) return Math.round(parsed * 100);
  return Math.round(parsed);
}

function normalizeQuestionKey(value: unknown): CanonicalQuestionKey | null {
  const normalized = toString(value).trim();
  return CANONICAL_QUESTIONS.includes(normalized as CanonicalQuestionKey)
    ? (normalized as CanonicalQuestionKey)
    : null;
}

function normalizeQuestions(raw: unknown): CanonicalQuestionKey[] {
  const items = Array.isArray(raw) ? raw : [];
  const normalized = items
    .map(normalizeQuestionKey)
    .filter((item): item is CanonicalQuestionKey => item !== null);

  if (normalized.length === CANONICAL_QUESTIONS.length) {
    return normalized;
  }

  return [...CANONICAL_QUESTIONS];
}

function normalizeMinWords(raw: unknown): Record<CanonicalQuestionKey, number> {
  const obj = toRecord(raw);
  const output = {} as Record<CanonicalQuestionKey, number>;

  for (const key of CANONICAL_QUESTIONS) {
    const parsed = toNumber(obj[key], DEFAULT_MIN_WORDS[key]) ?? DEFAULT_MIN_WORDS[key];
    output[key] = Math.max(DEFAULT_MIN_WORDS[key], Math.round(parsed));
  }

  return output;
}

function computeCalibration(score: number) {
  if (score >= 75) {
    return {
      urgencyLevel: 'Immediate',
      urgencyToken: 'critical',
      timeHorizon: 'Immediate (< 12 months)',
    };
  }
  if (score >= 55) {
    return {
      urgencyLevel: 'High',
      urgencyToken: 'high',
      timeHorizon: '12-24 months',
    };
  }
  if (score >= 35) {
    return {
      urgencyLevel: 'Moderate',
      urgencyToken: 'medium',
      timeHorizon: '3-5 years',
    };
  }
  return {
    urgencyLevel: 'Low',
    urgencyToken: 'low',
    timeHorizon: '5-10 years',
  };
}

function normalizeSignalContext(raw: unknown) {
  const obj = toRecord(raw);
  return {
    stock90DayChange: toNumber(obj.stock_90d_change ?? obj.stock90DayChange),
    revenueGrowthYoY: toNumber(obj.revenue_growth_yoy ?? obj.revenueGrowthYoY),
    layoffRounds24m: toNumber(obj.layoff_rounds_24m ?? obj.layoffRounds ?? obj.layoffRounds24m, 0) ?? 0,
    lastLayoffMonthsAgo: toNumber(obj.last_layoff_months_ago),
    lastLayoffPercent: toNumber(obj.last_layoff_percent ?? obj.lastLayoffPercent),
    recentLayoffHeadlines: toNumber(obj.recent_layoff_headlines ?? obj.recentLayoffHeadlines),
    aiInvestmentSignal: toString(obj.ai_investment_signal ?? obj.aiInvestmentSignal, 'medium'),
    collapseStage: toNumber(obj.collapse_stage),
    peerContagionCount: toNumber(obj.peer_contagion_count),
    employeeCount: toNumber(obj.employee_count ?? obj.employeeCount),
    revenuePerEmployee: toNumber(obj.revenue_per_employee ?? obj.revenuePerEmployee),
    isPublic: toBoolean(obj.is_public ?? obj.isPublic),
    region: toString(obj.region, 'GLOBAL'),
    experienceYears: toNumber(obj.experience_years),
    tenureYears: toNumber(obj.tenure_years),
    performanceTier: toString(obj.performance_tier, 'unknown'),
    uniquenessDepth: toString(obj.uniqueness_depth, 'generic'),
    hasRecentPromotion: toBoolean(obj.has_recent_promotion ?? obj.hasRecentPromotion),
    hasKeyRelationships: toBoolean(obj.has_key_relationships ?? obj.hasKeyRelationships),
    isReturningUser: toBoolean(obj.is_returning_user),
    previousScore: toNumber(obj.previous_score),
    scoreDelta: toNumber(obj.score_delta),
    daysSinceLastAudit: toNumber(obj.days_since_last_audit),
    dataSource: toString(obj.data_source ?? obj.dataSource, 'static_db'),
    dataFreshnessDays: toNumber(obj.data_freshness_days ?? obj.dataFreshnessDays),
    dataSourceType: toString(obj.data_source_type ?? obj.dataSourceType, 'static_db'),
  };
}

function normalizeUserFactors(raw: unknown, signalContext: ReturnType<typeof normalizeSignalContext>) {
  const obj = toRecord(raw);
  return {
    tenureYears: toNumber(obj.tenureYears, signalContext.tenureYears ?? 0) ?? 0,
    performanceTier: toString(obj.performanceTier, signalContext.performanceTier || 'unknown'),
    isUniqueRole: toBoolean(obj.isUniqueRole),
    uniquenessDepth: toString(obj.uniquenessDepth, signalContext.uniquenessDepth || 'generic'),
    hasRecentPromotion: toBoolean(obj.hasRecentPromotion, signalContext.hasRecentPromotion),
    hasKeyRelationships: toBoolean(obj.hasKeyRelationships, signalContext.hasKeyRelationships),
  };
}

export function normalizeAnalyzeRequest(raw: unknown): NormalizedAnalyzeRequest {
  const obj = toRecord(raw);
  const signalContext = normalizeSignalContext(obj.signalContext);
  const userFactors = normalizeUserFactors(obj.userFactors, signalContext);
  const responseFormatRaw = toRecord(obj.responseFormat);
  const responseFormat = {
    questions: normalizeQuestions(responseFormatRaw.questions),
    questionMinWords: normalizeMinWords(responseFormatRaw.questionMinWords),
    systemPrompt: toString(
      responseFormatRaw.systemPrompt,
      'Every claim must be traceable to the provided signals. Do not speculate.',
    ),
    priorityInstruction: toString(responseFormatRaw.priorityInstruction),
    outputFormat: toString(responseFormatRaw.outputFormat, 'structured_json'),
  };

  return {
    companyName: toString(obj.companyName),
    roleTitle: toString(obj.roleTitle),
    industry: toString(obj.industry, 'Unknown'),
    engineScore: Math.max(0, Math.min(100, Math.round(toNumber(obj.engineScore, 0) ?? 0))),
    engineBreakdown: {
      L1: normalizeBreakdownValue(toRecord(obj.engineBreakdown).L1),
      L2: normalizeBreakdownValue(toRecord(obj.engineBreakdown).L2),
      L3: normalizeBreakdownValue(toRecord(obj.engineBreakdown).L3),
      L4: normalizeBreakdownValue(toRecord(obj.engineBreakdown).L4),
      L5: normalizeBreakdownValue(toRecord(obj.engineBreakdown).L5),
      D6: normalizeBreakdownValue(toRecord(obj.engineBreakdown).D6),
      D7: normalizeBreakdownValue(toRecord(obj.engineBreakdown).D7),
    },
    signalContext,
    userFactors,
    historicalPatternCandidates: obj.historicalPatternCandidates == null
      ? null
      : toString(obj.historicalPatternCandidates),
    responseFormat,
  };
}

function buildDataQualityDirective(req: NormalizedAnalyzeRequest, timeHorizon: string) {
  const { signalContext: sc } = req;
  const age = sc.dataFreshnessDays;
  const ageText = age == null ? 'unknown freshness' : `${Math.round(age)} day freshness`;
  const freshnessFlag =
    age == null
      ? 'Freshness unknown: explicitly call out the uncertainty created by missing timestamps.'
      : age > 90
        ? `Freshness is degraded (${ageText}): hedge hard, emphasize what could have changed since the signals were captured.`
        : age > 30
          ? `Freshness is moderate (${ageText}): acknowledge that near-term market conditions may have shifted.`
          : `Freshness is acceptable (${ageText}): use firmer language, but still stay anchored to the supplied evidence.`;

  return [
    `Data source type: ${sc.dataSourceType}.`,
    `Data source label: ${sc.dataSource}.`,
    `Calibrated time horizon is fixed at "${timeHorizon}". Do not change it.`,
    freshnessFlag,
  ].join(' ');
}

function buildUserProfile(req: NormalizedAnalyzeRequest): string {
  const { userFactors, signalContext: sc } = req;
  return [
    `Role: ${req.roleTitle}`,
    `Industry: ${req.industry}`,
    `Tenure: ${userFactors.tenureYears} years`,
    `Experience: ${formatCount(sc.experienceYears)}`,
    `Performance tier: ${userFactors.performanceTier}`,
    `Uniqueness depth: ${userFactors.uniquenessDepth}`,
    `Recent promotion: ${userFactors.hasRecentPromotion}`,
    `Key relationships: ${userFactors.hasKeyRelationships}`,
    `Returning user: ${sc.isReturningUser}${sc.scoreDelta != null ? ` (delta ${sc.scoreDelta > 0 ? '+' : ''}${Math.round(sc.scoreDelta)} pts)` : ''}`,
  ].join(' | ');
}

function buildSignalSummary(req: NormalizedAnalyzeRequest): string {
  const { engineBreakdown: b, signalContext: sc } = req;
  const layoffSummary = sc.layoffRounds24m === 0
    ? '0 rounds in 24 months'
    : `${sc.layoffRounds24m} rounds in 24 months${sc.lastLayoffPercent != null ? `, last cut ${Math.round(sc.lastLayoffPercent)}%` : ''}`;

  return [
    `Overall score: ${req.engineScore}/100`,
    `Breakdown: L1 ${b.L1}/100, L2 ${b.L2}/100, L3 ${b.L3}/100, L4 ${b.L4}/100, L5 ${b.L5}/100, D6 ${b.D6}/100, D7 ${b.D7}/100`,
    `Stock 90d: ${formatSignedPercent(sc.stock90DayChange)}`,
    `Revenue YoY: ${formatSignedPercent(sc.revenueGrowthYoY)}`,
    `Layoff history: ${layoffSummary}`,
    `Last layoff recency: ${sc.lastLayoffMonthsAgo == null ? 'unknown' : `${Math.round(sc.lastLayoffMonthsAgo)} months ago`}`,
    `Recent layoff headlines: ${formatCount(sc.recentLayoffHeadlines)}`,
    `AI investment: ${sc.aiInvestmentSignal}`,
    `Collapse stage: ${sc.collapseStage == null ? 'none' : sc.collapseStage}`,
    `Peer contagion count: ${formatCount(sc.peerContagionCount)}`,
    `Employees: ${formatCount(sc.employeeCount)}`,
    `Revenue per employee: ${formatCurrencyPerEmployee(sc.revenuePerEmployee)}`,
    `Public company: ${sc.isPublic}`,
    `Region: ${sc.region}`,
  ].join('\n');
}

function buildActionFramework(req: NormalizedAnalyzeRequest, urgencyLevel: string): string {
  const minWords = req.responseFormat.questionMinWords;
  return [
    `Solve the user's actual decision problem, not a generic risk explanation.`,
    `For "primaryRiskDriver" (minimum ${minWords.primaryRiskDriver} words): identify the dominant mechanism, cite the strongest numerical signals, and explain why it dominates the other layers.`,
    `For "sixMonthInactionConsequence" (minimum ${minWords.sixMonthInactionConsequence} words): describe the most likely downside if the user does nothing for 6 months. Tie it to actual timing, market conditions, or known signal deterioration.`,
    `For "oneActionThisWeek" (minimum ${minWords.oneActionThisWeek} words): give one action that can start within 7 days, includes a visible proof point, and names at least one concrete number.`,
    `For "whatChangesRiskMost" (minimum ${minWords.whatChangesRiskMost} words): return EXACTLY 3 ranked options using the format "1. ...", "2. ...", "3. ...". Each option must say which signal it changes and how.`,
    `For "estimatedTimeline" (minimum ${minWords.estimatedTimeline} words): keep the fixed calibrated horizon, explain the compression or buffer drivers, and mention collapse-stage effects if present.`,
    `For "keyProtectiveFactor" (minimum ${minWords.keyProtectiveFactor} words): identify the strongest real protective factor using provided inputs only.`,
    `Urgency level is fixed at "${urgencyLevel}". Do not downgrade or upgrade it.`,
    `Do not use motivational filler, vague encouragement, or generic best practices.`,
  ].join(' ');
}

function buildPatternDirective(patterns: string | null): string {
  if (!patterns) {
    return 'No pre-qualified historical pattern candidates cleared the threshold. Return "patternId": null.';
  }
  return [
    'Historical pattern candidates are pre-qualified below.',
    'Return exactly one candidate patternId from the provided list if the overlap is strong, otherwise return null.',
    'Never invent a new patternId.',
    patterns,
  ].join('\n');
}

function buildResponseSchema(req: NormalizedAnalyzeRequest, urgencyLevel: string) {
  const calibration = computeCalibration(req.engineScore);
  return `Return ONLY valid JSON with exactly these keys:
{
  "primaryRiskDriver": "<string>",
  "sixMonthInactionConsequence": "<string>",
  "oneActionThisWeek": "<string>",
  "whatChangesRiskMost": "<string>",
  "estimatedTimeline": "<string that explicitly references ${calibration.timeHorizon} and explains the timing drivers>",
  "keyProtectiveFactor": "<string>",
  "patternId": "<candidate id or null>",
  "urgencyLevel": "${urgencyLevel}",
  "synthesis": "<2-3 sentence synthesis grounded in the same signals>"
}`;
}

function computeMaxTokens(minWords: Record<CanonicalQuestionKey, number>): number {
  const totalMinWords = CANONICAL_QUESTIONS.reduce((sum, key) => sum + minWords[key], 0);
  const estimatedTokens = Math.ceil(totalMinWords * 1.8) + 180;
  return Math.max(700, Math.min(1500, estimatedTokens));
}

export function buildPromptPackage(req: NormalizedAnalyzeRequest): PromptPackage {
  const calibration = computeCalibration(req.engineScore);
  const dataQualityDirective = buildDataQualityDirective(req, calibration.timeHorizon);
  const systemSegments = [
    'You are HumanProof\'s market-dominance intelligence layer.',
    req.responseFormat.systemPrompt,
    'Your job is to transform a risk score into a precise, decision-ready briefing.',
    'Every sentence must map to the supplied evidence. Never invent company facts, job openings, market shifts, or pattern IDs.',
  ];

  const userSegments = [
    `QUESTION PRIORITY: ${req.responseFormat.questions.join(', ')}`,
    req.responseFormat.priorityInstruction || 'Follow the canonical question order and meet every minimum word count.',
    `USER PROFILE\n${buildUserProfile(req)}`,
    `SIGNAL SNAPSHOT\n${buildSignalSummary(req)}`,
    `DATA QUALITY\n${dataQualityDirective}`,
    `ACTION FRAMEWORK\n${buildActionFramework(req, calibration.urgencyLevel)}`,
    `HISTORICAL PATTERN RESOLUTION\n${buildPatternDirective(req.historicalPatternCandidates)}`,
    buildResponseSchema(req, calibration.urgencyLevel),
  ];

  return {
    systemPrompt: systemSegments.join(' '),
    userPrompt: userSegments.join('\n\n'),
    maxTokens: computeMaxTokens(req.responseFormat.questionMinWords),
  };
}

function canonicalUrgency(value: unknown, fallback: string): string {
  const raw = toString(value).trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  return URGENCY_MAP[lower as keyof typeof URGENCY_MAP] ?? raw;
}

export function normalizeModelResponse(
  parsed: unknown,
  req: NormalizedAnalyzeRequest,
): NormalizedModelResponse {
  const obj = toRecord(parsed);
  const calibration = computeCalibration(req.engineScore);
  const primaryRiskDriver = toString(obj.primaryRiskDriver ?? obj.dominantRiskFactor);
  const estimatedTimeline = toString(obj.estimatedTimeline ?? obj.timeHorizon, calibration.timeHorizon);
  return {
    primaryRiskDriver,
    sixMonthInactionConsequence: toString(obj.sixMonthInactionConsequence),
    oneActionThisWeek: toString(obj.oneActionThisWeek),
    whatChangesRiskMost: toString(obj.whatChangesRiskMost),
    estimatedTimeline,
    keyProtectiveFactor: toString(obj.keyProtectiveFactor),
    patternId: obj.patternId == null ? null : toString(obj.patternId),
    urgencyLevel: canonicalUrgency(obj.urgencyLevel, calibration.urgencyLevel),
    synthesis: toString(obj.synthesis),
    dominantRiskFactor: primaryRiskDriver,
    timeHorizon: estimatedTimeline,
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasSpecificNumber(text: string): boolean {
  return /\d[\d,]*(?:\.\d+)?/.test(text);
}

function hasRankedOptions(text: string): boolean {
  return /\b1[\.\)]\s.+\b2[\.\)]\s.+\b3[\.\)]\s/i.test(text.replace(/\n/g, ' '));
}

export function validateModelResponse(
  response: NormalizedModelResponse,
  req: NormalizedAnalyzeRequest,
): string[] {
  const failures: string[] = [];
  const minWords = req.responseFormat.questionMinWords;
  const calibration = computeCalibration(req.engineScore);

  for (const key of CANONICAL_QUESTIONS) {
    const value = response[key];
    if (!value || wordCount(value) < minWords[key]) {
      failures.push(`${key}: got ${wordCount(value)} words, required >= ${minWords[key]}`);
    }
  }

  if (!response.synthesis || wordCount(response.synthesis) < 20) {
    failures.push('synthesis: needs at least 20 words of grounded summary');
  }

  if (!hasSpecificNumber(response.oneActionThisWeek)) {
    failures.push('oneActionThisWeek: must contain at least one concrete number');
  }

  if (!hasRankedOptions(response.whatChangesRiskMost)) {
    failures.push('whatChangesRiskMost: must contain exactly 3 ranked options');
  }

  if (response.urgencyLevel !== calibration.urgencyLevel) {
    failures.push(
      `urgencyLevel: expected "${calibration.urgencyLevel}" but got "${response.urgencyLevel}"`,
    );
  }

  if (!response.estimatedTimeline.includes(calibration.timeHorizon)) {
    failures.push(
      `estimatedTimeline: must explicitly reference "${calibration.timeHorizon}"`,
    );
  }

  if (
    response.patternId &&
    req.historicalPatternCandidates &&
    !req.historicalPatternCandidates.includes(response.patternId)
  ) {
    failures.push(`patternId: "${response.patternId}" not present in candidate list`);
  }

  if (response.patternId && !req.historicalPatternCandidates) {
    failures.push('patternId: must be null when no pattern candidates were supplied');
  }

  return failures;
}
