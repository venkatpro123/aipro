// actionDbIntegrityRegression.test.ts
//
// The base ACTION_DB in actionPersonalizationEngine.ts has initial entries for
// llm_engineer, data_engineer, nlp_engineer, and portfolio_manager. These are
// INTENTIONALLY overwritten by later Object.assign calls:
//   llm_engineer + nlp_engineer → AI_ML_SPECIALIZATION_ACTION_DB
//   data_engineer               → CLOUD_PLATFORM_ACTION_DB
//   portfolio_manager           → QUANT_ASSET_HEDGE_ACTION_DB
//
// The overwriting content has been verified to be higher-quality and more
// current. If a future refactor accidentally removes one of those Object.assign
// calls, the affected role will silently fall back to generic base content —
// these tests catch that by asserting that a title unique to the overwriting
// module appears in the critical-tier result.

import { describe, it, expect } from 'vitest';
import { getPersonalizedActions } from '../../services/actionPersonalizationEngine';

describe('ACTION_DB intentional override regression', () => {
  it('llm_engineer: final pool comes from AI_ML_SPECIALIZATION (Anthropic Workbench eval suite action)', () => {
    // "Ship a Public Anthropic Workbench / OpenAI Playground Eval Suite This Week"
    // exists only in the AI_ML_SPECIALIZATION overwrite — not in the base entry.
    // Note: 'junior' seniority is required to reach the first Critical-priority action.
    const result = getPersonalizedActions('LLM Engineer', 'junior', 80, 'US');
    const titles = result.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('Anthropic Workbench') || t.includes('OpenAI Playground Eval Suite'))).toBe(true);
  });

  it('nlp_engineer: final pool comes from AI_ML_SPECIALIZATION (pre-LLM pipeline migration action)', () => {
    // "Migrate Off Pre-LLM NLP Pipelines and Own a Production LLM-Native Workflow"
    // exists only in the AI_ML_SPECIALIZATION overwrite.
    const result = getPersonalizedActions('NLP Engineer', 'junior', 80, 'US');
    const titles = result.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('Migrate Off Pre-LLM NLP Pipelines'))).toBe(true);
  });

  it('data_engineer: final pool comes from CLOUD_PLATFORM (Airflow → Lakehouse migration action)', () => {
    // "Migrate One Critical Pipeline from Airflow PythonOperator to a Native Lakehouse Pattern"
    // exists only in the CLOUD_PLATFORM overwrite — not in the base entry.
    const result = getPersonalizedActions('Data Engineer', 'mid', 80, 'US');
    const titles = result.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('Airflow PythonOperator') || t.includes('Native Lakehouse Pattern'))).toBe(true);
  });

  it('portfolio_manager: final pool comes from QUANT_ASSET_HEDGE (Bloomberg track record action)', () => {
    // "Build a Bloomberg-Verified 36-Month Track Record with Attribution"
    // exists only in the QUANT_ASSET_HEDGE overwrite — not in the base entry.
    const result = getPersonalizedActions('Portfolio Manager', 'junior', 80, 'US');
    const titles = result.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('Bloomberg-Verified') || t.includes('36-Month Track Record'))).toBe(true);
  });
});
