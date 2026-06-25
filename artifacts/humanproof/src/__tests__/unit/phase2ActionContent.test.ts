// phase2ActionContent.test.ts — Master Loop iterations 2-6
//
// Verifies that the hand-authored PHASE2_ACTION_DB content is reachable for
// every role group in the core ACTION_DB (49 of ~52 entries — the remaining
// 3 are structurally unreachable aliases: cv_engineer, staff_engineer, and
// distinguished_engineer all collapse into other, covered roleGroups), and
// that exhausting the urgency-tier reservoir surfaces genuinely new
// (non-repeating) content rather than recycling. This directly addresses the
// audit's "Action Evolution" requirement (Month 1 -> Month 12 progression).
// Separate multi-industry pools (healthcare, manufacturing, etc.) are NOT
// covered by this content — see the 'Civil Engineer' control tests below.

import { describe, it, expect } from 'vitest';
import { getPersonalizedActions } from '../../services/actionPersonalizationEngine';
import { stableActionId } from '../../services/actionIdUtil';

function idsOf(actions: Array<{ title?: string }>): Set<string> {
  return new Set(actions.map(a => stableActionId('pa', a.title ?? '')));
}

// One representative role title per PHASE2_ACTION_DB entry, chosen so
// resolveRoleGroup() maps it to the expected role group key, paired with one
// distinctive Phase-2 title fragment unique to that role's authored content.
const ROLE_CASES: Array<{ group: string; title: string; phase2Fragment: string }> = [
  { group: 'swe',             title: 'Software Engineer', phase2Fragment: 'AI-Adoption Reviewer' },
  { group: 'swe_backend',     title: 'Backend Engineer',  phase2Fragment: 'AI Infrastructure Cost' },
  { group: 'swe_frontend',    title: 'Frontend Engineer', phase2Fragment: 'AI-Generated UI Component Standards' },
  { group: 'data_scientist',  title: 'Data Scientist',    phase2Fragment: 'ML Governance & Model Risk' },
  { group: 'ml_engineer',     title: 'ML Engineer',       phase2Fragment: 'Model-Serving Cost Optimization' },
  { group: 'product_manager', title: 'Product Manager',  phase2Fragment: 'AI Feature P&L' },
  { group: 'devops',          title: 'DevOps Engineer',   phase2Fragment: 'AI-Driven Incident Response' },
  { group: 'qa_engineer',     title: 'QA Engineer',       phase2Fragment: 'AI Test-Generation Tooling' },
  { group: 'data_engineer',              title: 'Data Engineer',               phase2Fragment: 'LLM-Ready Data Pipeline' },
  { group: 'security_engineer',          title: 'Security Engineer',           phase2Fragment: 'AI/LLM Security Risk Assessment' },
  { group: 'eng_manager',                title: 'Engineering Manager',         phase2Fragment: 'AI-Tooling Adoption Scorecard' },
  { group: 'ux_designer',                title: 'UX Designer',                 phase2Fragment: 'AI-Assisted Design Workflow Standards' },
  { group: 'platform_engineer',          title: 'Platform Engineer',           phase2Fragment: 'Internal AI/ML Platform Layer' },
  { group: 'financial_analyst',          title: 'Financial Analyst',           phase2Fragment: 'AI-Assisted Forecasting Models' },
  { group: 'business_development_manager', title: 'Business Development Manager', phase2Fragment: 'AI-Assisted Pipeline Intelligence' },
  { group: 'hr_business_partner',        title: 'HRBP',                        phase2Fragment: 'Responsible AI-in-Hiring Review' },
  { group: 'customer_success_manager',   title: 'Customer Success Manager',    phase2Fragment: 'AI-Assisted Account Health Scoring' },
  { group: 'analytics_engineer',         title: 'Analytics Engineer',          phase2Fragment: 'Semantic Layer for AI-Consumable Analytics' },
  { group: 'ai_engineer',          title: 'AI Engineer',          phase2Fragment: 'LLM Evaluation & Prompt Regression' },
  { group: 'data_analyst',         title: 'Data Analyst',         phase2Fragment: 'AI-Assisted Self-Serve Analytics' },
  { group: 'cloud_architect',      title: 'Cloud Architect',      phase2Fragment: 'AI Workload Cloud Architecture Strategy' },
  { group: 'tech_lead',            title: 'Tech Lead',            phase2Fragment: 'AI-Tooling Playbook' },
  { group: 'ux_researcher',        title: 'UX Researcher',        phase2Fragment: 'AI-Assisted Research Synthesis Workflow' },
  { group: 'risk_analyst',         title: 'Risk Analyst',         phase2Fragment: 'AI Model Risk Assessment' },
  { group: 'account_executive',    title: 'Account Executive',    phase2Fragment: 'AI-Assisted Deal Intelligence' },
  { group: 'hr_generalist',        title: 'HR Generalist',        phase2Fragment: 'Responsible AI-in-HR Tooling Review' },
  { group: 'investment_banker',    title: 'Investment Banker',    phase2Fragment: 'AI-Assisted Pitch Book and Comp Analysis' },
  { group: 'sales_engineer',       title: 'Sales Engineer',       phase2Fragment: 'AI-Assisted Technical Demo and POC Workflow' },
  { group: 'llm_engineer',         title: 'LLM Engineer',         phase2Fragment: 'Prompt Versioning and Regression Testing' },
  { group: 'nlp_engineer',         title: 'NLP Engineer',         phase2Fragment: 'LLM-vs-Classical-NLP Decision Framework' },
  { group: 'computer_vision_engineer', title: 'Computer Vision Engineer', phase2Fragment: 'Model Monitoring & Drift Detection' },
  { group: 'embedded_engineer',    title: 'Embedded Engineer',    phase2Fragment: 'On-Device AI/ML Inference Initiative' },
  { group: 'principal_engineer',   title: 'Principal Engineer',   phase2Fragment: 'AI-Adoption Technical Strategy' },
  { group: 'bi_analyst',           title: 'BI Analyst',           phase2Fragment: 'Semantic Layer / Metrics Governance' },
  { group: 'quantitative_analyst', title: 'Quantitative Analyst', phase2Fragment: 'LLM-Assisted Research or Signal-Generation' },
  { group: 'portfolio_manager',    title: 'Portfolio Manager',    phase2Fragment: "Firm's Evaluation of AI-Assisted Research Tools" },
  { group: 'vp_sales',             title: 'VP Sales',             phase2Fragment: 'AI-Assisted Sales Forecasting and Pipeline Intelligence' },
  { group: 'hr_director',          title: 'HR Director',          phase2Fragment: "Responsible-AI Workforce Strategy" },
  { group: 'swe_mobile',           title: 'Mobile Developer',     phase2Fragment: "App's AI-Powered Feature Roadmap" },
  { group: 'solution_architect',   title: 'Solutions Architect',  phase2Fragment: 'Reference Architecture for AI-Integrated Solutions' },
  { group: 'support_engineer',     title: 'Support Engineer',     phase2Fragment: 'AI-Assisted Ticket Triage and Resolution Tooling' },
  { group: 'professional_services', title: 'Professional Services Consultant', phase2Fragment: 'AI-Tooling Pilot That Measurably Improves Your Core Workflow' },
  { group: 'brand_designer',       title: 'Brand Designer',       phase2Fragment: 'AI-Generated Brand Asset Quality Standard' },
  { group: 'compliance_officer',   title: 'Compliance Officer',   phase2Fragment: 'AI Governance and Regulatory-Risk Review' },
  { group: 'sales_operations_analyst', title: 'Sales Operations Analyst', phase2Fragment: 'AI-Assisted Forecasting and Deal-Scoring Model' },
  { group: 'talent_acquisition_specialist', title: 'Talent Acquisition Specialist', phase2Fragment: 'Responsible AI-in-Sourcing and Screening Review' },
  { group: 'recruiting_manager',   title: 'Recruiting Manager',   phase2Fragment: 'AI-Sourcing Tool Evaluation and Governance Framework' },
  { group: 'bpo_associate',        title: 'BPO Associate',        phase2Fragment: 'Pilot AI-Assisted Workflow Tools Before They Are Mandated' },
  { group: 'swe_fullstack',        title: 'Full Stack Developer', phase2Fragment: 'AI Infrastructure Cost & Governance' },
];

describe('PHASE2_ACTION_DB reachability', () => {
  it.each(ROLE_CASES)(
    '$group ($title): draining the urgency-tier reservoir surfaces its Phase-2 content',
    ({ title, phase2Fragment }) => {
      // High risk score keeps the urgency-tier reservoir small so it drains quickly.
      let completed = new Set<string>();
      let result = getPersonalizedActions(title, 'mid', 90, 'IN', undefined, undefined, undefined, undefined, undefined, undefined, undefined, completed);
      expect(result.actions.length).toBeGreaterThan(0);

      let foundPhase2 = result.actions.some(a => (a.title ?? '').includes(phase2Fragment));
      let guard = 0;
      while (!foundPhase2 && !result.allActionsExhausted && guard < 10) {
        completed = new Set([...completed, ...idsOf(result.actions)]);
        result = getPersonalizedActions(title, 'mid', 90, 'IN', undefined, undefined, undefined, undefined, undefined, undefined, undefined, completed);
        foundPhase2 = result.actions.some(a => (a.title ?? '').includes(phase2Fragment));
        guard++;
      }

      expect(foundPhase2).toBe(true);
    },
  );

  it('swe Phase-2 actions have distinct titles from the urgency-tier pool (genuinely new content, not a repeat)', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'mid', 90, 'IN');
    const freshIds = idsOf(fresh.actions);

    const rotated = getPersonalizedActions(
      'Software Engineer', 'mid', 90, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      freshIds,
    );
    expect(rotated.actions.length).toBeGreaterThan(0);
    for (const id of idsOf(rotated.actions)) {
      expect(freshIds.has(id)).toBe(false);
    }
  });

  it('a role with no PHASE2_ACTION_DB entry is unaffected (no spurious content injected)', () => {
    // 'Civil Engineer' is served from the separate MANUFACTURING_ENERGY_CONSTRUCTION
    // multi-industry pool and has no PHASE2_ACTION_DB entry — virtually every
    // role group in the CORE ACTION_DB now has Phase-2 content.
    const result = getPersonalizedActions('Civil Engineer', 'mid', 60, 'IN');
    expect(result.actions.length).toBeGreaterThan(0);
    // None of the swe-specific Phase-2 titles should leak into an unrelated role.
    const titles = result.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('AI-Adoption Reviewer'))).toBe(false);
  });
});
