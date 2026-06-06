// corpusData.ts — Career intelligence corpus chunk
//
// This file is the ONLY place that statically imports the 12 intelligence
// modules. It is referenced exclusively via dynamic import() in index.ts so
// Vite bundles it (and all its deps) into the career-intelligence chunk,
// which does NOT load at app startup.
//
// Do NOT add a static import of this file anywhere in the main chunk graph.
// The only allowed reference is: await import('./corpusData') inside
// ensureCareerIntelligenceLoaded() in index.ts.

import type { CareerIntelligence } from './types';

import { TECH_INTELLIGENCE }         from './tech';
import { FINANCE_INTELLIGENCE }       from './finance';
import { HEALTHCARE_INTELLIGENCE }    from './healthcare';
import { INDUSTRY_INTELLIGENCE }      from './industry';
import { CREATIVE_INTELLIGENCE }      from './creative';
import { SERVICES_LEGAL_INTELLIGENCE } from './services_legal';
import { SERVICES_HR_INTELLIGENCE }   from './services_hr';
import { SERVICES_INTELLIGENCE }      from './services';
import { EMERGING_INTELLIGENCE }      from './emerging';
import { SERVICES_GOV_INTELLIGENCE }  from './services_gov';
import { SERVICES_EDU_INTELLIGENCE }  from './services_edu';
import { SERVICES_RETAIL_INTELLIGENCE } from './services_retail';
import { SERVICES_TRAVEL_INTELLIGENCE } from './services_travel';
import { SERVICES_MEDIA_INTELLIGENCE }  from './services_media';

/**
 * Fully assembled corpus. Returned by the dynamic import and spread into
 * MASTER_CAREER_INTELLIGENCE by ensureCareerIntelligenceLoaded().
 *
 * Merge order is intentional — later modules override earlier ones for
 * duplicate keys (e.g. SERVICES_LEGAL overrides leg_* from SERVICES).
 */
export const ASSEMBLED_CORPUS: Record<string, CareerIntelligence> = {
  ...TECH_INTELLIGENCE,
  ...FINANCE_INTELLIGENCE,
  ...SERVICES_INTELLIGENCE,
  ...SERVICES_LEGAL_INTELLIGENCE,
  ...SERVICES_HR_INTELLIGENCE,
  ...HEALTHCARE_INTELLIGENCE,
  ...INDUSTRY_INTELLIGENCE,
  ...CREATIVE_INTELLIGENCE,
  ...EMERGING_INTELLIGENCE,
  ...SERVICES_GOV_INTELLIGENCE,
  ...SERVICES_EDU_INTELLIGENCE,
  ...SERVICES_RETAIL_INTELLIGENCE,
  ...SERVICES_TRAVEL_INTELLIGENCE,
  ...SERVICES_MEDIA_INTELLIGENCE,
};

// Dev-only duplicate-key guard — moved here from index.ts where it ran at
// module load time (wrong: the corpus wasn't yet assembled). Now runs once
// when the corpus chunk is first loaded.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  const allModules: Array<[string, Record<string, CareerIntelligence>]> = [
    ['TECH',             TECH_INTELLIGENCE],
    ['FINANCE',          FINANCE_INTELLIGENCE],
    ['SERVICES',         SERVICES_INTELLIGENCE],
    ['SERVICES_LEGAL',   SERVICES_LEGAL_INTELLIGENCE],
    ['SERVICES_HR',      SERVICES_HR_INTELLIGENCE],
    ['HEALTHCARE',       HEALTHCARE_INTELLIGENCE],
    ['INDUSTRY',         INDUSTRY_INTELLIGENCE],
    ['CREATIVE',         CREATIVE_INTELLIGENCE],
    ['EMERGING',         EMERGING_INTELLIGENCE],
    ['SERVICES_GOV',     SERVICES_GOV_INTELLIGENCE],
    ['SERVICES_EDU',     SERVICES_EDU_INTELLIGENCE],
    ['SERVICES_RETAIL',  SERVICES_RETAIL_INTELLIGENCE],
    ['SERVICES_TRAVEL',  SERVICES_TRAVEL_INTELLIGENCE],
    ['SERVICES_MEDIA',   SERVICES_MEDIA_INTELLIGENCE],
  ];
  const INTENTIONAL_OVERRIDES = new Set([
    'ser_legal_ops', 'gov_defender', 'gov_tax_auditor',
    'gov_policy_analyst', 'gov_diplomat', 'gov_social_worker',
  ]);
  const seen = new Map<string, string>();
  for (const [modName, mod] of allModules) {
    for (const key of Object.keys(mod)) {
      if (seen.has(key) && !INTENTIONAL_OVERRIDES.has(key)) {
        const prefix = key.split('_')[0];
        const isExpectedOverride =
          (modName === 'SERVICES_LEGAL' && prefix === 'leg') ||
          (modName === 'SERVICES_HR'    && prefix === 'hr');
        if (!isExpectedOverride) {
          console.warn(
            `[MASTER_CAREER_INTELLIGENCE] Duplicate key "${key}" in ${modName} overrides ${seen.get(key)}. ` +
            `If intentional, add to INTENTIONAL_OVERRIDES.`,
          );
        }
      } else {
        seen.set(key, modName);
      }
    }
  }
}
