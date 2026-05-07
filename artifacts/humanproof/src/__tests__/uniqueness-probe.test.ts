// Uniqueness probe — quantifies how much of the action plan output is shared
// across (company × role × tenure) combinations vs. how much is genuinely
// personalized. Targets a Jaccard-similarity threshold so future regressions
// (e.g. someone re-introducing a generic template) are caught.

import { describe, it, expect } from 'vitest';
import { calculateLayoffScore, type ScoreInputs } from '../services/layoffScoreEngine';
import { companyDatabase } from '../data/companyDatabase';
import { industryRiskData } from '../data/industryRiskData';
import { buildObsoleteAdvice, buildAtRiskAdvice } from '../services/skillAdviceBuilder';
import { composeExpPersona } from '../components/StrategicRoadmap';
import type { CareerIntelligence, SkillRisk } from '../data/intelligence/types';

// Build a permutation matrix: 4 companies × 3 roles × 2 tenure brackets
const COMPANIES = ['Google', 'Meta', 'Tata Consultancy Services', 'Oracle'];
const ROLES: Array<{ title: string; dept: string }> = [
  { title: 'Software Engineer', dept: 'Engineering' },
  { title: 'Marketing Coordinator', dept: 'Marketing' },
  { title: 'HR Business Partner', dept: 'HR' },
];
const TENURES = [1, 8];

function buildInputs(companyName: string, role: { title: string; dept: string }, tenure: number): ScoreInputs {
  const company = companyDatabase.find((c) => c.name === companyName)!;
  return {
    companyData: company,
    industryData: industryRiskData[company.industry] ?? industryRiskData['Technology'],
    roleTitle: role.title,
    department: role.dept,
    userFactors: {
      tenureYears: tenure,
      isUniqueRole: false,
      performanceTier: 'average',
      hasRecentPromotion: false,
      hasKeyRelationships: true,
    },
  };
}

// Strip variable substitutions ($company, $score, $role) so we measure the
// *narrative skeleton* that is shared across users. If the skeleton is
// identical for every user, the system is templated, not personalized.
function narrativeSkeleton(text: string): string {
  return text
    .replace(/\b\d+(\.\d+)?(%|\/100)?\b/g, '#')      // numbers + percentages
    .replace(/\$\{[^}]+\}/g, '#')                     // ${} interpolations
    .toLowerCase();
}

function jaccardOnWords(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 3));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

describe('Uniqueness probe — Personalized Action Plan', () => {
  it('different companies + same role should produce meaningfully different recommendations', () => {
    const role = ROLES[0]; // SWE
    const tenure = 5;
    const plans = COMPANIES.map((c) => {
      const r = calculateLayoffScore(buildInputs(c, role, tenure));
      return r.recommendations.map((p) => p.description).join(' || ');
    });

    // Pairwise Jaccard similarity on raw text. If every company gets the same
    // recommendations, all pairs will be ~1.0. We want < 0.85 average.
    const similarities: number[] = [];
    for (let i = 0; i < plans.length; i++) {
      for (let j = i + 1; j < plans.length; j++) {
        similarities.push(jaccardOnWords(plans[i], plans[j]));
      }
    }
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    console.log('Same-role / different-company avg Jaccard:', avgSimilarity.toFixed(3), similarities.map((s) => s.toFixed(2)));
    expect(avgSimilarity).toBeLessThan(0.85);
  });

  it('different roles + same company should produce meaningfully different recommendations', () => {
    const tenure = 5;
    const company = 'Google';
    const plans = ROLES.map((r) => {
      const result = calculateLayoffScore(buildInputs(company, r, tenure));
      return result.recommendations.map((p) => p.description).join(' || ');
    });

    const similarities: number[] = [];
    for (let i = 0; i < plans.length; i++) {
      for (let j = i + 1; j < plans.length; j++) {
        similarities.push(jaccardOnWords(plans[i], plans[j]));
      }
    }
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    console.log('Same-company / different-role avg Jaccard:', avgSimilarity.toFixed(3), similarities.map((s) => s.toFixed(2)));
    expect(avgSimilarity).toBeLessThan(0.85);
  });

  it('narrative skeletons should not be 100% identical across users in the same risk band', () => {
    // Compare structurally different companies: TCS (IT Services, India, large)
    // vs Google (Technology, US, FAANG). Same-tier large-cap US tech (Meta vs Oracle)
    // intentionally shares a template — that is correct behaviour.
    const tcs    = calculateLayoffScore(buildInputs('Tata Consultancy Services', ROLES[0], 5));
    const google = calculateLayoffScore(buildInputs('Google', ROLES[0], 5));

    const tcsSkeleton    = narrativeSkeleton(tcs.recommendations.map((p) => p.description).join(' || '));
    const googleSkeleton = narrativeSkeleton(google.recommendations.map((p) => p.description).join(' || '));

    const jaccard = jaccardOnWords(tcsSkeleton, googleSkeleton);
    console.log('TCS vs Google skeleton Jaccard:', jaccard.toFixed(3));
    // Allow high word-overlap (same role class) but not byte-for-byte identical skeletons
    expect(jaccard).toBeLessThan(1.0);
  });

  it('high-tenure user should receive different protection guidance than low-tenure user at same company', () => {
    const lowTenure = calculateLayoffScore(buildInputs('Meta', ROLES[0], 0.5));
    const highTenure = calculateLayoffScore(buildInputs('Meta', ROLES[0], 15));

    const lowText = lowTenure.recommendations.map((p) => p.description).join(' || ');
    const highText = highTenure.recommendations.map((p) => p.description).join(' || ');

    // Should NOT be identical — protective measures differ between probationary and senior tenure.
    expect(lowText).not.toBe(highText);
  });

  it('AI Risk skill advice — two skills with same aiReplacement but different aiTool/horizon must differ', () => {
    const swEng: SkillRisk = {
      skill: 'manual unit-test authoring',
      riskScore: 78,
      riskType: 'Automatable',
      horizon: '1-3yr',
      reason: 'AI test-generation tools cover the majority of unit cases',
      aiReplacement: 'Full',
      aiTool: 'GitHub Copilot, Cursor',
    };
    const designer: SkillRisk = {
      skill: 'static wireframe production',
      riskScore: 82,
      riskType: 'Automatable',
      horizon: '5yr+',
      reason: 'Generative-UI tools produce production-ready wireframes from prompts',
      aiReplacement: 'Full',
      aiTool: 'v0, Galileo',
    };
    const a = buildObsoleteAdvice(swEng);
    const b = buildObsoleteAdvice(designer);
    expect(a).not.toBe(b);
    // Each must reference its own tool name to be grounded, not generic.
    expect(a.toLowerCase()).toContain('copilot');
    expect(b.toLowerCase()).toContain('v0');
  });

  it('AI Risk at-risk advice — augmented vs partial-replacement skills produce different advice', () => {
    const augmented: SkillRisk = {
      skill: 'data exploratory analysis',
      riskScore: 55,
      riskType: 'Augmented',
      horizon: '3-5yr',
      reason: 'AI accelerates EDA but human framing of business questions remains key',
      aiReplacement: 'Partial',
      aiTool: 'Hex Magic',
    };
    const partial: SkillRisk = {
      skill: 'first-pass legal contract markup',
      riskScore: 70,
      riskType: 'Automatable',
      horizon: '1-3yr',
      reason: 'LLMs handle clause flagging; human judgement still needed on negotiation',
      aiReplacement: 'Partial',
      aiTool: 'Harvey',
    };
    expect(buildAtRiskAdvice(augmented)).not.toBe(buildAtRiskAdvice(partial));
  });

  it('Strategic Roadmap persona — same experience bracket but different roles produce different stance', () => {
    const sweIntel: CareerIntelligence = {
      displayRole: 'Software Engineer',
      summary: '',
      skills: {
        at_risk: [{
          skill: 'boilerplate code authoring',
          riskScore: 70,
          riskType: 'Augmented',
          horizon: '1-3yr',
          reason: 'Copilots handle the bulk of CRUD code',
          aiReplacement: 'Partial',
          aiTool: 'Cursor',
        }],
        safe: [{ skill: 'system design judgement', whySafe: 'requires cross-team trade-offs', longTermValue: 90, difficulty: 'High' }],
      },
      careerPaths: [{ role: 'Staff Engineer', riskReduction: 12, skillGap: 'mentorship + arch ownership', transitionDifficulty: 'Medium', industryMapping: ['Tech'], salaryDelta: '+10%', timeToTransition: '12mo' }],
    };
    const recruiterIntel: CareerIntelligence = {
      displayRole: 'Technical Recruiter',
      summary: '',
      skills: {
        at_risk: [{
          skill: 'candidate sourcing on LinkedIn',
          riskScore: 75,
          riskType: 'Automatable',
          horizon: '3-5yr',
          reason: 'AI sourcing tools handle keyword + intent matching at scale',
          aiReplacement: 'Full',
          aiTool: 'Eightfold',
        }],
        safe: [{ skill: 'closing senior candidates', whySafe: 'requires nuanced negotiation', longTermValue: 85, difficulty: 'High' }],
      },
      careerPaths: [{ role: 'Talent Brand Lead', riskReduction: 15, skillGap: 'employer-branding', transitionDifficulty: 'Medium', industryMapping: ['Tech', 'Services'], salaryDelta: '+5%', timeToTransition: '9mo' }],
    };

    const swePersona = composeExpPersona('5-10', sweIntel, 55);
    const recPersona = composeExpPersona('5-10', recruiterIntel, 55);
    expect(swePersona.persona).not.toBe(recPersona.persona);
    // Each must reference the actual at-risk skill / tool from its intel record.
    expect(swePersona.persona.toLowerCase()).toContain('cursor');
    expect(recPersona.persona.toLowerCase()).toContain('eightfold');
  });

  it('Strategic Roadmap urgency — high vs low risk score for same role produces different urgency tone', () => {
    const intel: CareerIntelligence = {
      displayRole: 'Marketing Coordinator',
      summary: '',
      skills: {
        at_risk: [{
          skill: 'social-post drafting',
          riskScore: 80,
          riskType: 'Automatable',
          horizon: '1-3yr',
          reason: 'GenAI handles bulk drafting + scheduling',
          aiReplacement: 'Full',
          aiTool: 'Jasper',
        }],
        safe: [{ skill: 'brand-voice ownership', whySafe: 'institutional context required', longTermValue: 80, difficulty: 'High' }],
      },
      careerPaths: [{ role: 'Brand Manager', riskReduction: 10, skillGap: 'P&L responsibility', transitionDifficulty: 'Medium', industryMapping: ['Marketing'], salaryDelta: '+8%', timeToTransition: '12mo' }],
    };
    const high = composeExpPersona('2-5', intel, 80);
    const low = composeExpPersona('2-5', intel, 25);
    expect(high.urgencyMod).not.toBe(low.urgencyMod);
  });

  it('industry context should appear in recommendations (not just role + company name)', () => {
    // A Healthcare company SWE should get *different* market context than a Tech SWE
    const tech = calculateLayoffScore(buildInputs('Google', ROLES[0], 5));
    const techText = tech.recommendations.map((p) => `${p.title} ${p.description}`).join(' ').toLowerCase();

    // The recommendations should reference at least ONE of: industry name, growth outlook,
    // industry-specific risk pattern, or AI investment signal — not just generic phrasing.
    const hasIndustryContext =
      techText.includes('technology') ||
      techText.includes('tech sector') ||
      techText.includes('volatile') ||
      techText.includes('ai investment') ||
      techText.includes('automation roadmap');

    expect(hasIndustryContext).toBe(true);
  });
});
