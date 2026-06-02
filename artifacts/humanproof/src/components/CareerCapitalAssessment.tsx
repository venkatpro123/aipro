// CareerCapitalAssessment.tsx
// Enhancement 8: Career capital assessment.
// Two people with identical titles have wildly different actual career capital.
// A QA engineer who built a team of 12 and shipped 3 enterprise products scores
// meaningfully lower risk than one who executed tickets for 7 years.
// Capital Score = separate from risk score = answers "what do I have to leverage?"

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Users, Briefcase, FileText, Code, Star,
  Brain, ChevronDown, ChevronUp, TrendingDown, Lock, Zap,
} from "lucide-react";
import { getCapitalStrategy, getPillarPrerequisite, type LeverageStrategy, type PillarPrerequisite } from "../services/capitalLeverageStrategy";
import { loadFinancialContext } from "../services/financialContextService";
import { CURRENCY_META } from "../services/currencyService";

export interface CareerCapitalData {
  // Quantifiable capital
  clientAccountsOwned: number;        // count of owned client accounts
  clientAccountValueLakh: number;     // approx annual revenue value (₹L or $K)
  teamSizePeak: number;               // largest team directly led
  productsShippedEndToEnd: number;    // products owned start-to-finish
  patentsOrPublications: number;      // count
  certifications: number;             // relevant certifications held
  speakingEngagements: number;        // conferences, webinars, panels
  // Qualitative capital (0–10 scale)
  domainDepthScore: number;           // unique domain expertise depth
  networkStrengthScore: number;       // strength of professional network
  // Unique knowledge
  uniqueKnowledge: string;            // "What do you know that almost no one else does?"
  capturedAt: number;
}

export interface CapitalScore {
  total: number;           // 0–100
  tier: 'Foundation' | 'Professional' | 'Distinguished' | 'Elite';
  riskReduction: number;   // pts this capital subtracts from displacement risk
  breakdown: {
    networkCapital: number;
    knowledgeCapital: number;
    deliveryCapital: number;
    influenceCapital: number;
  };
  primaryAsset: string;
  leverageStrategy: string;
  leverageDetail?: LeverageStrategy;
  /** v4.0 Personalization 2: Phase 0 prerequisite when dominant/weak pillar gap > 15pts */
  pillarPrerequisite?: PillarPrerequisite;
}

const CAPITAL_STORAGE_KEY = 'hp_career_capital';

function computeCapitalScore(data: CareerCapitalData): CapitalScore {
  // Network capital (0–25)
  const networkCapital = Math.min(25,
    Math.round(
      data.clientAccountsOwned * 3 +
      Math.min(10, data.clientAccountValueLakh * 0.05) +
      data.networkStrengthScore * 1.5,
    )
  );

  // Knowledge capital (0–25)
  const knowledgeCapital = Math.min(25,
    Math.round(
      data.patentsOrPublications * 5 +
      data.certifications * 2 +
      data.domainDepthScore * 2 +
      (data.uniqueKnowledge.length > 50 ? 5 : data.uniqueKnowledge.length > 20 ? 3 : 0),
    )
  );

  // Delivery capital (0–25)
  const deliveryCapital = Math.min(25,
    Math.round(
      data.productsShippedEndToEnd * 8 +
      Math.min(12, data.teamSizePeak * 0.8),
    )
  );

  // Influence capital (0–25)
  const influenceCapital = Math.min(25,
    Math.round(
      data.speakingEngagements * 4 +
      Math.min(10, data.certifications * 1.5),
    )
  );

  const total = networkCapital + knowledgeCapital + deliveryCapital + influenceCapital;

  const tier: CapitalScore['tier'] =
    total >= 75 ? 'Elite'
    : total >= 50 ? 'Distinguished'
    : total >= 25 ? 'Professional'
    : 'Foundation';

  // Risk reduction: capital protects against displacement
  const riskReduction = Math.min(30, Math.round(total * 0.30));

  // Identify primary asset — guard against all-zero case (empty form submission)
  const maxVal = Math.max(networkCapital, knowledgeCapital, deliveryCapital, influenceCapital);
  let primaryAsset: string;
  let leverageStrategy: string;

  if (maxVal === 0) {
    primaryAsset = 'No capital data recorded yet';
    leverageStrategy = 'Complete the fields above — especially the domain depth slider and any client or product deliveries — to receive a personalized leverage strategy grounded in your actual career history.';
  } else if (maxVal === networkCapital) {
    primaryAsset = `Client relationships and network (${networkCapital}/25)`;
    leverageStrategy = 'Your primary asset is relationships. In a transition, activate these before anything else — jobs are filled through warm referrals, not cold applications. Your client accounts are negotiating chips for internal moves or consulting pivots.';
  } else if (maxVal === knowledgeCapital) {
    primaryAsset = `Domain expertise and institutional knowledge (${knowledgeCapital}/25)`;
    leverageStrategy = 'Convert tacit knowledge into visible artifacts — write architecture decision records, publish frameworks, speak at conferences. This makes your expertise transferable and findable by the next employer.';
  } else if (maxVal === deliveryCapital) {
    primaryAsset = `Delivery track record and team leadership (${deliveryCapital}/25)`;
    leverageStrategy = 'Your delivery record is your competitive moat. Quantify impact: "Shipped X, which drove Y outcome." Target roles that value this over skills — senior IC, tech lead, or product roles where execution credibility is the barrier to entry.';
  } else {
    primaryAsset = `Industry influence and thought leadership (${influenceCapital}/25)`;
    leverageStrategy = 'Your influence capital is rare. Most engineers never speak publicly or publish. Amplify it — 2 conference talks per year compounds faster than almost any other career asset.';
  }

  // Priority 6: compute per-pillar specific strategy
  const leverageDetail = maxVal > 0
    ? getCapitalStrategy({ networkCapital, knowledgeCapital, deliveryCapital, influenceCapital })
    : undefined;

  // v4.0 Personalization 2: Check for pillar imbalance that creates a prerequisite
  const pillarPrerequisite = maxVal > 0
    ? getPillarPrerequisite({ networkCapital, knowledgeCapital, deliveryCapital, influenceCapital })
    : undefined;

  return {
    total,
    tier,
    riskReduction,
    breakdown: { networkCapital, knowledgeCapital, deliveryCapital, influenceCapital },
    primaryAsset,
    leverageStrategy,
    leverageDetail,
    pillarPrerequisite,
  };
}

const TIER_CONFIG: Record<CapitalScore['tier'], { color: string; description: string }> = {
  Foundation:    { color: 'var(--text-3)', description: 'Early-stage capital. Focus on building delivery and network assets now.' },
  Professional:  { color: 'var(--cyan)', description: 'Solid foundation. One or two strong capital pillars. Leverage them strategically.' },
  Distinguished: { color: 'var(--amber)', description: 'Above-average capital. Your track record creates real optionality in transitions.' },
  Elite:         { color: 'var(--emerald)', description: 'Exceptional career capital. You have multiple leverage points that protect against displacement.' },
};

interface Props {
  currentRiskScore: number;
  onCapitalScoreComputed?: (score: CapitalScore, reduction: number) => void;
}

/** Read previously-saved capital data so reopening the form is not a blank slate. */
function loadStoredCapital(): CareerCapitalData | null {
  try {
    const raw = localStorage.getItem(CAPITAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CareerCapitalData) : null;
  } catch {
    return null;
  }
}

export const CareerCapitalAssessment: React.FC<Props> = ({
  currentRiskScore,
  onCapitalScoreComputed,
}) => {
  const stored = useMemo(() => loadStoredCapital(), []);

  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<boolean>(!!stored);
  const [capitalScore, setCapitalScore] = useState<CapitalScore | null>(
    stored ? computeCapitalScore(stored) : null,
  );

  const num = (v: number | undefined, fallback = "0") => (v != null ? String(v) : fallback);
  const [clients, setClients] = useState(num(stored?.clientAccountsOwned));
  const [clientValue, setClientValue] = useState(num(stored?.clientAccountValueLakh));
  const [teamSize, setTeamSize] = useState(num(stored?.teamSizePeak));
  const [products, setProducts] = useState(num(stored?.productsShippedEndToEnd));
  const [patents, setPatents] = useState(num(stored?.patentsOrPublications));
  const [certs, setCerts] = useState(num(stored?.certifications));
  const [speaking, setSpeaking] = useState(num(stored?.speakingEngagements));
  const [domainDepth, setDomainDepth] = useState(num(stored?.domainDepthScore, "5"));
  const [networkStrength, setNetworkStrength] = useState(num(stored?.networkStrengthScore, "5"));
  const [uniqueKnowledge, setUniqueKnowledge] = useState(stored?.uniqueKnowledge ?? "");

  const handleCompute = () => {
    const data: CareerCapitalData = {
      clientAccountsOwned: parseInt(clients, 10) || 0,
      clientAccountValueLakh: parseInt(clientValue, 10) || 0,
      teamSizePeak: parseInt(teamSize, 10) || 0,
      productsShippedEndToEnd: parseInt(products, 10) || 0,
      patentsOrPublications: parseInt(patents, 10) || 0,
      certifications: parseInt(certs, 10) || 0,
      speakingEngagements: parseInt(speaking, 10) || 0,
      domainDepthScore: parseInt(domainDepth, 10) || 5,
      networkStrengthScore: parseInt(networkStrength, 10) || 5,
      uniqueKnowledge,
      capturedAt: Date.now(),
    };
    try {
      localStorage.setItem(CAPITAL_STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota */ }
    const score = computeCapitalScore(data);
    setCapitalScore(score);
    setSaved(true);
    onCapitalScoreComputed?.(score, score.riskReduction);
  };

  const tierConf = capitalScore ? TIER_CONFIG[capitalScore.tier] : null;
  const adjustedRisk = capitalScore ? Math.max(5, currentRiskScore - capitalScore.riskReduction) : currentRiskScore;

  // Currency-aware label for the "annual account value" field. The field was
  // previously hardcoded to "(₹L)" — Indian Lakhs — for every user worldwide.
  // We resolve the user's saved currency and show the right unit: INR → "₹L"
  // (lakhs), other large-format currencies → "thousands", with the right symbol.
  const valueUnitLabel = useMemo(() => {
    const code = loadFinancialContext()?.currency ?? 'USD';
    const meta = CURRENCY_META[code] ?? CURRENCY_META['USD'];
    if (meta.largeFormat === 'L') return `${meta.symbol}L`;       // ₹ Lakhs
    return `${meta.symbol}'000s`;                                  // e.g. $'000s, €'000s
  }, []);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="p-2 rounded-lg bg-violet-500/10 flex-shrink-0">
          <Award className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">Career Capital Assessment</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {saved && capitalScore
              ? `Capital Score: ${capitalScore.total}/100 · ${capitalScore.tier} · Reduces risk by ${capitalScore.riskReduction} pts`
              : "Optional · Significantly improves accuracy for experienced professionals"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Star className="w-4 h-4 text-amber-400" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground py-3 leading-relaxed">
                Two professionals with identical titles can have vastly different career capital.
                The metrics below adjust your displacement risk to reflect what you've actually built — not just your current job title.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Client Accounts Owned", icon: <Briefcase className="w-3.5 h-3.5" />, value: clients, set: setClients, placeholder: "0", type: "number" },
                  { label: `Approx. Annual Value (${valueUnitLabel})`, icon: <Star className="w-3.5 h-3.5" />, value: clientValue, set: setClientValue, placeholder: "0", type: "number" },
                  { label: "Peak Team Size Led", icon: <Users className="w-3.5 h-3.5" />, value: teamSize, set: setTeamSize, placeholder: "0", type: "number" },
                  { label: "Products Shipped E2E", icon: <Code className="w-3.5 h-3.5" />, value: products, set: setProducts, placeholder: "0", type: "number" },
                  { label: "Patents / Publications", icon: <FileText className="w-3.5 h-3.5" />, value: patents, set: setPatents, placeholder: "0", type: "number" },
                  { label: "Certifications Held", icon: <Award className="w-3.5 h-3.5" />, value: certs, set: setCerts, placeholder: "0", type: "number" },
                ].map(field => (
                  <div key={field.label}>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      {field.icon} {field.label}
                    </label>
                    <input
                      type="number" min="0"
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: "Domain Expertise Depth (0–10)", value: domainDepth, set: setDomainDepth, desc: "10 = unique knowledge almost no one else has" },
                  { label: "Network Strength (0–10)", value: networkStrength, set: setNetworkStrength, desc: "10 = strong relationships with decision-makers" },
                ].map(slider => (
                  <div key={slider.label}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{slider.label}</label>
                    <input
                      type="range" min="0" max="10" step="1"
                      value={slider.value}
                      onChange={e => slider.set(e.target.value)}
                      className="w-full accent-[var(--cyan)]"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span>0</span>
                      <span className="font-bold text-cyan-400">{slider.value}</span>
                      <span>10</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground opacity-60 mt-0.5">{slider.desc}</p>
                  </div>
                ))}
              </div>

              {/* Unique knowledge */}
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  What do you know that almost no one else at your company knows?
                </label>
                <textarea
                  value={uniqueKnowledge}
                  onChange={e => setUniqueKnowledge(e.target.value)}
                  placeholder="e.g., 'I know every major client's internal procurement process and the 3 stakeholders who actually approve vendor changes'"
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 resize-none"
                />
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground opacity-60">
                  <Lock className="w-2.5 h-2.5" />
                  Stored locally only. Never transmitted.
                </div>
              </div>

              <button
                onClick={handleCompute}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--violet)", color: "#fff" }}
              >
                Compute My Career Capital Score
              </button>

              {/* Results */}
              {saved && capitalScore && tierConf && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
                  {/* Score display */}
                  <div className="rounded-xl border border-white/10 p-4 text-center">
                    <div className="text-4xl font-black tracking-tighter" style={{ color: tierConf.color }}>
                      {capitalScore.total}<span className="text-lg text-muted-foreground">/100</span>
                    </div>
                    <div className="text-base font-black mt-1" style={{ color: tierConf.color }}>{capitalScore.tier}</div>
                    <p className="text-xs text-muted-foreground mt-1">{tierConf.description}</p>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <span className="text-sm text-emerald-400 font-bold">−{capitalScore.riskReduction} pts</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        capital adjustment: {currentRiskScore} → {adjustedRisk}
                      </span>
                    </div>
                  </div>

                  {/* Capital breakdown */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(capitalScore.breakdown).map(([key, val]) => {
                      const labels: Record<string, string> = {
                        networkCapital: 'Network', knowledgeCapital: 'Knowledge',
                        deliveryCapital: 'Delivery', influenceCapital: 'Influence',
                      };
                      return (
                        <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{labels[key]}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(val / 25) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold font-mono text-cyan-400">{val}/25</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strategy */}
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <div className="text-xs font-black text-violet-400 mb-1">YOUR PRIMARY ASSET</div>
                    <p className="text-sm font-semibold mb-2">{capitalScore.primaryAsset}</p>
                    <div className="text-xs font-black text-violet-400 mb-1">HOW TO LEVERAGE IT</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{capitalScore.leverageStrategy}</p>
                  </div>

                  {/* Priority 6: Per-pillar specific action */}
                  {/* v4.0 Personalization 2: Phase 0 prerequisite — rendered BEFORE the main strategy */}
                  {capitalScore.pillarPrerequisite?.isRequired && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                          ⚡ PHASE 0 — PREREQUISITE (Complete Before Phase 1)
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug mb-2" style={{ color: 'var(--amber)' }}>
                        {capitalScore.pillarPrerequisite.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {capitalScore.pillarPrerequisite.reason}
                      </p>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                        <p className="text-xs text-amber-300 leading-relaxed">{capitalScore.pillarPrerequisite.action}</p>
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1.5 font-mono opacity-60">
                        {capitalScore.pillarPrerequisite.weekRange}
                      </div>
                    </div>
                  )}

                  {capitalScore.leverageDetail && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <div className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                          YOUR NEXT ACTION — {capitalScore.leverageDetail.timeframe.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm font-semibold leading-snug mb-2">{capitalScore.leverageDetail.headline}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        {capitalScore.leverageDetail.specificAction}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                        ✓ Proof point: {capitalScore.leverageDetail.proofPoint}
                      </div>
                      {capitalScore.leverageDetail.gapWarning && (
                        <p className="text-[10px] text-amber-400 mt-2 leading-relaxed opacity-80">
                          ⚠ Gap: {capitalScore.leverageDetail.gapWarning}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CareerCapitalAssessment;
