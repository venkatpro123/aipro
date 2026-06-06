// EnhancedActionPlan — §8 Personal Action Plan
// Fully personalized: role + country + experience + D7 conditioned.
// 4 time horizons + OutcomeSimulationPanel.

import React, { useState } from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import { StrategicRoadmap } from '../StrategicRoadmap';
import { OutcomeSimulationPanel } from './OutcomeSimulationPanel';
import { getCountryCluster } from '../../data/intelligence/countryIntelligenceModifier';

interface Props {
  intel: CareerIntelligence | null;
  experience: string;
  score: number;
  trajectory: TrajectoryResult | null;
  scoreColor: string;
  salaryRange?: string;
  countryKey?: string;
  industryKey?: string;
  roleKey?: string;
  d7Score?: number;
  automationTimeline?: AutomationTimeline | null;
}

type Horizon = '30d' | '90d' | '12m' | 'threshold';
type ExpTier = 'entry' | 'early' | 'mid' | 'senior' | 'principal';

interface ActionCard {
  title: string;
  detail: string;
  riskReduction: number;
  protectionIncrease: number;
  effort: 'Low' | 'Medium' | 'High';
  category: 'Skill' | 'Network' | 'Positioning' | 'Financial';
  strategicImpact?: 'Critical' | 'High' | 'Medium' | 'Low';
  timeRequired?: string;
  roi?: 'Exceptional' | 'High' | 'Moderate' | 'Low';
}

const EFFORT_COLORS = { Low: 'var(--emerald)', Medium: 'var(--amber)', High: 'var(--red)' };
const CAT_COLORS = { Skill: 'var(--cyan)', Network: 'var(--violet)', Positioning: 'var(--amber)', Financial: 'var(--emerald)' };
const IMPACT_COLORS = { Critical: 'var(--red)', High: 'var(--amber)', Medium: 'var(--cyan)', Low: 'var(--text-3)' };
const ROI_COLORS = { Exceptional: 'var(--emerald)', High: 'var(--cyan)', Moderate: 'var(--amber)', Low: 'var(--text-3)' };

function getExpTier(experience: string): ExpTier {
  if (experience === '0-2')  return 'entry';
  if (experience === '2-5')  return 'early';
  if (experience === '5-10') return 'mid';
  if (experience === '10-20')return 'senior';
  return 'principal';
}

function getCountryPlatformNote(countryKey: string): { platform: string; certNote: string; bufferCurrency: string } {
  const cluster = getCountryCluster(countryKey);
  if (cluster === 'south_asia')   return { platform: 'LinkedIn India, Naukri, Instahyre', certNote: 'NASSCOM FutureSkills or Coursera (India pricing)', bufferCurrency: '₹3–6L' };
  if (cluster === 'north_america')return { platform: 'LinkedIn, Glassdoor, Levels.fyi', certNote: 'Coursera, LinkedIn Learning, or vendor certs', bufferCurrency: '$15k–$30k' };
  if (cluster === 'europe')       return { platform: 'LinkedIn, XING (DE), Jobteaser', certNote: 'EU AI Act awareness + vendor AI certs', bufferCurrency: '€10k–€25k' };
  if (cluster === 'gcc')          return { platform: 'LinkedIn, Bayt, GulfTalent', certNote: 'Vendor certs (Microsoft, AWS)', bufferCurrency: 'AED 30k–60k' };
  if (cluster === 'sea')          return { platform: 'LinkedIn, JobStreet, MyCareersFuture', certNote: 'Coursera or AWS/Google certs', bufferCurrency: 'SGD 10k–25k' };
  return { platform: 'LinkedIn, local job boards', certNote: 'Coursera or vendor AI certifications', bufferCurrency: '3–6 months salary' };
}

function getRoleFirst30DayAction(roleKey: string, roleLabel: string): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  if (rl.includes('bpo') || rl.includes('customer_support') || rl.includes('support'))
    return { title: 'Document your 5 highest-complexity escalation cases', detail: 'Write up the 5 most complex customer situations you resolved that required genuine human judgment — emotional intelligence, regulatory nuance, or multi-system context. These cases are your displacement shield: they demonstrate irreplaceable capability no AI system handles today.', riskReduction: 4, protectionIncrease: 8, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–4 hrs total', roi: 'High' };
  if (rl.includes('swe') || rl.includes('software') || rl.includes('engineer') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend') || rl.includes('fullstack'))
    return { title: 'Audit which of your recent work an LLM could generate without you', detail: 'Review your last 10 pull requests or tasks. Score each: could Claude Code or Cursor have written this with a good prompt? The ones that score "yes" are your highest-displacement tasks. The ones that score "no" are your moat. This audit becomes your personalized repositioning roadmap.', riskReduction: 4, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };
  if (rl.includes('nurse') || rl.includes('physician') || rl.includes('doctor') || rl.includes('health') || rl.includes('clinical'))
    return { title: 'Map the clinical tasks where your physical presence was irreplaceable this week', detail: 'Identify 3 patient interactions this week that required your physical presence, touch, or in-person emotional attunement. Document what would have been lost without you in the room. This is not just a resilience exercise — it is also career positioning evidence for the AI-augmented clinical era.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs', roi: 'Moderate' };
  if (rl.includes('financial') || rl.includes('analyst') || rl.includes('finance') || rl.includes('invest'))
    return { title: 'Identify which of your analyses required contextual judgment no AI prompted', detail: 'Review your last 5 major deliverables. For each, ask: what decision or insight required your knowledge of organizational context, relationship dynamics, or business strategy that no AI tool could have surfaced from the data alone? Document these moments — they define your non-displaceable value.', riskReduction: 4, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };
  // generic fallback
  return { title: 'Audit your task profile for AI replaceability', detail: 'List your 10 most frequent daily tasks and score each on AI replaceability (1 = fully replaceable, 5 = fully human-essential). This creates your personal displacement map and reveals exactly where to invest your repositioning energy.', riskReduction: 3, protectionIncrease: 5, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'High' };
}

function getRoleCertAction(roleKey: string, roleLabel: string, countryKey: string, expTier: ExpTier): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const { certNote } = getCountryPlatformNote(countryKey);
  let certTitle = 'Complete one role-relevant AI tool proficiency credential';
  let certDetail = `Earning an AI tool certification signals adaptability and builds real capability. Use ${certNote} as your primary resource.`;

  if (rl.includes('swe') || rl.includes('software') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend'))
    { certTitle = 'Earn a GitHub Copilot or Claude API developer credential'; certDetail = `Complete GitHub's Copilot certification or build a project using the Claude API. AI-native coding is the new baseline for senior engineers. Use ${certNote}.`; }
  else if (rl.includes('data_analyst') || (rl.includes('data') && rl.includes('analyst')))
    { certTitle = 'Complete a dbt + LLM pipeline or Snowflake ML certification'; certDetail = `Data analysts who can orchestrate AI-powered data pipelines command a significant premium. DBT Core certification + one LLM tool integration project demonstrates both skill and adaptability. Use ${certNote}.`; }
  else if (rl.includes('bpo') || rl.includes('customer_support'))
    { certTitle = 'Complete an AI CX design certification (Salesforce Einstein or Intercom AI)'; certDetail = `Understanding how AI tools you work alongside are architected transforms you from someone AI replaces into someone who configures and improves it. Salesforce and Intercom both offer free certifications. Use ${certNote}.`; }
  else if (rl.includes('nurse') || rl.includes('clinical'))
    { certTitle = 'Complete clinical AI documentation training (Epic AI or Nuance DAX)'; certDetail = `Clinical AI literacy — understanding how ambient documentation and AI co-pilot tools work — positions you as a clinical AI champion rather than a resistant observer. Your hospital likely offers Epic-adjacent training. Use ${certNote}.`; }
  else if (rl.includes('financial') || (rl.includes('finance') && rl.includes('analyst')))
    { certTitle = 'Earn Bloomberg AI Terminal or AlphaSense proficiency'; certDetail = `Analysts who master AI-augmented research tools are 3-5x more productive than those who do not. Bloomberg AI and AlphaSense both offer training tracks. This directly compresses the displacement risk on your most automatable tasks. Use ${certNote}.`; }
  else if (rl.includes('soc') || rl.includes('security') || rl.includes('cyber'))
    { certTitle = 'Complete a SOAR platform or Security AI tool certification'; certDetail = `Proficiency in platforms like XSIAM, Sentinel, or Security Copilot transforms you from a target of AI displacement into an AI security systems operator. Vendors offer free learning paths. Use ${certNote}.`; }

  return { title: certTitle, detail: certDetail, riskReduction: 8, protectionIncrease: 14, effort: 'Medium', category: 'Skill', strategicImpact: 'Critical', timeRequired: '40–60 hrs total', roi: 'Exceptional' };
}

function buildPersonalizedActions(
  roleKey: string,
  roleLabel: string,
  experience: string,
  score: number,
  countryKey: string,
  industryKey: string,
  d7Score: number,
  salaryRange: string | undefined,
  trajectory: TrajectoryResult | null,
): Record<Horizon, ActionCard[]> {
  const expTier = getExpTier(experience);
  const isHighRisk = score >= 65;
  const isMedRisk = score >= 45;
  const crossoverYr = trajectory?.displacementCrossover ?? null;
  const thresholdNear = crossoverYr && parseInt(crossoverYr, 10) - new Date().getFullYear() <= 3;
  const { platform, bufferCurrency } = getCountryPlatformNote(countryKey);

  // ── 30-day: defensive ─────────────────────────────────────────────────────
  const action30_1 = getRoleFirst30DayAction(roleKey, roleLabel);

  const action30_2: ActionCard = expTier === 'entry' || expTier === 'early'
    ? { title: 'Try one AI productivity tool in your daily workflow', detail: `Spend 20–30 minutes daily using an AI tool (ChatGPT, Claude, Copilot) for your actual work tasks. At ${expTier === 'entry' ? 'entry' : 'early'} career stage, AI proficiency is not just protective — it is increasingly a hiring prerequisite.`, riskReduction: 5, protectionIncrease: 9, effort: 'Low', category: 'Skill', strategicImpact: 'High', timeRequired: '30 min/day', roi: 'Exceptional' }
    : expTier === 'senior' || expTier === 'principal'
    ? { title: 'Document and publish your domain expertise externally', detail: `At ${expTier} level, institutional knowledge is your primary moat — but only if it is visible externally. Write one article, give one talk, or contribute to one community this month. External reputation insulates from single-employer dependency. Use ${platform}.`, riskReduction: 3, protectionIncrease: 10, effort: 'Low', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs', roi: 'High' }
    : { title: 'Connect with 3 people in adjacent or more AI-resistant roles', detail: `Network with colleagues in roles on the less-automated side of your evolution path now, while your current role gives you credibility. Use ${platform} to identify and reach out.`, riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Network', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  const action30_3: ActionCard = { title: 'Deliberately shift one routine task toward AI-resistant work', detail: 'Identify one task in your current workload you can replace with higher-judgment, more human-essential work. Even a 10% shift in task profile begins repositioning you before the market forces it.', riskReduction: 3, protectionIncrease: 5, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs/week', roi: 'Moderate' };

  // ── 90-day: capability upgrade ────────────────────────────────────────────
  const action90_1 = getRoleCertAction(roleKey, roleLabel, countryKey, expTier);

  const action90_2: ActionCard = expTier === 'entry' || expTier === 'early'
    ? { title: 'Seek out one AI-adjacent project at your current employer', detail: 'Volunteer to be on any team piloting an AI tool, automation workflow, or data project. Early-career professionals who build AI project experience now have a structural advantage over peers who wait.', riskReduction: 6, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week extra', roi: 'High' }
    : { title: 'Shift 20% of your work toward AI-resistant, judgment-intensive tasks', detail: 'Deliberately seek stakeholder-facing, strategic, and complexity-intensive work. Negotiate with your manager to own one higher-order deliverable. This repositions you in the role before the market does — and makes the repositioning visible to decision-makers.', riskReduction: 7, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  const bufferMonths = salaryRange && (salaryRange === '200k+' || salaryRange === '100-200k') ? '6-month' : '3-month';
  const action90_3: ActionCard = { title: `Build a ${bufferMonths} emergency financial buffer`, detail: `Financial runway removes the desperation premium from career decisions. With ${bufferCurrency} in reserve, you can move on your terms — not under pressure. This is the most underrated career protection action.`, riskReduction: 0, protectionIncrease: 15, effort: 'High', category: 'Financial', strategicImpact: 'Critical', timeRequired: 'Ongoing', roi: 'Exceptional' };

  // ── Before threshold: pre-agentic positioning ──────────────────────────────
  let thresholdLabel: 'CRITICAL WINDOW' | 'PROACTIVE POSITIONING' | 'MONITORING MODE';
  let thresholdColor: string;
  if (d7Score > 75) { thresholdLabel = 'CRITICAL WINDOW'; thresholdColor = 'var(--red)'; }
  else if (d7Score >= 30) { thresholdLabel = 'PROACTIVE POSITIONING'; thresholdColor = 'var(--amber)'; }
  else { thresholdLabel = 'MONITORING MODE'; thresholdColor = 'var(--emerald)'; }

  const action_t1: ActionCard = d7Score > 75
    ? { title: 'Begin building a parallel income stream or adjacent role capability now', detail: `With your role carrying high structural exposure (D7: ${d7Score}/100), the pre-threshold window is your most valuable asset. ${thresholdNear ? 'With the threshold approaching in ~3 years, urgency is real. ' : ''}Begin generating any income — freelance, consulting, training — from an AI-resilient adjacent skill. This is the single highest-ROI action for your risk profile.`, riskReduction: 15, protectionIncrease: 25, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' }
    : d7Score >= 30
    ? { title: 'Build deep expertise in one uniquely human, AI-resistant capability', detail: 'The pre-threshold window is your best time to establish credibility in protected areas. Pick one skill — complex stakeholder management, domain-specific judgment, physical presence — and systematically deepen it before the market compresses opportunity.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' }
    : { title: 'Monitor AI capability developments in your domain quarterly', detail: 'Your role has strong structural protection. Maintain a quarterly review habit: what can AI do in your field now that it could not 6 months ago? Staying informed early gives you maximum lead time to adapt if the landscape shifts.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2 hrs/quarter', roi: 'Moderate' };

  const action_t2: ActionCard = { title: 'Build visible expertise outside your current employer', detail: `Create content, speak at events, or contribute to open communities. External reputation insulates you from single-employer dependency and creates optionality that internal-only careers cannot. Use ${platform} to find your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  const action_t3: ActionCard = { title: 'Evaluate roles in structurally growing areas proactively', detail: `Map your current skills to roles in sectors with growing AI-resistant headcount. ${expTier === 'senior' || expTier === 'principal' ? 'At your seniority level, proactive role evaluation before you need to move is 3x more effective than reactive searching under pressure.' : 'Proactive positioning before the market forces change gives you the negotiating leverage to move on your terms.'} Use ${platform} to research target roles now.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  return {
    '30d': [action30_1, action30_2, action30_3],
    '90d': [action90_1, action90_2, action90_3],
    '12m': [],
    'threshold': [action_t1, action_t2, action_t3],
  };
}

export const EnhancedActionPlan: React.FC<Props> = ({
  intel, experience, score, trajectory, scoreColor, salaryRange,
  countryKey = 'usa', industryKey = '', roleKey = '', d7Score = 55, automationTimeline,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('30d');

  const roleLabel = intel?.displayRole ?? roleKey;
  const crossoverYr = trajectory?.displacementCrossover;
  const crossoverNum = crossoverYr ? (parseInt(crossoverYr, 10) || 0) : 0;
  const thresholdLabel = crossoverYr && crossoverNum > 0
    ? `Before ${crossoverNum - 1}–${crossoverYr}`
    : 'Before Threshold';

  const personalized = buildPersonalizedActions(
    roleKey, roleLabel, experience, score, countryKey, industryKey, d7Score, salaryRange, trajectory,
  );

  // D7 threshold badge
  let d7Badge: { label: string; color: string } | null = null;
  if (d7Score > 75)      d7Badge = { label: 'CRITICAL WINDOW', color: 'var(--red)' };
  else if (d7Score >= 30) d7Badge = { label: 'PROACTIVE POSITIONING', color: 'var(--amber)' };
  else                    d7Badge = { label: 'MONITORING MODE', color: 'var(--emerald)' };

  const horizons: { key: Horizon; label: string }[] = [
    { key: '30d',       label: 'Next 30 Days' },
    { key: '90d',       label: 'Next 90 Days' },
    { key: '12m',       label: 'Next 12 Months' },
    { key: 'threshold', label: thresholdLabel },
  ];

  const currentActions = personalized[activeHorizon];
  const allActions = [
    ...personalized['30d'],
    ...personalized['90d'],
    ...personalized['threshold'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>PERSONAL ACTION PLAN</h3>
        {d7Badge && (
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${d7Badge.color}12`, border: `1px solid ${d7Badge.color}30`, fontSize: '0.58rem', fontWeight: 800, color: d7Badge.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {d7Badge.label}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '20px', lineHeight: 1.5 }}>
        Role-specific, experience-aware, country-calibrated actions ordered by strategic impact. Each action shows estimated risk reduction and future protection gain.
      </p>

      {/* Horizon tab pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {horizons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveHorizon(key)}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeHorizon === key ? scoreColor : 'rgba(255,255,255,0.05)',
              color: activeHorizon === key ? '#000' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 12-month: use StrategicRoadmap */}
      {activeHorizon === '12m' ? (
        intel ? (
          <StrategicRoadmap intel={intel} experience={experience} scoreColor={scoreColor} score={score} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {personalized['90d'].map((action) => (
              <ActionCardComponent key={action.title} action={{ ...action, riskReduction: action.riskReduction + 5, protectionIncrease: action.protectionIncrease + 8 }} scoreColor={scoreColor} />
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-3)' }}>
              No specific actions for this horizon.
            </div>
          ) : (
            currentActions.map((action) => (
              <ActionCardComponent key={action.title} action={action} scoreColor={scoreColor} />
            ))
          )}
        </div>
      )}

      {/* Priority note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Risk Reduction and Protection Increase are estimated based on research into upskilling, career positioning, and AI adaptation outcomes. Individual results vary by execution quality and market conditions.
      </div>

      {/* Outcome Simulation — always shown */}
      {trajectory && automationTimeline && (
        <OutcomeSimulationPanel
          timeline={automationTimeline}
          trajectory={trajectory}
          score={score}
          d7Score={d7Score}
          experience={experience}
          actions={allActions}
        />
      )}
    </div>
  );
};

function ActionCardComponent({ action, scoreColor }: { action: ActionCard; scoreColor: string }) {
  const effortC = EFFORT_COLORS[action.effort];
  const catC    = CAT_COLORS[action.category];
  const impactC = action.strategicImpact ? IMPACT_COLORS[action.strategicImpact] : 'var(--text-3)';
  const roiC    = action.roi ? ROI_COLORS[action.roi] : 'var(--text-3)';

  return (
    <div style={{
      padding: '16px 20px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {action.title}
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${catC}15`, border: `1px solid ${catC}30`, fontSize: '0.58rem', fontWeight: 800, color: catC, fontFamily: 'var(--font-mono)' }}>
            {action.category.toUpperCase()}
          </span>
          <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${effortC}15`, border: `1px solid ${effortC}30`, fontSize: '0.58rem', fontWeight: 800, color: effortC, fontFamily: 'var(--font-mono)' }}>
            {action.effort.toUpperCase()} EFFORT
          </span>
          {action.strategicImpact && (
            <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${impactC}12`, border: `1px solid ${impactC}28`, fontSize: '0.58rem', fontWeight: 800, color: impactC, fontFamily: 'var(--font-mono)' }}>
              {action.strategicImpact.toUpperCase()} IMPACT
            </span>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.73rem', color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {action.detail}
      </p>

      {/* Metrics row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {action.riskReduction > 0 && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.65rem', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Risk Reduction: −{action.riskReduction} pts
          </div>
        )}
        <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.65rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          Protection +{action.protectionIncrease}%
        </div>
        {action.timeRequired && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            ⏱ {action.timeRequired}
          </div>
        )}
        {action.roi && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: `${roiC}08`, border: `1px solid ${roiC}20`, fontSize: '0.65rem', color: roiC, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            ROI: {action.roi}
          </div>
        )}
      </div>
    </div>
  );
}
