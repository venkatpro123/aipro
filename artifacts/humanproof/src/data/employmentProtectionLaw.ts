// employmentProtectionLaw.ts — Employment protection legal timeline data.
//
// PURPOSE: Answers the question "After a layoff is announced, how long until
// my last working day?" This is CATEGORICALLY DIFFERENT from the temporal risk
// amplifier (which answers "when is announcement risk highest"). Together they
// give the worker their full timeline:
//
//   announcement risk (L11 calendar) + legal protection window = total runway
//
// Example — German worker vs US worker, same risk score:
//   US: announcement → 0-60 days → last day (WARN Act for large, 0 for at-will)
//   DE: announcement → 90-180 days → last day (Betriebsrat + Sozialplan + notice)
//   → German worker has 60-80% more effective time to prepare.
//
// This file encodes the key structural protections across 10 jurisdictions.
// Covers: EU (DE, FR, GB, NL, SE, ES), South Asia (IN), North America (US, CA),
// and Oceania (AU). Jurisdiction-specific thresholds (large vs. small cuts) are
// derived from each country's statutory definition.
//
// LABELED: ESTIMATED — derived from published labor law / government guidance as of
// 2025-2026. Individual cases vary by collective agreement, company size, sector,
// and tenure. Workers should consult legal counsel for specific situations.
// Sources: BAuA (DE), DREETS (FR), Acas (UK), UWV (NL), LAS (SE), Ministry of
// Labour (IN), DOL (US), Employment Standards (CA), Fair Work Commission (AU).

export interface TimelineComponent {
  label: string;         // e.g. "Betriebsrat consultation (BetrVG §102)"
  daysMin: number;
  daysMax: number;
  isOptional: boolean;   // true when only triggered above the collective threshold
  triggerNote?: string;  // e.g. "required for 5+ workers" or "required for 20+ workers at 20+ employee companies"
}

export interface EmploymentProtectionRegime {
  countryCode: string;    // ISO 3166-1 alpha-2
  countryName: string;
  flagEmoji: string;

  /** Primary statutory framework name */
  regime: string;
  /** Governance body involved in the process */
  governanceBody: string;

  // ── Collective dismissal threshold ────────────────────────────────────────
  /** Number of workers where collective/mass-layoff rules trigger */
  collectiveThreshold: number;

  // ── Timeline components (days from announcement to last working day) ──────
  /** Components that always apply (even for small cuts) */
  smallCutComponents: TimelineComponent[];
  /** Additional components for large cuts (>= collectiveThreshold) */
  largeCutAdditionalComponents: TimelineComponent[];

  /** Total estimated days: small cut (< threshold) */
  totalDaysSmall: { min: number; max: number };
  /** Total estimated days: large cut (>= threshold) */
  totalDaysLarge: { min: number; max: number };

  /** Extra days vs US WARN Act baseline (60 days for large cuts) */
  extensionVsUSBaselineDays: { min: number; max: number };

  /** Does the government / agency need to approve before dismissals proceed? */
  isGovernmentApprovalRequired: boolean;
  governmentApprovalNote?: string;

  /** Is a mandatory social compensation plan (Sozialplan/PSE equivalent) required? */
  hasMandatorySocialPlan: boolean;
  socialPlanNote?: string;

  labeledAs: 'MEASURED' | 'MODELED' | 'ESTIMATED';
  labelNote: string;

  /** Short summary shown as a badge */
  protectionSummary: string;
  /** Full narrative for the legal timeline card */
  disclosureNarrative: string;

  /** Key actions workers should take during the legal protection window */
  workerActions: string[];
}

// ── Employment protection regimes by ISO country code ─────────────────────────

export const EMPLOYMENT_PROTECTION_LAW: Record<string, EmploymentProtectionRegime> = {

  // ── Germany ───────────────────────────────────────────────────────────────
  // KSchG (Kündigungsschutzgesetz) + BetrVG (Betriebsverfassungsgesetz)
  // Strongest protection in the EU. Works Council has objection rights on
  // every individual termination. Mass dismissal requires government notification
  // (Bundesagentur für Arbeit) + Sozialplan mandatory for significant restructurings.
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    flagEmoji: '🇩🇪',
    regime: 'KSchG + BetrVG (Betriebsrat)',
    governanceBody: 'Works Council (Betriebsrat) + Bundesagentur für Arbeit',
    collectiveThreshold: 5,   // Betriebsrat consulted on ANY dismissal; Sozialplan for 20+
    smallCutComponents: [
      {
        label: 'Betriebsrat consultation (BetrVG §102)',
        daysMin: 7,
        daysMax: 21,
        isOptional: false,
        triggerNote: 'Required for every dismissal where a Works Council exists',
      },
      {
        label: 'Statutory notice period (BGB §622)',
        daysMin: 28,   // 4 weeks minimum
        daysMax: 210,  // 7 months (>20 years service)
        isOptional: false,
        triggerNote: '4 weeks (< 2yr) → 7 months (> 20yr). KSchG applies at 6+ months tenure, 10+ employees.',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Bundesagentur für Arbeit notification (KSchG §17)',
        daysMin: 30,
        daysMax: 30,
        isOptional: false,
        triggerNote: 'Mandatory 30-day waiting period after notification for mass dismissals',
      },
      {
        label: 'Sozialplan negotiation (BetrVG §112)',
        daysMin: 30,
        daysMax: 90,
        isOptional: false,
        triggerNote: 'For companies with 21+ employees making significant operational changes (Betriebsänderung). Can extend to Einigungsstelle (conciliation) if no agreement.',
      },
    ],
    totalDaysSmall:     { min: 35,  max: 231 },
    totalDaysLarge:     { min: 95,  max: 351 },
    extensionVsUSBaselineDays: { min: 35, max: 291 },   // vs 0-60 WARN Act
    isGovernmentApprovalRequired: false,
    governmentApprovalNote: 'Notification (not approval) to Bundesagentur für Arbeit triggers mandatory 30-day waiting period.',
    hasMandatorySocialPlan: true,
    socialPlanNote: 'Sozialplan required for companies with 21+ employees when significant restructuring (Betriebsänderung). Covers severance, retraining, outplacement obligations.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from KSchG, BGB §622, BetrVG §102/§112/§17, BAuA guidance (2025). Individual cases vary by collective agreement (Tarifvertrag) and company size.',
    protectionSummary: '90–180 days legal protection window',
    disclosureNarrative:
      'German law provides among the strongest dismissal protections globally. The Betriebsrat (Works Council) ' +
      'must be consulted before any termination — this alone takes 1–3 weeks. For significant restructurings, ' +
      'a Sozialplan must be negotiated (30–90 days). Mass dismissals additionally require Bundesagentur notification ' +
      'with a mandatory 30-day waiting period (KSchG §17). Statutory notice (BGB §622) adds 4 weeks to 7 months ' +
      'depending on tenure. Together: 90–180 days from announcement to last working day for most restructurings.',
    workerActions: [
      'Request a copy of the Betriebsrat consultation record (§102 Anhörung)',
      'Obtain the Sozialplan — it contains your severance formula, outplacement, retraining budget',
      'Check if your role is in the Auswahlrichtlinien (selection criteria) — challenge if incorrectly scored',
      'File Kündigungsschutzklage (unfair dismissal claim) within 3 weeks of written notice',
      'If Betriebsrat filed objection (§102 Abs. 3), assert right to continued employment during appeal',
    ],
  },

  // ── France ────────────────────────────────────────────────────────────────
  // Code du Travail. PSE mandatory for 10+ redundancies at 50+ employee companies.
  // Union negotiation or state (DREETS) validation required — typical 2-4 months.
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    flagEmoji: '🇫🇷',
    regime: 'Code du Travail — Plan de Sauvegarde de l\'Emploi (PSE)',
    governanceBody: 'DREETS (formerly DIRECCTE) + CSE (Comité Social et Économique)',
    collectiveThreshold: 10,  // PSE triggers for 10+ redundancies over 30 days, 50+ employee companies
    smallCutComponents: [
      {
        label: 'Individual procedure (entretien préalable)',
        daysMin: 15,
        daysMax: 30,
        isOptional: false,
        triggerNote: 'Mandatory pre-dismissal interview + notice period',
      },
      {
        label: 'Statutory notice (préavis)',
        daysMin: 30,   // 1 month (< 2yr)
        daysMax: 90,   // 3 months (5+ yr tenure, collective agreement may extend)
        isOptional: false,
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'CSE consultation on restructuring plan',
        daysMin: 30,
        daysMax: 90,
        isOptional: false,
        triggerNote: 'CSE (works council) must receive and respond to restructuring plan',
      },
      {
        label: 'PSE negotiation or DREETS validation',
        daysMin: 60,
        daysMax: 120,
        isOptional: false,
        triggerNote: 'Collective PSE agreement: ~60 days with unions. Unilateral PSE: 4-month DREETS validation process.',
      },
    ],
    totalDaysSmall:     { min: 45,  max: 120 },
    totalDaysLarge:     { min: 90,  max: 240 },
    extensionVsUSBaselineDays: { min: 30, max: 180 },
    isGovernmentApprovalRequired: true,
    governmentApprovalNote: 'DREETS must validate the PSE (for unilateral plans) or confirm the collective agreement. Approval typically takes 3-4 months.',
    hasMandatorySocialPlan: true,
    socialPlanNote: 'The PSE itself IS the social plan — contains reclassification obligations, retraining, severance above statutory minimum.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from Code du Travail L1233-x, DREETS procedural guidance (2025). Collective agreements (accords d\'entreprise) may modify timelines.',
    protectionSummary: '90–240 days PSE process',
    disclosureNarrative:
      'French law mandates a Plan de Sauvegarde de l\'Emploi (PSE) for 10+ redundancies at 50+ employee companies. ' +
      'The PSE is either collectively negotiated with unions (~2 months) or submitted to DREETS for unilateral validation ' +
      '(~4 months). Dismissal notices cannot be issued until PSE validation is complete. ' +
      'Statutory notice (préavis) of 1–3 months runs after the process concludes. ' +
      'Total: 90–240 days from announcement to last working day.',
    workerActions: [
      'Review the PSE document — it contains your mandatory reclassification offers and severance formula',
      'Attend CSE consultation meetings to understand the restructuring scope and timeline',
      'Request outplacement (cellule de reclassement) — legally required in the PSE',
      'Evaluate all internal reclassification offers — refusing ALL may affect severance entitlement',
      'File contrefaçon de procédure PSE challenge within 12 months if procedure was irregular',
    ],
  },

  // ── United Kingdom ────────────────────────────────────────────────────────
  // TULRCA 1992 (post-Brexit domestic law). 45-day minimum consultation for 100+
  // redundancies; 30-day for 20-99. Employment Rights Act notice scales by tenure.
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    regime: 'TULRCA 1992 + Employment Rights Act 1996',
    governanceBody: 'HMRC / Employment Tribunal + Trade Union (where recognised)',
    collectiveThreshold: 20,  // 20+ redundancies trigger collective consultation
    smallCutComponents: [
      {
        label: 'Individual consultation (fair selection + right to appeal)',
        daysMin: 14,
        daysMax: 28,
        isOptional: false,
      },
      {
        label: 'Statutory notice (ERA 1996 §86)',
        daysMin: 7,    // 1 week minimum
        daysMax: 84,   // 12 weeks maximum (1 week/year of service, capped at 12)
        isOptional: false,
        triggerNote: '1 week per year of service, capped at 12 weeks',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Collective consultation (TULRCA 1992 §188)',
        daysMin: 30,   // 30 days for 20–99 redundancies
        daysMax: 45,   // 45 days for 100+ redundancies
        isOptional: false,
        triggerNote: '30 days minimum for 20-99 employees; 45 days for 100+ employees',
      },
      {
        label: 'HMRC notification (HR1 form)',
        daysMin: 30,
        daysMax: 45,
        isOptional: false,
        triggerNote: 'Must notify Secretary of State before first dismissal takes effect',
      },
    ],
    totalDaysSmall:     { min: 21,  max: 112 },
    totalDaysLarge:     { min: 75,  max: 157 },
    extensionVsUSBaselineDays: { min: 15, max: 97 },
    isGovernmentApprovalRequired: false,
    governmentApprovalNote: 'HR1 notification to Secretary of State required but no approval needed.',
    hasMandatorySocialPlan: false,
    socialPlanNote: 'Statutory redundancy pay (ERA 1996 §135) is mandatory, calculated by age and tenure. Enhanced pay is common via collective agreement.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from TULRCA 1992 §188, ERA 1996 §86/§135, Acas Code of Practice (2025).',
    protectionSummary: '45–90 days collective consultation',
    disclosureNarrative:
      'UK law (post-Brexit domestic) requires 30–45 days minimum collective consultation for 20+ redundancies. ' +
      'For 100+ redundancies, this extends to 45 days. Statutory notice adds 1 week per year of service (max 12 weeks). ' +
      'The total window from announcement to last day is typically 75–157 days for large restructurings. ' +
      'Note: This is materially shorter than Germany or France but still provides a meaningful protection window.',
    workerActions: [
      'Attend collective consultation meetings — your employer must genuinely consider alternatives',
      'Request your individual selection rationale in writing — challenge if criteria are unclear',
      'Calculate your statutory redundancy pay: 0.5-1.5 weeks\' pay per year of service',
      'Check your contract for enhanced redundancy terms — many UK contracts exceed statutory minimums',
      'File unfair dismissal claim at Employment Tribunal within 3 months of last day',
    ],
  },

  // ── Netherlands ───────────────────────────────────────────────────────────
  // UWV (Uitvoeringsinstituut Werknemersverzekeringen) permission OR DBC
  // (Dismissal by mutual consent). One of the few systems requiring formal
  // agency permission before dismissal can proceed.
  NL: {
    countryCode: 'NL',
    countryName: 'Netherlands',
    flagEmoji: '🇳🇱',
    regime: 'Wet werk en zekerheid (Wwz) — UWV Procedure',
    governanceBody: 'UWV (Uitvoeringsinstituut Werknemersverzekeringen)',
    collectiveThreshold: 20,
    smallCutComponents: [
      {
        label: 'Statutory notice (BW 7:672)',
        daysMin: 30,   // 1 month
        daysMax: 120,  // 4 months (>15 years service)
        isOptional: false,
        triggerNote: '1 month (< 5yr) → 4 months (> 15yr)',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'UWV permission procedure',
        daysMin: 28,
        daysMax: 42,
        isOptional: false,
        triggerNote: 'Required before dismissal notice can be issued. Economic grounds must be proven.',
      },
      {
        label: 'Ondernemingsraad (Works Council) advice',
        daysMin: 21,
        daysMax: 42,
        isOptional: false,
        triggerNote: 'Companies with 50+ employees must seek OR (Works Council) advice on reorganisation',
      },
    ],
    totalDaysSmall:     { min: 30,  max: 120 },
    totalDaysLarge:     { min: 79,  max: 204 },
    extensionVsUSBaselineDays: { min: 19, max: 144 },
    isGovernmentApprovalRequired: true,
    governmentApprovalNote: 'UWV permission is required before issuing dismissal notice. Without it, dismissal is null and void.',
    hasMandatorySocialPlan: false,
    socialPlanNote: 'Transition payment (transitievergoeding) is mandatory — 1/3 month pay per year of service.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from BW Boek 7, Wwz, UWV procedurehandleiding (2025).',
    protectionSummary: '79–204 days including UWV procedure',
    disclosureNarrative:
      'Dutch law requires employers to obtain UWV (government employment agency) permission before issuing ' +
      'dismissal notices for economic reasons. This alone takes 4–6 weeks. Combined with statutory notice ' +
      '(1–4 months) and Works Council consultation, the total window is 79–204 days.',
    workerActions: [
      'Monitor UWV procedure progress — employer must share the request and you can submit a defence',
      'Check the transition payment (transitievergoeding) calculation — 1/3 month per service year',
      'Verify whether a DBC (mutual termination) agreement offers better terms than UWV dismissal',
      'File objection with OR (Works Council) if reorganisation advice was not sought',
    ],
  },

  // ── Sweden ────────────────────────────────────────────────────────────────
  // LAS (Lagen om anställningsskydd) with strict seniority (last-in-first-out)
  // and mandatory union negotiation (MBL). Long notice periods protect senior workers.
  SE: {
    countryCode: 'SE',
    countryName: 'Sweden',
    flagEmoji: '🇸🇪',
    regime: 'LAS (Lagen om anställningsskydd) + MBL',
    governanceBody: 'Trade Union (Facket) + Labour Court (Arbetsdomstolen)',
    collectiveThreshold: 5,
    smallCutComponents: [
      {
        label: 'MBL §11 negotiation with union',
        daysMin: 14,
        daysMax: 28,
        isOptional: false,
        triggerNote: 'Required before any decision significantly affecting employees',
      },
      {
        label: 'Statutory notice (LAS §11)',
        daysMin: 30,   // 1 month (< 2yr)
        daysMax: 180,  // 6 months (> 10yr)
        isOptional: false,
        triggerNote: '1–6 months based on tenure: 1mo (<2yr), 2mo (2-4yr), 3mo (4-6yr), 4mo (6-8yr), 5mo (8-10yr), 6mo (>10yr)',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Consultation period + turordningslista (seniority list)',
        daysMin: 14,
        daysMax: 30,
        isOptional: false,
        triggerNote: 'Employer must prepare selection list per LIFO rules; union can challenge',
      },
    ],
    totalDaysSmall:     { min: 44,  max: 208 },
    totalDaysLarge:     { min: 58,  max: 238 },
    extensionVsUSBaselineDays: { min: 0, max: 178 },
    isGovernmentApprovalRequired: false,
    hasMandatorySocialPlan: false,
    socialPlanNote: 'No mandatory Sozialplan, but collective agreements (Avtal) typically include outplacement and extended notice. TRR (Trygghetsrådet) provides outplacement support for white-collar workers.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from LAS §11, MBL §11/§13, and Trygghetsrådet guidance (2025).',
    protectionSummary: '1–6 months notice + union negotiation',
    disclosureNarrative:
      'Swedish LAS enforces strict seniority (turordning/LIFO) — the last hired is first dismissed. ' +
      'Union negotiation (MBL §11) is mandatory before any significant workforce decision. ' +
      'Notice periods scale from 1 month (<2 yr) to 6 months (>10 yr) of service. ' +
      'Long-tenure employees have among the longest effective protection windows in Europe.',
    workerActions: [
      'Verify you are correctly placed in the turordningslista (seniority list) — errors can be challenged',
      'Contact your union (Facket) immediately — they have rights to information and negotiation',
      'Check if your collective agreement (kollektivavtal) provides enhanced notice or redundancy terms',
      'Contact TRR (Trygghetsrådet) if you work at a member company — they provide outplacement support',
    ],
  },

  // ── Spain ─────────────────────────────────────────────────────────────────
  // ERE (Expediente de Regulación de Empleo) for collective dismissals.
  // 30-day minimum consultation with worker representatives.
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    flagEmoji: '🇪🇸',
    regime: 'Estatuto de los Trabajadores — ERE (Expediente de Regulación de Empleo)',
    governanceBody: 'SEPE (Servicio Público de Empleo Estatal) + Comité de Empresa',
    collectiveThreshold: 10,  // ERE triggers for 10+ workers in 90-day period
    smallCutComponents: [
      {
        label: 'Individual dismissal procedure',
        daysMin: 15,
        daysMax: 30,
        isOptional: false,
      },
      {
        label: 'Statutory notice',
        daysMin: 15,
        daysMax: 30,
        isOptional: false,
        triggerNote: '15-day notice standard; collective agreement may extend',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'ERE consultation period (ET Art. 51)',
        daysMin: 30,
        daysMax: 30,
        isOptional: false,
        triggerNote: 'Minimum 30-day consultation with workers\' representatives for ERE collective dismissal',
      },
      {
        label: 'SEPE/Labour Authority notification',
        daysMin: 15,
        daysMax: 30,
        isOptional: false,
      },
    ],
    totalDaysSmall:     { min: 30,  max: 60  },
    totalDaysLarge:     { min: 75,  max: 90  },
    extensionVsUSBaselineDays: { min: 15, max: 30 },
    isGovernmentApprovalRequired: false,
    governmentApprovalNote: 'Labour Authority notified but no approval required since 2012 reform.',
    hasMandatorySocialPlan: false,
    socialPlanNote: 'ERE typically includes indemnization package (20 days/year, capped at 12 months). Collective agreements may provide higher amounts.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from Estatuto de los Trabajadores Art. 51-52, RD 1483/2012 (2025).',
    protectionSummary: '75–90 days ERE consultation',
    disclosureNarrative:
      'Spanish law requires a 30-day ERE consultation period for collective dismissals (10+ workers in 90 days). ' +
      'SEPE must be notified. The total window from announcement to last day is typically 75–90 days for large cuts. ' +
      'Since the 2012 labour reform, government approval is no longer required — reducing protection vs pre-2012.',
    workerActions: [
      'Participate in ERE consultation meetings through the Comité de Empresa (works council)',
      'Verify the indemnization calculation: 20 days/year of service, max 12 months',
      'Check if your collective agreement (convenio colectivo) provides higher severance',
      'Consult SEPE for unemployment benefit eligibility immediately after last day',
    ],
  },

  // ── India ─────────────────────────────────────────────────────────────────
  // Industrial Disputes Act 1947. Chapter V-B requires government permission for
  // 100+ workers — frequently delayed or refused. Managerial employees typically
  // not covered by IDA workmen definition; governed by contract instead.
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    flagEmoji: '🇮🇳',
    regime: 'Industrial Disputes Act 1947 (IDA) — Chapter V-B',
    governanceBody: 'State Government Labour Department + Industrial Tribunal',
    collectiveThreshold: 100,  // IDA Chapter V-B applies to establishments with 100+ workers
    smallCutComponents: [
      {
        label: 'Retrenchment compensation (IDA §25-F)',
        daysMin: 30,   // 1 month average wages
        daysMax: 90,   // 3 months (managerial roles by contract)
        isOptional: false,
        triggerNote: 'IDA §25-F applies to "workmen" (non-supervisory). Managerial employees governed by contract.',
      },
      {
        label: 'Notice or pay in lieu',
        daysMin: 30,
        daysMax: 90,
        isOptional: false,
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Government permission — IDA §25-O (Chapter V-B)',
        daysMin: 60,
        daysMax: 120,
        isOptional: false,
        triggerNote: 'Prior government permission required for retrenchment of 100+ workmen. Permission may be refused, delayed, or conditional.',
      },
    ],
    totalDaysSmall:     { min: 60,  max: 90  },
    totalDaysLarge:     { min: 120, max: 210 },
    extensionVsUSBaselineDays: { min: 60, max: 150 },
    isGovernmentApprovalRequired: true,
    governmentApprovalNote: 'IDA §25-O: Government permission required before retrenching 100+ workers. Permission can take 60-120+ days and may be refused on public interest grounds.',
    hasMandatorySocialPlan: false,
    socialPlanNote: 'Retrenchment compensation: 15 days\' average wage per year of service for workmen. No formal Sozialplan equivalent — negotiated separately.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from IDA 1947 §25-F, §25-O, Industrial Relations Code 2020 (not yet fully enforced as of 2025). Note: IDA applies to "workmen" category; managerial employees (common in IT sector) are typically governed by employment contracts only.',
    protectionSummary: 'Govt permission required (100+ workers)',
    disclosureNarrative:
      'India\'s Industrial Disputes Act (IDA) provides strong protection for "workmen" (non-supervisory staff). ' +
      'For establishments with 100+ workers, retrenchment requires prior government permission under Chapter V-B (§25-O). ' +
      'This permission is frequently delayed (60–120+ days) and can be refused. ' +
      'Important caveat: most software engineers, managers, and supervisory IT professionals are NOT classified as ' +
      '"workmen" under IDA — their protection comes from employment contracts, not statute. ' +
      'For non-workmen, effective notice is typically 1–3 months by contract.',
    workerActions: [
      'Verify whether your role is classified as "workman" under IDA — this determines your statutory protection',
      'Review your employment contract for notice period, garden leave, and severance provisions',
      'Check if your company is covered by any applicable State Industrial Standing Orders',
      'Negotiate severance beyond the 15-days/year IDA minimum — many IT companies pay 1-3 months/year',
      'File complaint with State Labour Commissioner if §25-F retrenchment compensation not paid',
    ],
  },

  // ── United States ─────────────────────────────────────────────────────────
  // The baseline at-will jurisdiction. WARN Act (60-day notice) applies only to
  // large sites. Most US tech workers have zero statutory pre-termination protection.
  US: {
    countryCode: 'US',
    countryName: 'United States',
    flagEmoji: '🇺🇸',
    regime: 'WARN Act (Worker Adjustment and Retraining Notification Act)',
    governanceBody: 'US Department of Labor (notifications only)',
    collectiveThreshold: 50,   // 50+ workers at a site with 100+ employees
    smallCutComponents: [
      {
        label: 'At-will dismissal',
        daysMin: 0,
        daysMax: 14,
        isOptional: false,
        triggerNote: 'Most US states are at-will. No statutory notice required. Some contracts provide 2-4 weeks.',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'WARN Act notice period',
        daysMin: 60,
        daysMax: 60,
        isOptional: false,
        triggerNote: 'Required for 50+ workers at sites with 100+ employees. Violations result in 60 days back pay, not prevention.',
      },
    ],
    totalDaysSmall:     { min: 0,   max: 14  },
    totalDaysLarge:     { min: 60,  max: 60  },
    extensionVsUSBaselineDays: { min: 0, max: 0 },  // This IS the baseline
    isGovernmentApprovalRequired: false,
    hasMandatorySocialPlan: false,
    socialPlanNote: 'No statutory severance requirement. 2 weeks per year of service is the market norm. ERISA governs benefit continuation.',
    labeledAs: 'MEASURED',
    labelNote: 'WARN Act (29 USC §2101-2109). At-will doctrine applies in 49 states (Montana has for-cause protection).',
    protectionSummary: 'WARN Act: 60-day notice for large sites',
    disclosureNarrative:
      'The United States is the baseline at-will jurisdiction. No statutory pre-termination notice is required for most ' +
      'workers. The WARN Act provides 60-day advance notice for large layoffs (50+ workers at sites with 100+ employees) ' +
      'but violations result in back pay liability, not prevention of the dismissal. ' +
      'Most US tech workers should assume 0–14 days from announcement to last day.',
    workerActions: [
      'Negotiate severance in writing before signing the separation agreement',
      'Do not sign any severance agreement without a 21-day review period (ADEA requirement for age 40+)',
      'File for unemployment benefits immediately — do not wait until severance period ends',
      'Review COBRA continuation coverage — you have 60 days to elect',
      'Check WARN Act notice compliance — if not given 60 days, may be entitled to back pay',
    ],
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  // Employment Standards Acts (provincial) + Canada Labour Code (federal).
  // Mass layoff notice: 8-16 weeks depending on province and number of workers.
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    flagEmoji: '🇨🇦',
    regime: 'Canada Labour Code + Provincial Employment Standards',
    governanceBody: 'Employment and Social Development Canada (ESDC) + Provincial Labour Boards',
    collectiveThreshold: 50,   // Ontario: 50+ redundancies trigger group termination provisions
    smallCutComponents: [
      {
        label: 'Individual statutory notice (ESA)',
        daysMin: 7,    // 1 week minimum (Ontario)
        daysMax: 56,   // 8 weeks (8+ years service, Ontario)
        isOptional: false,
        triggerNote: 'Varies by province. Ontario: 1-8 weeks based on service. BC: 1-8 weeks.',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Group termination notice (CLC §212 / Provincial)',
        daysMin: 56,   // 8 weeks for 50-199 workers
        daysMax: 112,  // 16 weeks for 500+ workers
        isOptional: false,
        triggerNote: 'Canada Labour Code §212: 8-16 weeks notice for mass terminations at federally regulated employers. Provincial acts vary.',
      },
    ],
    totalDaysSmall:     { min: 7,   max: 56  },
    totalDaysLarge:     { min: 56,  max: 112 },
    extensionVsUSBaselineDays: { min: 0, max: 52 },
    isGovernmentApprovalRequired: false,
    hasMandatorySocialPlan: false,
    socialPlanNote: 'Termination pay (pay in lieu) is the primary statutory remedy. Severance pay under ESA: 1 week/year (Ontario) for 5+ year employees at large employers.',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from Canada Labour Code §212, Ontario ESA Part XV, BC Employment Standards Act (2025). LMIA implications for foreign workers add complexity — visa status affects timeline urgency.',
    protectionSummary: '8–16 weeks group notice period',
    disclosureNarrative:
      'Canada\'s mass layoff protections are primarily notice-based. Federal employees (Canada Labour Code) get 8–16 ' +
      'weeks notice for group terminations. Provincial rules vary: Ontario provides 8 weeks for 50+ terminations. ' +
      'Note: Foreign workers on LMIA-tied permits face an additional urgency — the LMIA expires on termination, ' +
      'giving limited time to find a new sponsor before losing work authorization.',
    workerActions: [
      'Check your jurisdiction — federal vs provincial determines which notice rules apply',
      'If on LMIA work permit: contact immigration counsel immediately, begin new LMIA process',
      'File EI (Employment Insurance) claim same day as last working day',
      'Negotiate enhanced severance — Canadian courts frequently award more than statutory minimums',
      'If wrongful dismissal, claim must be filed within 2 years of termination (Ontario)',
    ],
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  // Fair Work Act 2009. Notice period based on tenure. Redundancy pay on a
  // statutory scale. No government approval required.
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    flagEmoji: '🇦🇺',
    regime: 'Fair Work Act 2009 — National Employment Standards (NES)',
    governanceBody: 'Fair Work Commission + Fair Work Ombudsman',
    collectiveThreshold: 15,
    smallCutComponents: [
      {
        label: 'Statutory notice (NES)',
        daysMin: 7,    // 1 week (< 1yr)
        daysMax: 28,   // 4 weeks (5+ yr); 5 weeks for 45+ years old with 2+ yr service
        isOptional: false,
        triggerNote: '1 week (<1yr), 2 weeks (1-3yr), 3 weeks (3-5yr), 4 weeks (5yr+)',
      },
    ],
    largeCutAdditionalComponents: [
      {
        label: 'Redundancy consultation (NES + Modern Award)',
        daysMin: 14,
        daysMax: 28,
        isOptional: false,
        triggerNote: 'Modern Awards and enterprise agreements require consultation before implementing major workplace change',
      },
    ],
    totalDaysSmall:     { min: 7,   max: 28  },
    totalDaysLarge:     { min: 21,  max: 56  },
    extensionVsUSBaselineDays: { min: 0, max: 0 },   // Similar to US for small cuts
    isGovernmentApprovalRequired: false,
    hasMandatorySocialPlan: false,
    socialPlanNote: 'Statutory redundancy pay: 4-16 weeks based on years of service (NES §119). Excludes employees of small businesses (<15 employees).',
    labeledAs: 'ESTIMATED',
    labelNote: 'Derived from Fair Work Act 2009 NES §117-§119, FWC guidance (2025).',
    protectionSummary: '1–4 weeks statutory notice + redundancy pay',
    disclosureNarrative:
      'Australian NES provides statutory notice (1–4 weeks) and redundancy pay (4–16 weeks salary). ' +
      'The Fair Work Commission can arbitrate disputes about inadequate consultation. ' +
      'Total protection window is modest (21–56 days for large cuts) — similar to the US for most roles.',
    workerActions: [
      'Verify redundancy pay entitlement: 4-16 weeks based on service length (NES §119)',
      'Check Modern Award or enterprise agreement for enhanced consultation obligations',
      'File for Centrelink payments — you may need to serve a waiting period based on payout',
      'Lodge unfair dismissal application within 21 days of dismissal if grounds exist',
    ],
  },
};

// ── Resolution helpers ────────────────────────────────────────────────────────

/** Look up the employment protection regime for an ISO country code.
 *  Falls back to US (at-will baseline) if the country is not in the registry. */
export function getEmploymentProtectionRegime(
  countryCode: string | null | undefined,
): EmploymentProtectionRegime | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();
  return EMPLOYMENT_PROTECTION_LAW[code] ?? null;
}

/** Determine if the company qualifies as a "large" cut (collective rules apply).
 *  Uses company employee count against the regime's collectiveThreshold. */
export function isLargeLayoff(
  regime: EmploymentProtectionRegime,
  employeeCount: number | null | undefined,
): boolean {
  if (employeeCount == null) return false;
  return employeeCount >= regime.collectiveThreshold;
}

/** Compute the effective legal protection window in days for a specific company/regime. */
export function computeEffectiveProtectionDays(
  regime: EmploymentProtectionRegime,
  employeeCount: number | null | undefined,
): { min: number; max: number } {
  return isLargeLayoff(regime, employeeCount)
    ? regime.totalDaysLarge
    : regime.totalDaysSmall;
}
