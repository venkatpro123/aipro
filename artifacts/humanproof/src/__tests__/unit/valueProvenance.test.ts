// valueProvenance.test.ts
// Contract tests: every registered field returns a non-null provenance with
// kind ∈ {measured, modeled, estimated} and a non-empty sourceLabel.
// Source-aware fields must change kind when a source override is matched.

import { describe, it, expect } from 'vitest';
import {
  getValueProvenance,
  listRegisteredFields,
  isFieldRegistered,
  SOURCE_LABELS,
} from '../../services/valueProvenance';

describe('valueProvenance — registry contract', () => {
  const VALID_KINDS = new Set(['measured', 'modeled', 'estimated']);

  it('every registered field returns a valid kind + non-empty sourceLabel', () => {
    const fields = listRegisteredFields();
    expect(fields.length).toBeGreaterThan(20);
    for (const field of fields) {
      const p = getValueProvenance(field);
      expect(VALID_KINDS.has(p.kind)).toBe(true);
      expect(p.sourceLabel.length).toBeGreaterThan(3);
      expect(p.field).toBe(field);
    }
  });

  it('unknown fields default to ESTIMATED with a warning label', () => {
    const p = getValueProvenance('this_field_does_not_exist');
    expect(p.kind).toBe('estimated');
    expect(p.sourceLabel).toContain('Unknown source');
  });

  it('top-level score fields are MODELED', () => {
    for (const field of ['total_risk_score', 'confidence_percent', 'risk_score_l1', 'survival_probability']) {
      expect(getValueProvenance(field).kind).toBe('modeled');
    }
  });

  it('user-reported inputs are MEASURED', () => {
    for (const field of ['financial_runway_months', 'tenure_years', 'salary_band']) {
      expect(getValueProvenance(field).kind).toBe('measured');
    }
  });

  it('careerPathMarket fields are ESTIMATED', () => {
    for (const field of ['india_openings_count', 'success_rate_12m_pct', 'weeks_to_first_interview']) {
      expect(getValueProvenance(field).kind).toBe('estimated');
    }
  });

  it('stock_90d_change flips MEASURED↔ESTIMATED based on source', () => {
    expect(getValueProvenance('stock_90d_change', 'alpha-vantage').kind).toBe('measured');
    expect(getValueProvenance('stock_90d_change', 'yahoo-finance').kind).toBe('measured');
    expect(getValueProvenance('stock_90d_change', 'heuristic').kind).toBe('estimated');
    expect(getValueProvenance('stock_90d_change', 'fallback').kind).toBe('estimated');
    expect(getValueProvenance('stock_90d_change').kind).toBe('estimated'); // default
  });

  it('layoff_rounds is MEASURED from verified sources, ESTIMATED from heuristic', () => {
    expect(getValueProvenance('layoff_rounds', 'warn-act').kind).toBe('measured');
    expect(getValueProvenance('layoff_rounds', 'layoffs-fyi').kind).toBe('measured');
    expect(getValueProvenance('layoff_rounds', 'heuristic').kind).toBe('estimated');
  });

  it('contingency_transition_feasibility upgrades from ESTIMATED to MODELED with market source', () => {
    expect(getValueProvenance('contingency_transition_feasibility').kind).toBe('estimated');
    expect(getValueProvenance('contingency_transition_feasibility', 'market_successRate').kind).toBe('modeled');
    expect(getValueProvenance('contingency_transition_feasibility', 'portability_matrix').kind).toBe('modeled');
  });

  it('contingency_stay and contingency_negotiate are ESTIMATED regardless of source', () => {
    expect(getValueProvenance('contingency_stay_feasibility').kind).toBe('estimated');
    expect(getValueProvenance('contingency_stay_feasibility', 'modeled').kind).toBe('estimated');
    expect(getValueProvenance('contingency_negotiate_feasibility').kind).toBe('estimated');
  });

  it('all preparedness pillars are MODELED', () => {
    const pillars = [
      'preparedness_overall', 'preparedness_financial', 'preparedness_market',
      'preparedness_skills', 'preparedness_clarity', 'preparedness_operational',
    ];
    for (const field of pillars) {
      expect(getValueProvenance(field).kind).toBe('modeled');
    }
  });

  it('WARN Act and SEC filings are always MEASURED', () => {
    expect(getValueProvenance('warn_filings').kind).toBe('measured');
    expect(getValueProvenance('revenue_growth_yoy', 'sec-edgar').kind).toBe('measured');
  });

  it('isFieldRegistered correctly identifies known vs unknown fields', () => {
    expect(isFieldRegistered('total_risk_score')).toBe(true);
    expect(isFieldRegistered('totally_made_up_field')).toBe(false);
  });

  it('SOURCE_LABELS covers all common providers', () => {
    const required = ['alpha-vantage', 'yahoo-finance', 'sec-edgar', 'warn-act', 'naukri',
      'layoffs-fyi', 'newsapi', 'bls', 'user_reported', 'heuristic', 'modeled'];
    for (const provider of required) {
      expect(SOURCE_LABELS[provider]).toBeDefined();
      expect(SOURCE_LABELS[provider].length).toBeGreaterThan(3);
    }
  });
});
