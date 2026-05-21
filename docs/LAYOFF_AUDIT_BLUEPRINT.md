# Layoff Audit — System Blueprint

> HumanProof v40.0 / May 2026
> A full technical and functional walkthrough of the Layoff Audit engine: every UI surface, every pipeline phase, every data source, and the intelligence layers that produce the final number on screen.

This document is grounded in the current state of the codebase. File paths point at the
authoritative source so a reader can step from blueprint to implementation in one click.

---

## 0. One-paragraph summary

The Layoff Audit takes a `(company, role, region, experience, optional profile)` request
and returns a **0–100 risk score** plus a personalized decision-driven dashboard. The
score is computed by a 9-term blended scoring formula (L1–L5 + D2/D3/D6/D7/D8), wrapped
by an empirical calibration layer, gated by floor / kill-switch rules, and surrounded by
**55 pipeline steps** that produce ~50 supporting result fields (visa risk, peer
contagion, financial runway, contingency plan, intelligence brief, etc.). The dashboard
exposes those fields across **6 tabs** with adaptive ordering and tier-badged
disclosure. Tier A (deterministic narrative templates) ships always; Tier B (an LLM
brief) overlays on top when live signals + cohort + profile context permit. Data
sources span 14 connectors (Naukri, layoffs.fyi, SEC EDGAR, BLS, RSS news, Yahoo
Finance, WARN, BSE, MCA, Wikipedia, Glassdoor, etc.), 27 Supabase Edge Functions, and
a 150+ migration Supabase schema with RLS-enforced isolation.

---

## 1. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  React 18 + Vite + TS frontend                                                │
│  ──────────────────────────────────────────────────────────────────────       │
│  LayoffCalculator (entry)                                                     │
│       │                                                                       │
│       ▼                                                                       │
│  auditDataPipeline.runAuditPipeline(inputs)                                   │
│       │                                                                       │
│       ├── Phase 1: Company & data resolution (Steps 1–6)                      │
│       ├── Phase 2: Live signal quorum + scraping (Step 5–6)                   │
│       ├── Phase 3: Score engine (calculateLayoffScore)                        │
│       │            → L1..L5 + D2/D3/D6/D7/D8 → blended → calibrated           │
│       │              → floored → adjusted → final 0–100                       │
│       ├── Phase 4: 55 intelligence layers (escape paths, visa risk,           │
│       │            contagion, runway, scenarios, contingency, brief…)         │
│       ├── Phase 5: HybridResult assembly + IndexedDB cache write              │
│       │                                                                       │
│       ▼                                                                       │
│  LayoffAuditDashboardV3 (6 tabs)                                              │
│       Summary · Company · Protection · Action Plan · Intelligence · Methodology│
└───────────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ row reads / writes
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)             │
│  ──────────────────────────────────────────────────────────────────────       │
│  • company_intelligence (~2,000+ rows, RLS read-only)                         │
│  • curated_layoff_events (verified events with date + percent + source)       │
│  • market_intelligence_cache (per-role + per-region opening counts)           │
│  • engine_calibration_constants (ops-overridable runtime constants)           │
│  • scrape_jobs (BullMQ-style job queue with started_at + priority)            │
│  • breaking_news_events (RSS-ingested events)                                 │
│  • user_profiles (visa, runway, tenure, dependents, locale)                   │
│  • user_prediction_outcomes (ground-truth ledger for calibration)             │
│  • synthetic_score_probes + calibration_drift_events                          │
│  • intelligence_briefs (24h TTL, profile_signature-keyed cache)               │
│  • api_circuit_status (per-API breaker state for rate limits)                 │
│  • pipeline_runs (request_id-tagged audit trace)                              │
│  • layer_fallback_log (every fallback path that fires)                        │
│                                                                               │
│  Edge Functions (Deno):                                                       │
│  • llm-analyze              (Tier A brief via Claude)                         │
│  • calculate-hybrid-risk    (server-side score authority)                     │
│  • calculate-grounded-risk  (subset for unknown-co recovery)                  │
│  • compute-oracle           (role/skill resolution)                           │
│  • scrape-workforce-snapshot (Naukri + Yahoo + Wikipedia)                     │
│  • scrape-job-sweeper       (workers → scrape_jobs writeback)                 │
│  • ingest-careers / ingest-news / ingest-github / ingest-analytics            │
│  • proxy-live-signals / proxy-macro (rate-limit firewall)                     │
│  • recalibrate-engine       (cron, regression on outcome ledger)              │
│  • outcome-ingestion        (writes user_prediction_outcomes)                 │
│  • synthetic-probe          (cron, calibration drift detection)               │
│  • schedule-outcome-prompts (cron, asks users for ground truth at horizon)    │
│  • send-monthly-report      (cron, individual + team digests)                 │
│  • health-probe             (cron, EF degradation tracking)                   │
│  • evaluate-adaptive-quiz / generate-adaptive-quiz / generate-learning-paths  │
│  • audit-coalesce           (idempotent per-user audit dedup)                 │
└───────────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ scheduled scrapes / live polls
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  External Sources (14 connectors)                                             │
│  ──────────────────────────────────────────────────────────────────────       │
│  • layoffs.fyi (verified layoff events)                                       │
│  • SEC EDGAR (10-K/8-K filings, FCF, FY headcount)                            │
│  • WARN Act (US state filings — 60-day advance notice)                        │
│  • BLS / FRED (macro: JOLTS, unemployment, sector growth)                     │
│  • Yahoo Finance (stock 90d, market cap, fullTimeEmployees)                   │
│  • Wikipedia (template-aware company infobox parser)                          │
│  • Glassdoor / AmbitionBox (CEO approval, review velocity)                    │
│  • Naukri (India job openings + hiring velocity)                              │
│  • Indeed, Reed, StepStone, JobStreet, Job Bank, SEEK, Bayt, EURES…           │
│  • BSE + MCA (India regulatory filings)                                       │
│  • Google RSS + Bing RSS + HN + Reddit (breaking news)                        │
│  • Indian press (Economic Times, Mint, Moneycontrol via RSS)                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

The frontend is a Vite SPA. The full audit pipeline runs client-side for low latency
(no audit-time round-trip), with edge functions handling: (a) authoritative scoring
shadow, (b) LLM brief, (c) scraping orchestration, (d) ingestion, (e) calibration
maintenance. **Supabase is the canonical store for everything that must persist
across devices or sessions.** Browser localStorage and IndexedDB are used for
non-authoritative caches (recent history, offline fallback).

---

## 2. The 6-Tab UI — what the user actually sees

The dashboard component is [LayoffAuditDashboardV3](../artifacts/humanproof/src/components/AuditTabs/v3/LayoffAuditDashboardV3.tsx).
It renders a **sticky top bar** (company name + score chip), then 6 **lazy-loaded tabs**
(code-split for first-paint perf), and on mobile a **fixed bottom navigation bar**.

The default tab is **adaptive**: `useDashboardAdaptation()` picks the landing tab
based on the user's situation —

| Situation                                | Lands on            |
|------------------------------------------|---------------------|
| Score ≥ 75 OR WARN active                | Action Plan         |
| Low confidence (< 60%)                   | Intelligence        |
| Score < 35 (stable)                      | Protection          |
| Otherwise (default)                      | Summary             |

Every tab has a **live badge** computed from the result: e.g. Company tab shows
`WARN` (red) when WARN signal active, or `N× layoffs` (orange) when layoffRounds ≥ 2;
Action Plan shows `N critical`; Intelligence shows `N live` for live-signal count.

### 2.1 Summary tab — [SummaryTab.tsx](../artifacts/humanproof/src/components/AuditTabs/v3/SummaryTab.tsx)

The "executive summary" surface. Optimised for first-time users who have to make a
go/no-go decision in 30 seconds.

| Block                       | Tier | Source / Logic                                                                                                                                    |
|-----------------------------|------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **FirstAuditWelcome**       | T0   | Shown only on first audit. 4-step wizard introducing the dashboard. Dynamic step values driven by user-profile completeness + confidence.        |
| **ScoreRingHero**           | T1   | The animated dual-backdrop score ring — `result.total`, color-banded by `riskColor()` (red/orange/amber/green at 75/55/35), screen-reader labelled. |
| **Confidence chip**         | T1   | `result.confidencePercent` with mode label (live / mixed / heuristic). Hard 60% cap when only first-audit live quorum reached.                    |
| **PersonalRiskModifier**    | T1   | When `personalRiskModifier.adjustmentPts ≥ 0.5` — surfaces the signed L55 modifier ("+3 pts due to H1B visa + 2 dependents + 4mo runway").         |
| **TopDriversStrip**         | T1   | Top 5 signal contributors (raised from threshold 35 in v39 F4). Click "View all" → emits `hp.dashboard.navigate` to Intelligence tab.             |
| **ImmediateActionsStrip**   | T1   | Top 3 Critical-priority actions from `result.recommendations`. Tappable → Action Plan tab.                                                        |
| **CompanyPulseCard**        | T2   | Compressed Workforce + Financial verdict (subsumes the old WorkforceStability + FinancialHealth cards). "Stable / Mixed / Stressed / Critical".  |
| **Live signals chip**       | T2   | Count of live data sources used + freshness verdict from `freshnessUnifier`.                                                                      |

### 2.2 Company tab — [IntelligenceTab.tsx](../artifacts/humanproof/src/components/AuditTabs/v3/IntelligenceTab.tsx)

> Filename is historical; in the IA this is the "Company" tab.

The company-side intelligence surface. Answers "is the COMPANY in trouble?"

| Block                       | Tier | Source / Logic                                                                                                                                    |
|-----------------------------|------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **CompanyPulseCard**        | T1   | Re-rendered here as the anchor. Pulls signal verdicts from `signalCompressionService`.                                                            |
| **Ground Truth signals**    | T2   | `WARNSignalPanel` (state-level filings + days until effective) + `SECEnhancedPanel` (FCF margin, earnings surprise) + `BLSMacroPanel` (JOLTS). Open if any active. |
| **Market Environment**      | T3   | `RoleMarketDemandPanel` + `PeerContagionPanel` + `MacroRiskPanel`. Closed by default unless emergency mode.                                       |
| **EventSearchPanel**        | T3   | Cross-source event timeline (breaking_news_events + layoffs.fyi + WARN). Lazy-loaded.                                                            |

### 2.3 Protection tab — [ProtectionTab.tsx](../artifacts/humanproof/src/components/AuditTabs/v3/ProtectionTab.tsx)

Personal-career-intelligence surface — "what's MY exposure and what defensive capital
do I have?". Section ordering is **adaptive**:

- Emergency mode → market liquidity first (escape paths matter most)
- Low readiness → skill risk first
- Otherwise → preparedness hero first

Blocks: `PreparednessScorePanel`, `SkillGapIntelligencePanel`, `SkillPortfolioPanel`,
`CareerConfidencePanel`, `CareerContingencyPanel` (STAY / NEGOTIATE / TRANSITION),
`RoleMarketDemandPanel`, `CareerPortfolioPanel`, plus a nested "Personal context"
`AdaptiveBlock` with `CareerVelocityPanel` + `VisaRiskPanel` (with v40.0 MENA gratuity
card) + `UserFinancialRunwayPanel`.

### 2.4 Action Plan tab — [ActionsTab.tsx](../artifacts/humanproof/src/components/AuditTabs/v3/ActionsTab.tsx)

Where users in emergency mode land directly. Layout:

1. **Emergency callout** (T1, only in emergency mode) — full-bleed banner with
   72-hour protocol from `emergencyResponseProtocol`.
2. **Career Contingency Plan** (T1) — `CareerContingencyPanel` with STAY /
   NEGOTIATE / TRANSITION paths, each carrying a "BEST FIT FOR YOU · N%" badge
   when profile signals exist.
3. **Priority Action Matrix** (T1) — top 5 priority-sorted actions with effort/phase/
   evidence badges. "Critical" actions are red-bordered with `AlertTriangle` icon.
4. **Complete action plan** (T3, collapsed) — full `ActionPlanTab` content. v39 B6
   honest "Generic guidance" vs "Tailored to your situation" cards when the role
   isn't in the 412-deeply-personalised database.
5. **Strategic plan & negotiation** (T3, collapsed) — `StrategyTab` content
   (role-specific negotiation scripts with v35.0 visa + family + equity appendices).
6. **ProfileQuickCapture** — inline prompt to fill missing profile fields when
   action specificity is reduced by their absence.

### 2.5 Intelligence tab — [AnalysisTab.tsx](../artifacts/humanproof/src/components/AuditTabs/v3/AnalysisTab.tsx)

The deep "tell me more" surface. Always last among non-methodology tabs.

| Block                       | Tier | Source / Logic                                                                                                                                    |
|-----------------------------|------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **IntelligenceBriefBlock**  | T2   | `IntelligenceBriefResult` from `intelligenceBriefService`. Tier A LLM-generated 3-paragraph brief. **Gated**: hidden when freshness tier = heuristic OR confidence < 40%. |
| **Dual Gauge** (Risk vs Ready) | T2 | Side-by-side ring: risk score vs `preparednessScore.overallScore`.                                                                              |
| **RiskBreakdownTab**        | T2   | The dimensional breakdown: L1-L5 + D2/D3/D6/D7/D8 with per-layer weight + raw + calibrated + multiplier columns. Open by default.                |
| **PatternMatchCard**        | T2   | Closest matching historical pattern from the now-25-pattern library (after v40.0 Phase 21 expansion). Only shown when overlap ≥ 70%.             |
| **PredictionHorizonPanel**  | T3   | Separate 30d / 90d / 180d risk models with horizon-appropriate weights. Includes max-confident-horizon + horizon rationale (v39 E3).             |
| **Scenario Fan**            | T3   | Bear / base / bull macro scenarios over 6 months from `scenarioPlanService`.                                                                     |

### 2.6 Methodology tab — [TransparencyTab.tsx](../artifacts/humanproof/src/components/AuditTabs/TransparencyTab.tsx)

v39 A6 added this as a first-class navigation tab. Surfaces:

- **EffectiveWeightsPanel** — formula weight × global calibration × segment multiplier
  per layer, showing how much each layer ACTUALLY contributes (effective share %) vs
  the formula weight.
- **DimensionCalibrationPanel** — per-dimension calibration status (regression-derived
  vs developer-estimate) with backtester.
- **Banking Stability Adjustment** panel (when industry is banking + region in
  registry).
- **Sector × Region Stability** panel (v40.0 — banking_canada / banking_us / banking_uk /
  banking_eu / telecom_canada / telecom_us, color-coded multiplier chip + before/after
  baseline + provenance footer).
- **India Sector Intelligence** (when applicable) — GCC archetype + NASSCOM benchmark
  + seasonal layoff windows + contagion matrix.
- **Parent-Subsidiary Propagation** panel (when subsidiary).
- **Synthetic probes status** — calibration_drift_events summary from
  `synthetic_score_probes` cron.
- Full source provenance log per signal (`ProvenanceLabel` showing measured / modeled /
  estimated labels).

---

## 3. The 55-step Audit Pipeline

Source: [auditDataPipeline.ts](../artifacts/humanproof/src/services/auditDataPipeline.ts)
(~3,400 lines). Composed of:

- **Steps 1–6** (resolution + live data)
- **Engine call** (`calculateLayoffScore`) producing the 0–100 score
- **Steps 1–55** (intelligence layers, numbered in the file comments)

The pipeline runs **client-side** for the v3 dashboard so first paint after the score
finishes is immediate. The whole pipeline is hard-bounded by `45s ceiling` set in
v32's blocking quorum design. Layers that exceed budget fall through to fallback values
written to `layer_fallback_log`.

### 3.1 Phase 1 — Company & data resolution (Steps 1–6)

The company resolver is a **4-tier waterfall**:

| Step | Source                                                                              | Coverage          |
|------|-------------------------------------------------------------------------------------|-------------------|
| 1    | Seeded `company_intelligence` lookup via `fetch-company-data` Edge Function          | ~2,000+ companies |
| 1b   | Backfill null financial signals from `companyIntelligenceBridge` (code-side)         | Fills holes       |
| 2    | Direct client query of `company_intelligence` table (Supabase RLS read)              | Same 2,000+       |
| 3    | Legacy `companyDatabase.ts` static fallback (18 companies)                           | Highly used names |
| 4    | **Unknown fallback** — `createUnknownCompanyFallback()` honest ±30pt warning + saves to `discovery_queue` for future enrichment | Long-tail         |

Then Step 5 (always-on live enrichment via `liveDataService` — Alpha Vantage stocks +
NewsAPI + Yahoo Finance + connectors) and Step 6 (45s live-signal quorum from BullMQ
scrape workers writing to `scrape_jobs`).

This 4-tier waterfall is what makes the audit work for both Apple AND an unknown
Berlin Series-B startup the same day — the unknown path is **honest** (low confidence,
±30pt UI warning, fewer panels shown) rather than hallucinating.

### 3.2 Engine call — `calculateLayoffScore`

Located in [layoffScoreEngine.ts](../artifacts/humanproof/src/services/layoffScoreEngine.ts).

**9-term blended formula** (sums to 100%):

```
Final risk = clamp01(
   D1 × 0.18  +   // Task automatability (= L3 role exposure)
   D2 × 0.14  +   // AI Tool Maturity (company AI signal × domain maturity)
   D3 × 0.14  +   // Augmentation Potential (1 - augment, so low aug = high risk)
   D4 × 0.18  +   // Experience Protection (= L5 employee factors)
   D5 × 0.03  +   // Country/Market context (= L4 condensed)
   D6 × 0.06  +   // AI Agent Capability (autonomous agent coverage)
   D7 × 0.07  +   // Unified Company Health (L1+L2+AI adoption+leadership)
   D8 × 0.09  +   // AI Efficiency Restructuring (logistic, gated)
   L1 × 0.16  +   // Direct company financial health (PPP-aware)
   L2 × 0.04  +   // Direct layoff history (calibrated recency-weighted)
   L4 × 0.02      // Direct industry headwinds (lighter — D5 covers most)
)
```

Then four post-formula stages:

1. **Empirical calibration** via `applyCalibration({L1..L5})` and
   `applyDimensionCalibration({D2,D3,D6,D7})` — multipliers from May 2026 regression
   on 200 verified events.
2. **D8 logistic** (v40.0 activated as of migration 20260622000002) — fires when
   conditions met: company profitable + high AI + first-ever cut OR cost-cutting
   signal present. Direct probability output, gated at 0.50.
3. **Kill-switches / score floors** — hard minimums when ground truth fires:
   - `confirmed_recent_layoff_news` → floor 72
   - `warn_filing_active` → floor 78
   - `funding_round_failed` → floor 70
   - …recorded in `result.killSwitchFloors` for the Methodology tab.
4. **Banking + Sector × Region adjustments** on L4 (v40.0):
   - First: country-level `bankingRegulatoryStability` (CA 0.68, US 1.00, JP 0.65…)
   - Then: generic `sectorRegionStability` (banking_canada 0.65 — overrides; banking_eu
     0.80; telecom_canada 0.70; telecom_us 0.90), spec-listed pairs win.

The engine returns a `ScoreResult` with:
- `total` (0–100)
- `breakdown` (L1..L5 + D2/D3/D6/D7/D8 raw + calibrated)
- `confidencePercent`
- `bankingStabilityAdjustment` + `sectorRegionStabilityAdjustment` metadata
- `killSwitchFloors` (which floors fired)
- `signalDecayWeights` (per-signal freshness weights applied)
- `cohortClassification` (DISTRESS / EFFICIENCY / WAVE / NONE with confidence + reason)
- `confidenceInterval` (conformal CI w/ poolFromCohort metadata)

### 3.3 Phase 2 — The 55 Intelligence Layers

After scoring, the pipeline runs **55 layers** in declared order (some independent,
many feed each other). Each layer is wrapped in a try/catch with `markFallback()` on
exceptions so a single layer failure never blocks the dashboard. Numbered as in the
source:

```
 1. JobMarketLiquidity              → escape path supply/demand index
 2. EscapePathOptimizer             → top-3 risk-reduction moves
 3. TemporalRiskAmplifier           → calendar-aware risk (earnings windows, seasonals)
 4. PrecisionBrief                  → 3-point data-grounded analyst summary
 5. ScoreSensitivity                → single-lever impact ranking
 6. DepartmentRisk                  → D9 department-level exposure
 7. FinancialRunwayIntelligence     → runway-constrained personalised strategy
 8. SignalContradictionEngine       → trust calibration (when sources disagree)
 9. ExecutiveMovement               → leadership departure risk (C-suite churn)
10. HiringSignalAnalyzer            → posting velocity pattern analysis
11. CompetitiveIntelligence         → talent supply/demand for this role
12. ExitTimingOptimizer             → optimal proactive departure calendar
13. CareerResilience                → composite 5-pillar resilience score
14. LayoffSurvivalPredictor         → actuarial probability conversion
15. ManagerRisk                     → direct/skip-level manager stability
16. ScoreTrajectory                 → 30/60/90-day score projection
17. VisaRiskEngine                  → work-auth dependency (H1B/L1/OPT + MENA + Kuwait)
18. InternalMobility                → intra-company transfer viability
19. RoleAdjacency                   → 2-hop role transition graph
20. NegotiationIntelligence         → current-employer leverage analysis
21. MacroEconomicRisk               → system-level economic context (recession proxy)
22. PeerContagion                   → sector-wave propagation model
23. EmergencyResponseProtocol       → 72-hour crisis plan (activates at score ≥80)
24. CareerConfidence                → psychological job-search readiness
25. NetworkLeverage                 → professional network strength
26. OfferEvaluation                 → optional, when offer data present
27. StrategySynthesis               → master cross-layer plan
28. ModelCalibration                → engine accuracy / trust metrics (async)
29. CompensationRisk                → pay position vs market + cascade stage
30. SkillPortfolioFit               → skill-level market compatibility
31. M&A Risk                        → merger/acquisition integration risk
32. FundingStageRisk                → funding lifecycle risk model
33. LeadershipTransition            → CEO/CFO/VP departure model
34. EmployeeSentiment               → Glassdoor/Blind early warning
35. GeographicOptionality           → location-based escape path analysis
36. HeadcountVelocity               → contractor/FTE ratio + posting trends
37. AutomationRiskTimeline          → role + tech-stack displacement timeline
38. CareerVelocity                  → trajectory momentum
39. WARNSignal                      → ground-truth US state layoff filings
40. BLS+FRED Macro                  → sector leading indicators
41. SECEnhanced                     → FCF margin, earnings surprise
42. CohortClassifier                → DISTRESS / EFFICIENCY / WAVE / NONE
43. GlassdoorVelocity               → CEO approval ROC + review volume spike
44. ExecutiveDeparturePattern       → departure destination + replacement archetype
45. RoleMarketDemand                → quarterly demand index for role + metro
46. UserFinancialRunway             → personal financial situation assessment
47. PredictionHorizon               → 30d/90d/180d horizon-specific models
48. SkillGapIntelligence            → selfRatedSkills × roleMarketDemand
49. PersonalizedTimeline            → financial runway × risk trajectory → criticalByDate
50. ScenarioPlan                    → bear/base/bull over 6 months
51. OfferEvaluation                 → pre-computed when pendingOfferData supplied
52. IntelligenceBrief               → Tier A LLM brief via llm-analyze (async, 24h cache)
53. CareerContingencyPlan           → STAY/NEGOTIATE/TRANSITION decision framework
54. PreparednessScore               → 5-pillar career-readiness meta-score
55. PersonalRiskModifier            → post-killswitch user-circumstance signed adjustment
```

### 3.4 Tier A vs Tier B narrative

**Tier B** (always present) is deterministic. `scenarioNarrativeEngine.ts` classifies
the user into **13 archetypes** (after v40.0 Phase 20 expansion):

| Archetype                          | When it fires                                                                                       |
|------------------------------------|-----------------------------------------------------------------------------------------------------|
| `financial_distress_layoff`        | L1+L2 elevated, score-weighted                                                                       |
| `ai_efficiency_restructuring`      | D8 elevated AND L1 low (profitable + AI substituting)                                               |
| `role_displacement`                | L3 elevated                                                                                          |
| `sector_wave`                      | L4 elevated with low individual signals                                                              |
| `gcc_parent_contagion`             | India + GCC archetype detected                                                                       |
| `india_it_bench_risk`              | India IT services + score ≥ 50                                                                       |
| `individual_resilience_gap`        | L5 elevated with moderate company/role signals                                                       |
| `low_risk_maintain`                | All signals manageable                                                                               |
| `eu_regulatory_restructuring`      | EU region + fintech/data-heavy + score ≥ 45                                                          |
| `latam_funding_crisis`             | LatAm region + startup-stage + L1 or score elevated                                                  |
| `apac_hyperscaler_localization`    | APAC region + (hyperscaler-parent OR GCC) + score ≥ 45                                               |
| `us_gov_contract_risk`             | US region + defense/govt-adjacent industry + score ≥ 45                                              |
| `fintech_regulatory_tightening`    | Fintech industry + score ≥ 45 (region routes regulator citation: BaFin/RBI/MAS/FCA/CFPB/APRA/BCB…)  |

Each archetype has a per-archetype builder producing 7 narrative fields
(`primaryRiskDriver`, `sixMonthInactionConsequence`, `oneActionThisWeek`,
`whatChangesRiskMost`, `estimatedTimeline`, `keyProtectiveFactor`, `synthesis`),
each tightly numerical (every sentence must cite a number from the breakdown).
Archetype blends are detected when top-2 archetypes are both >0.35 confidence — the
synthesis sentence is then a blended composite.

**Tier A** is the LLM brief. The intelligence-brief service builds a structured payload
including `structuredContext` (specific WARN locations, cohort reason, vulnerable +
protective signals), `userProfileContext` (visa, runway, dependents, prior layoff —
shaping how the brief is framed for THIS user), and **region-aware market context**
(v40.0 Phase 19 — StepStone for Germany, Reed for UK, Naukri for India, Indeed for US,
Bayt for UAE, JobStreet for Singapore, EURES for EU). The LLM gets explicit guardrails
("DO NOT cite Naukri/India numbers unless the user's region IS India"). The result is
validated: `oneActionThisWeek` must contain at least one concrete number sourced from
the market block; if validation fails a region-grounded fallback is substituted and the
`marketGrounded` flag is set to true. The brief is cached in `intelligence_briefs`
keyed by `(company, role, profile_signature, cohort)` with a 24h TTL and is invalidated
when score drifts more than 5 points or a new WARN filing lands.

### 3.5 Live Signal Quorum

[liveQuorumSpec.ts](../artifacts/humanproof/src/services/liveQuorumSpec.ts) defines
the v32 blocking quorum design that supersedes v31's poll-and-cap approach:

- Pipeline pauses at the "quorum gate" until **at least 3 of**: Yahoo Finance,
  Wikipedia, Naukri (India) / Indeed (global), Glassdoor, breaking news.
- Hard 45s ceiling; if quorum unmet, pipeline proceeds with confidence cap.
- 6-stage UI shown: "Resolving company identity…" → "Fetching financial signals…" →
  "Reading layoff history…" → "Computing role exposure…" → "Reading market signals…"
  → "Finalizing confidence model…".
- `awaitLiveQuorum` replaces v31's `awaitScrapeReadiness` 8s bounded poll.
- All multi-source signals run through `headcountConsensus` which combines them via
  weighted median and rejects outliers (>30% from cluster).

---

## 4. Data Pipeline — sources, ingestion, storage

### 4.1 External sources (14 connectors)

[services/dataConnectors/](../artifacts/humanproof/src/services/dataConnectors/):

| Connector              | Source                                | What it provides                              |
|------------------------|---------------------------------------|-----------------------------------------------|
| `layoffsFyiConnector`  | layoffs.fyi public CSV / RSS          | Verified historical layoff events             |
| `secEdgarConnector`    | SEC EDGAR full-text API               | 10-K/8-K filings, FCF, FY headcount, FCF margin |
| `warnActConnector`     | US state DOL portals                  | 60-day advance layoff filings + affected count |
| `yahooFinanceConnector`| Yahoo Finance unofficial endpoint     | Stock 90d, market cap, `fullTimeEmployees`    |
| `naukriConnector`      | Naukri search API                     | India openings + hiring velocity              |
| `bseConnector` + `bseProxyConnector` | Bombay Stock Exchange  | India regulatory filings                      |
| `mcaConnector`         | Ministry of Corporate Affairs (India) | India incorporation + annual returns          |
| `indiaPressConnector`  | ET / Mint / Moneycontrol RSS          | India-specific company news                   |
| `rssNewsConnector`     | Google RSS + Bing RSS + HN + Reddit   | Breaking news (no API key required)           |
| `scrapingHubConnector` | Wikipedia + career page + Glassdoor   | Template-aware infobox parser                 |
| `nsConnector`          | National Statistics offices           | EU/UK labour market data                      |

Plus market-data sources documented per region in
[careerPathMarket.ts](../artifacts/humanproof/src/services/careerPathMarket.ts)
(`MARKET_DATA_SOURCES_BY_REGION` — Reed, StepStone, Indeed, JobStreet, SEEK, Bayt,
EURES, Catho, OCC Mundial, etc.).

### 4.2 Ingestion methods (3 patterns)

1. **Synchronous in-audit fetch** — via `proxy-live-signals` Edge Function (rate-limit
   firewall + circuit breaker) called from `liveDataService`. Used for: Alpha Vantage
   stock, NewsAPI, Yahoo Finance, light Naukri queries.
2. **Async scrape job queue** — `scrape_jobs` table acts as a BullMQ-style queue;
   `scrape-job-sweeper` cron polls Fly.io workers that scrape Naukri / Wikipedia /
   career pages / Glassdoor in parallel; writes `_scrape_result` JSON back to
   `scrape_jobs`. v32 quorum gate awaits at least 3 sources.
3. **Cron-driven batch ingestion** — `ingest-news` (Google RSS + Indian press),
   `ingest-careers`, `ingest-github` (org activity), `ingest-analytics`. These
   populate `breaking_news_events`, `career_page_snapshots`, etc. on schedules
   ranging from 5 minutes (breaking news) to weekly (`refresh-market-intelligence`).

### 4.3 Processing + validation

- [dataQualityValidator.ts](../artifacts/humanproof/src/services/dataQualityValidator.ts)
  validates raw company data, flags missing critical fields, applies "intelligent
  fallbacks" (industry baselines instead of nulls), and computes per-audit
  `accuracyMetrics` exposed in the Methodology tab.
- [headcountConsensus.ts](../artifacts/humanproof/src/services/headcountConsensus.ts)
  reconciles multi-source headcount via weighted median.
- [companyEntityResolver.ts](../artifacts/humanproof/src/services/companyEntityResolver.ts)
  resolves "TCS" → "Tata Consultancy Services" via an alias map + edit-distance
  fallback, preventing the audit from running on the wrong company.
- [signalContradictionEngine.ts](../artifacts/humanproof/src/services/signalContradictionEngine.ts)
  flags conflicting sources (e.g. positive Glassdoor + negative news on same week).
- [evidenceHierarchy.ts](../artifacts/humanproof/src/services/evidenceHierarchy.ts) +
  [evidencePresenceGate.ts](../artifacts/humanproof/src/services/evidencePresenceGate.ts)
  gate certain claims behind hard evidence requirements (e.g. "confirmed layoff
  signal" requires at least one verified-source event in the last 90 days).
- [signalDecayModel.ts](../artifacts/humanproof/src/services/signalDecayModel.ts)
  applies exponential decay per signal — half-life ranges from 30 days (news) to 365
  days (layoff history) — surfaced as per-signal freshness weights in the result.

### 4.4 Storage structure

Supabase Postgres with **RLS enforced on every table**. Selected core tables:

| Table                             | Purpose                                                                              | RLS                                                                |
|-----------------------------------|--------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| `company_intelligence`            | 2,000+ companies with financial / layoff / AI / leadership signals                   | Public read; service-role write                                    |
| `curated_layoff_events`           | Manually verified layoff events with date + percent + source                         | Public read                                                        |
| `breaking_news_events`            | RSS-ingested events with `source_market` + region tag                                | Public read; cron service-role write                               |
| `market_intelligence_cache`       | Per-role openings (india / global / **regional_openings JSONB** as of v40.0 Phase 19) | Public read                                                        |
| `engine_calibration_constants`    | Ops-overridable runtime constants (sectorRegionStability, amplifiers, AI-amp factors) | Public read; admin write                                           |
| `scrape_jobs`                     | BullMQ-style queue with `priority`, `started_at`, `queued_at`, `attempts`, `_scrape_result` | RLS hardened (v40.0 migration 20260617000001)                |
| `user_profiles`                   | Per-user: visa, runway, tenure, dependents, **preferred_locale** (v40.0 Phase 22)    | Owner-only read/write                                              |
| `user_prediction_outcomes`        | Ground-truth ledger (was the layoff prediction right at horizon?)                    | Owner-only read; service-role write                                |
| `intelligence_briefs`             | 24h TTL cache of Tier A LLM briefs                                                   | Owner-only read; service-role write                                |
| `synthetic_score_probes`          | 7 fixed scored scenarios for daily drift testing                                     | Service-role only                                                  |
| `calibration_drift_events`        | When a probe drifts > tolerance, an event lands here                                 | Admin read                                                         |
| `pipeline_runs`                   | Per-audit row with `request_id`, latency, layer fallbacks, EF degradation tags       | Owner-only read; service-role write                                |
| `layer_fallback_log`              | Every fallback path that fires, for SLO dashboard                                    | Admin read                                                         |
| `api_circuit_status`              | Per-API circuit-breaker state (closed / half-open / open)                            | Service-role only                                                  |
| `score_history`                   | Per-user audit history for delta attribution                                         | Owner-only; also mirrored to localStorage                          |

The full migration list is in [supabase/migrations/](../supabase/migrations/) (158
files). The latest v40.0 migrations:

- `20260622000005_synthetic_score_probes` — calibration drift scaffolding
- `20260622000006_d8_gate_cleared` — flips D8 to production
- `20260622000007_synthetic_probe_global_scenarios` — global scenario coverage
- `20260622000008_breaking_news_source_market` — region-tagged news
- `20260622000009_market_intelligence_regional_openings` — per-region openings (v40 P19)
- `20260622000010_user_profiles_preferred_locale` — per-user locale (v40 P22)

### 4.5 Real-time vs batch

- **Real-time:** Supabase Realtime is enabled on `company_intelligence` (migration
  20260429000003) so any seeded change shows up in the next audit without redeploy.
  Live data fetch happens at audit-time, blocking-gated at the quorum.
- **Batch:** All ingestion crons + `recalibrate-engine` (weekly), `synthetic-probe`
  (daily), `schedule-outcome-prompts` (daily), `send-monthly-report` (monthly).
- **Hybrid:** The intelligence brief is cached 24h but invalidated on score drift > 5
  pts OR new WARN filing OR cohort change. The scrape-job queue is real-time-enqueued
  but worker-batched.

---

## 5. How accuracy is achieved

### 5.1 The calibration flywheel

```
        Audit completion
                │
                ▼
   schedule-outcome-prompts (cron)
       — at horizon (90d / 180d), asks the user "did the layoff happen?"
                │
                ▼
   outcome-ingestion (Edge Function)
       — writes user_prediction_outcomes row {predicted, actual, layer scores}
                │
                ▼
   recalibrate-engine (weekly cron)
       — regression on all outcomes, updates engine_calibration_constants
                │
                ▼
   getConstant('layer.foo', bootstrap=X) — picks up new value on next refresh
                │
                ▼
   Improved accuracy → tighter prediction → better outcome
```

This is the "flywheel" referenced in HumanProof Core Law. Every constant in the engine
that's marked `getConstant<T>(key, bootstrap)` flows through this loop. The provenance
is exposed in the Methodology tab — `manual_seed`, `manual_seed_sector_research`,
`calibrated`, `uncalibrated_placeholder` (loud warning).

### 5.2 Synthetic probes for drift detection

[migrations/20260622000005_synthetic_score_probes](../supabase/migrations/20260622000005_synthetic_score_probes.sql)
inserts 7 deterministic scored scenarios (NEUTRAL_BASELINE through FULL_CRISIS,
expected 16-82). The `synthetic-probe` cron re-scores them daily and writes any
deviation > tolerance to `calibration_drift_events`. The Methodology tab shows recent
drift events — when the engine self-detects regression in its own deterministic
fixtures, operators are alerted before users notice.

### 5.3 Empirical calibration (post-engine multipliers)

[empiricalCalibration.ts](../artifacts/humanproof/src/services/empiricalCalibration.ts)
applies validated regression multipliers from May 2026 regression on 200 events:

- `L1 × 0.99` (negligible adjustment — already well calibrated)
- `L2 × 1.11` (under-predicted by ~11%)
- `L3 × 0.93` (over-predicted)
- `L4 × 1.00`
- `L5 × 1.00`
- `D2 × 1.00`, `D3 × 0.89`, `D6 × 1.00`, `D7 × 1.08`

Plus a `pooledFromCohort` flag — when the user belongs to a sparsely-represented
segment (e.g. India lithium mining engineer), the conformal CI is "pooled up" to the
nearest validated cohort and that fact is shown in the Methodology tab so the user
knows their interval is wider than a typical SWE-at-FAANG would receive.

### 5.4 Cohort classifier

[cohortClassifier.ts](../artifacts/humanproof/src/services/cohortClassifier.ts)
classifies the audit context into one of {`DISTRESS`, `EFFICIENCY`, `WAVE`, `NONE`}
with a confidence + reason. This routes:

- Calibration multiplier selection (each cohort has its own per-layer multipliers).
- Tier B archetype confidence boost.
- LLM brief context block.

### 5.5 Segment calibration

[segmentedCalibrationEngine.ts](../artifacts/humanproof/src/services/segmentedCalibrationEngine.ts)
checks if the user's `(country, industry, role-family)` segment has enough outcome
data (≥ 50 validated predictions) to apply a segment-specific multiplier. When yes:
the multiplier is shown in the Effective Weights table with an amber "Segment active"
banner. When no: the user inherits the global multiplier with a "calibration-limited"
disclosure.

---

## 6. How personalization is achieved

The user's `UserProfile` (15 fields after v16 expansion: visa, runway months, tenure,
dependents, locale, equity vesting, etc.) flows through **four** personalization
layers:

1. **Engine personalization:** `userFactors` enters `calculateLayoffScore` and drives
   L5 (personal protection), the L1 visa-amplifier, the L4 sector-region matcher, and
   the kill-switch evaluations.
2. **Action selection:** `deriveProfileSignals(uf)` (v39 Phase B) classifies the
   profile into visa-locked / runway-stressed / family-anchored / equity-locked
   buckets. `actionPersonalizationEngine` then ranks actions specific to that bucket.
   The ActionsTab shows "Tailored to your situation · 87%" badges when the actions
   match the profile signal — and an honest "Generic guidance" pill otherwise.
3. **Narrative personalization:** Tier A LLM prompt includes a `userProfileContext`
   block. Tier B has profile-aware appendices: visa grace period messaging, family
   stability framing, equity-acceleration negotiation scripts.
4. **Scenario personalization:** `scenarioPlanService` produces region-aware outreach
   plans + runway-aware horizons (2-9 month range). `careerContingencyPlanEngine`
   produces STAY / NEGOTIATE / TRANSITION paths each scored against the user's
   specific situation.

Profile is persisted to `user_profiles` (Supabase) and partially cached client-side.
v39 Phase A added the **profileVersion** counter so a profile edit triggers a
re-audit + cache invalidation across the brief, scenarios, and contingency layers.

---

## 7. How intelligence is produced — the "decision-driven" design

The dashboard's information architecture is explicitly **decision-driven** — built
around the questions a user actually asks, in order:

```
       "Am I at risk?"             → Score ring + verdict (Summary T1)
       "Why?"                      → TopDriversStrip (Summary T1)
       "What do I do this week?"   → ImmediateActionsStrip (Summary T1)
       "Is the company OK?"        → CompanyPulseCard (Summary T2 / Company T1)
       "What's the FULL plan?"     → ActionPlan tab
       "What's MY profile?"        → Protection tab
       "Tell me MORE about why"    → Intelligence tab
       "HOW was this calculated?"  → Methodology tab
```

Every block carries an explicit `<TierBadge tier={1..5}>` so users (and future
maintainers) see the disclosure hierarchy at a glance. Tier 1 = critical, can't be
hidden. Tier 5 = footnote material, collapsed by default.

The `useDashboardAdaptation` hook reads the result and returns:

- `mode`: `'emergency' | 'critical' | 'elevated' | 'monitoring' | 'stable'`
- `summaryPanelOrder`: which blocks to render first in Summary (mode-dependent)
- `defaultTab`: the landing tab for THIS audit

A user with score 82 + active WARN sees the Action Plan tab first with an Emergency
banner stuck above the tabs. A user with score 28 sees Protection-first because their
question isn't "am I safe?" — they already know they are; their question is "how do
I stay this way?"

---

## 8. Workflow — input → output, step by step

### Inputs

User submits via the Layoff Calculator a `(company, role, region, experience, profile)`
tuple. The profile is loaded from `user_profiles` if signed in, or from a session-only
draft otherwise.

### Step-by-step

1. **Resolution** — `resolveCompanyData` runs the 4-tier waterfall (Step 1–4) to find
   the company. If unknown: builds an "honest fallback" with sector defaults + a
   discovery-queue row.
2. **Role resolution** — `resolveRoleInput` (with `compute-oracle` Edge Function)
   resolves the role title to one of 412 deeply-personalised roles or marks it
   "manual_unresolved" and routes to a family heuristic via `resolveCrossIndustryTransition`.
3. **Live data fetch (parallel)**
   - `fetchLiveCompanyData` → Alpha Vantage + NewsAPI + Yahoo Finance + connectors.
   - `applyScrapingEnrichment` → enqueues scrape jobs for Wikipedia + career page +
     Glassdoor + Naukri/Indeed.
   - `breakingNewsBroker` → pulls breaking_news_events for this company.
4. **Quorum gate** — `awaitLiveQuorum` blocks up to 45s waiting for ≥ 3 signals.
5. **Score engine** — `calculateLayoffScore(inputs)` produces `ScoreResult`.
6. **Buildup of 55 intelligence layers** — each layer reads from `ScoreResult`,
   `companyData`, `userFactors`, and prior layers as needed. Independent layers run
   in parallel via `Promise.allSettled`; dependent layers (e.g. `strategySynthesis`
   reads all prior layers) run after their dependencies.
7. **Assembly** — `buildHybridScorePayload` merges everything into a `HybridResult`.
8. **Persistence** — `cacheLastAuditResult` writes the result to IndexedDB for offline;
   `recordScore` writes to localStorage + (when signed in) `score_history` table; the
   delta-attribution snapshot (with parent/GCC/peer fields per v40.0 Phase 23) is
   captured for the next audit's "why did your score change?" panel.
9. **Render** — the `HybridResult` flows into `LayoffAuditDashboardV3` which picks
   the adaptive default tab and lazy-loads the corresponding tab module.
10. **Side effects (async, fire-and-forget):**
    - `fetchIntelligenceBrief` posts to `llm-analyze` Edge Function; result lands in
      `result.intelligenceBrief` and re-renders the IntelligenceBriefBlock.
    - `schedule-outcome-prompts` is notified for future outcome ingestion.
    - Telemetry: `track('audit_completed', ...)` ships per-audit metrics.

### Outputs (HybridResult fields, abridged)

```ts
{
  total: 0..100,
  confidencePercent: 0..100,
  breakdown: { L1..L5, D2/D3/D6/D7/D8 (raw + calibrated) },
  cohortClassification, confidenceInterval, killSwitchFloors,
  bankingStabilityAdjustment, sectorRegionStabilityAdjustment,    // v40.0
  recommendations: [ActionPlanItem],
  scenarioArchetype: ScenarioArchetype, scenarioNarrative: ScenarioNarrative,
  intelligenceBrief: IntelligenceBriefResult,                     // Tier A
  peerContagion, parentPropagation, indiaRiskEnrichment,
  visaRisk, careerVelocity, financialRunway, userFinancialRunway,
  preparednessScore, skillGapIntelligence, skillPortfolioFit,
  careerContingencyPlan, careerConfidence, networkLeverage,
  strategySynthesis, modelCalibration, personalRiskModifier,
  predictionHorizon, scenarioPlan,
  warnSignal, secEnhancedSignals, blsMacroSignal,
  roleMarketDemand, macroEconomicRisk,
  signalQuality: { liveSignals, dbSource, calculationMode },
  authoritativeSignals: Record<string, ProvenancedSignal>,
  meta: { usedLiveSignals, timestamp, requestId, ... },
  // …~50 result fields total
}
```

---

## 9. Edge cases + safety mechanisms

- **Unknown company:** `createUnknownCompanyFallback` produces score with ±30pt UI
  warning. Several panels (PeerContagion, ParentPropagation) suppress themselves to
  avoid fabricating context. Confidence is capped (v39 Phase A — 60% live-quorum cap).
- **Heuristic-tier data:** Intelligence brief gates itself off when freshness tier is
  `heuristic` to avoid sector-generic prose. Methodology tab makes this visible.
- **Live-API outage:** Every external call is wrapped in `apiCircuitBreaker`; on
  consecutive failures the API circuit opens and the layer drops to its bootstrap
  fallback. `api_circuit_status` row reflects state.
- **Score-floor activation:** When a kill-switch fires (confirmed news, WARN filing,
  funding failure), the engine returns a floor + a `killSwitchFloors` map. The
  Methodology tab renders "Score Floor Active" badges per fired floor so the user
  knows the score was bounded BELOW by ground truth, not purely formula-derived.
- **Profile incomplete:** Actions degrade gracefully — "Generic guidance" pills appear
  on action cards that can't be personalised, and `ProfileQuickCapture` is offered
  inline.
- **Locale not yet translated for long-form narrative:** v40.0 Phase 22 ships
  archetype + urgency + synthesis-stem in 8 locales (en/es/pt/fr/de/hi/ja/zh) but
  long-form fields fall back to English with a disclaimer until translator review.

---

## 10. Operational telemetry + SLO

- Every audit gets a `request_id` propagated as `x-request-id` across the
  browser/Edge boundary (WS11). `pipeline_runs` rows are joinable end-to-end.
- Every fallback writes to `layer_fallback_log` (WS10) so degradation patterns are
  visible on the SLO dashboard.
- `health-probe` cron pings every edge function every 5 minutes. `getEFDegradationWarnings()`
  surfaces stale EFs (>15min since last successful response) as banner warnings.
- `getCalibrationDbStatus()` exposes `engine_calibration_constants` snapshot age — if
  ops-overrides are >7 days stale a Methodology tab badge fires.
- Privacy hardening: migration 20260614000001 added per-table indexes for SLO
  queries + per-user RLS audit. No PII leaves Supabase.

---

## 11. Repository map (quick reference)

```
artifacts/humanproof/
  src/
    components/
      AuditTabs/
        v3/                      ← 6-tab dashboard (Summary/Company/Protection/Action/Intel/Methodology)
        common/                  ← 40+ panels (PreparednessScore, VisaRisk, PeerContagion, …)
        TransparencyTab.tsx      ← Methodology tab (also imported by Intelligence tab)
        ActionPlanTab.tsx        ← legacy v2; reused inside ActionsTab as the "full plan"
      LayoffCalculator/          ← entry point + recordScore call sites
    services/
      auditDataPipeline.ts       ← THE pipeline (~3,400 lines, 55 layers)
      layoffScoreEngine.ts       ← scoring (L1-L5 + D2/D3/D6/D7/D8)
      scenarioNarrativeEngine.ts ← Tier B archetypes (13)
      intelligenceBriefService.ts← Tier A LLM brief
      careerPathMarket.ts        ← 30 transitions × 19 regions
      peerContagionEngine.ts     ← sector wave model
      visaRiskEngine.ts          ← work-auth dependency (incl. v40 MENA + Kuwait)
      parentSubsidiaryPropagation.ts
      calibration/
        calibrationConstants.ts  ← getConstant() ops-overridable runtime
      …  (~150 services total)
    data/
      historicalPatterns.ts      ← 25 patterns (after v40 P21 global expansion)
      bankingRegulatoryStability.ts
      sectorRegionStability.ts   ← v40 P18 generic sector × region L4 multiplier
      endOfServiceGratuity.ts    ← MENA gratuity calculator
      companyDatabase.ts         ← legacy 18-co fallback
      …
    i18n/
      index.tsx + locales/{en,es,pt,fr,de,hi,ja,zh}.ts
  supabase/
    migrations/                  ← 158 SQL migrations (RLS, indexes, cron, calibration)
    functions/                   ← 27 Deno Edge Functions
```

---

## 12. What's next on the roadmap (visible in code today)

Based on flag-gated paths and TODOs in the codebase:

- **v40.5 dataset PR** (deferred from Phase C in v39): full 412-row automation-timeline
  rewrite + 100+ company expansion of peer-contagion graph.
- **Tier 2 narrative localization** — translator-reviewed long-form narrative fields
  per locale (currently English-only on non-en after Phase 22).
- **AuthContext locale wire-up** — read/write `user_profiles.preferred_locale` on
  sign-in (migration applied but the read/write hook is the next step).
- **D8 multi-cohort refinement** — D8 is production for the EFFICIENCY cohort with
  AUC 0.76 / n=47; expansion to WAVE cohort gated on n ≥ 100.
- **`v39_dag_runner_active` flag** — the new DAG-based pipeline runner runs alongside
  legacy try/catch blocks. Layers migrate one at a time; the flag will flip when
  ≥80% are ported.

---

*End of blueprint. For deeper drill-down on any single layer, start at the file
referenced in the section above and follow imports.*
