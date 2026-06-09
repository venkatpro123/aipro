// ProfileSetupModal.tsx — v21.0
// 3-step wizard: Core → Financial → Situation & Skills.
//
// v21.0 fixes:
//   — Shows too many times: sessionStorage 'hp_profile_skip' dismissed flag.
//     After "Skip" or "Remind me later" the modal won't re-open in the same
//     session. Explicit hp.profile.open events still override this flag so
//     panels that say "Add equity vest → click here" always work.
//   — Data not storing: handleSubmit now checks the return value from
//     saveUserProfile. Authenticated users see an inline error if the DB write
//     fails; the modal stays open so they can retry. Unauthenticated users get
//     an optimistic in-memory save (handled in HumanProofContext) and the modal
//     closes normally.
//   — Monthly expenses currency: label now reads localCurrencyCode, not USD.
//   — 4→3 steps: Situation (3 checkboxes) merged into Skills step — less friction.
//   — Skip available on every step, not just step 0.
//   — Always-visible × close button so users can exit without being stuck.

import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHumanProof } from '../context/HumanProofContext';
import { useAuth } from '../context/AuthContext';
import { shouldRepromptProfile } from '../services/userProfileService';
import type { SalaryBand, VisaStatus, UniquenessKnowledgeType, UserProfile } from '../services/userProfileService';
import { inferCurrencyFromContext, convertToUsd, localToUsdLabel, CURRENCY_META } from '../services/currencyService';

// ── Constants ─────────────────────────────────────────────────────────────────

const DISMISS_KEY = 'hp_profile_skip';

const SALARY_BANDS: SalaryBand[] = ['<50k', '50-100k', '100-150k', '150-250k', '250k+'];

const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'technology',             label: 'Technology / Software' },
  { value: 'finance',                label: 'Finance / Banking / Fintech' },
  { value: 'healthcare',             label: 'Healthcare / Life Sciences' },
  { value: 'retail',                 label: 'Retail / E-commerce' },
  { value: 'media',                  label: 'Media / Entertainment' },
  { value: 'manufacturing',          label: 'Manufacturing / Industrial' },
  { value: 'consulting',             label: 'Consulting / Professional Services' },
  { value: 'education',              label: 'Education / EdTech' },
  { value: 'energy',                 label: 'Energy / Utilities' },
  { value: 'telecom',                label: 'Telecom / Infrastructure' },
];

const VISA_OPTIONS: Array<{ value: VisaStatus; label: string }> = [
  { value: 'citizen',               label: 'Citizen / National' },
  { value: 'permanent_resident',    label: 'Permanent resident / ILR / Green card' },
  { value: 'h1b',                   label: 'H1B (US)' },
  { value: 'l1',                    label: 'L1 (US — intracompany transfer)' },
  { value: 'opt_stem',              label: 'OPT / OPT STEM (US)' },
  { value: 'tn',                    label: 'TN (US/Canada — CUSMA/NAFTA)' },
  { value: 'uk_skilled_worker',     label: 'UK Skilled Worker visa' },
  { value: 'eu_blue_card_germany',  label: 'EU Blue Card — Germany (§20 AufenthG)' },
  { value: 'eu_blue_card',          label: 'EU Blue Card — France / Netherlands / other EU' },
  { value: 'singapore_ep',          label: 'Singapore Employment Pass (EP)' },
  { value: 'singapore_s_pass',      label: 'Singapore S Pass' },
  { value: 'australia_482_tss',     label: 'Australia 482 TSS' },
  { value: 'philippines_9g_aep',    label: 'Philippines 9G (Alien Employment Permit)' },
  { value: 'japan_work_visa',       label: 'Japan Work Visa (Engineer / Specialist / HSP)' },
  { value: 'canada_lmia_permit',    label: 'Canada LMIA work permit' },
  { value: 'uae_employment_visa',   label: 'UAE Employment Visa' },
  { value: 'uae_golden_visa',       label: 'UAE Golden Visa (5–10yr residency)' },
  { value: 'saudi_iqama',           label: 'Saudi Iqama (work residence permit)' },
  { value: 'qatar_work_permit',     label: 'Qatar work permit' },
  { value: 'kuwait_work_permit',    label: 'Kuwait work permit' },
  { value: 'gcc_sponsored',         label: 'GCC sponsored (Bahrain / Oman)' },
  { value: 'other_work_auth',       label: 'Other work authorization' },
  { value: 'not_applicable',        label: 'Prefer not to say / Self-employed' },
];

const METRO_OPTIONS: Array<{ value: string; label: string; group: string }> = [
  { value: 'san_francisco', label: 'San Francisco', group: 'US' },
  { value: 'new_york',      label: 'New York',      group: 'US' },
  { value: 'seattle',       label: 'Seattle',       group: 'US' },
  { value: 'austin',        label: 'Austin',        group: 'US' },
  { value: 'boston',        label: 'Boston',        group: 'US' },
  { value: 'bangalore',     label: 'Bangalore',     group: 'India' },
  { value: 'hyderabad',     label: 'Hyderabad',     group: 'India' },
  { value: 'pune',          label: 'Pune',          group: 'India' },
  { value: 'chennai',       label: 'Chennai',       group: 'India' },
  { value: 'mumbai',        label: 'Mumbai',        group: 'India' },
  { value: 'london',        label: 'London',        group: 'International' },
  { value: 'berlin',        label: 'Berlin',        group: 'International' },
  { value: 'toronto',       label: 'Toronto',       group: 'International' },
  { value: 'singapore',     label: 'Singapore',     group: 'International' },
  { value: 'other',         label: 'Other',         group: 'International' },
];

const CURATED_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'INR', 'PHP', 'AED', 'SAR',
  'QAR', 'KWD', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'MYR', 'IDR', 'THB',
  'VND', 'BRL', 'MXN', 'COP', 'ARS', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'NZD', 'BDT', 'PKR', 'LKR', 'EGP', 'ZAR', 'NGN',
  'KES', 'GHS', 'OMR', 'BHD',
];

// ── Step config ───────────────────────────────────────────────────────────────
// 3 steps: merged Situation + Skills into one.

const STEP_LABELS = ['Core', 'Financial', 'Situation & Skills'] as const;
const TOTAL_STEPS = STEP_LABELS.length;
const STEP_TITLES = [
  'Core Information',
  'Financial Situation',
  'Situation & Skills',
];

// Deep-link by name: 'situation' and 'skills' both resolve to step 2.
const STEP_BY_NAME: Record<string, number> = {
  core:      0,
  financial: 1,
  situation: 2,
  skills:    2,
};

const SLIDE_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldGroup({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <div className="profile-field-group">
      <span className="profile-field-label">{label}</span>
      {children}
      {helper && <span className="profile-field-helper">{helper}</span>}
    </div>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="profile-check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

function SkillTags({ raw }: { raw: string }) {
  const tags = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <div className="profile-skill-tags">
      {tags.map((t) => <span key={t} className="profile-skill-tag">{t}</span>)}
    </div>
  );
}

// ── Step progress indicator ───────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div>
      <div className="step-indicator">
        {STEP_LABELS.map((_, i) => (
          <Fragment key={i}>
            <div className={`step-dot${i < step ? ' done' : i === step ? ' active' : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && <div className="step-line" />}
          </Fragment>
        ))}
      </div>
      <div className="profile-step-label-row">
        {STEP_LABELS.map((label, i) => (
          <span
            key={i}
            className="profile-step-label"
            style={{
              textAlign: i === 0 ? 'left' : i === STEP_LABELS.length - 1 ? 'right' : 'center',
              color: i === step ? 'var(--cyan, #00d4e0)' : i < step ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.20)',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileSetupModal() {
  const { userProfile, isHydrated, saveUserProfile } = useHumanProof();
  const { user } = useAuth();

  // Modal / wizard state
  const [open,           setOpen]           = useState(false);
  const [step,           setStep]           = useState(0);
  const [direction,      setDirection]      = useState<1 | -1>(1);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [saveFailed,     setSaveFailed]     = useState(false);

  // ── Listen for hp.profile.open ────────────────────────────────────────────
  // External components (MissingDataCard, ProfileQuickCapture) dispatch this
  // event to open the modal directly. Explicit triggers ALWAYS open — they
  // clear the session-level skip flag so a "Fill in your equity vest months"
  // CTA on the dashboard still works even after the user clicked Skip earlier.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { step?: string | number } | undefined;
      let targetStep = 0;
      if (detail?.step != null) {
        targetStep = typeof detail.step === 'number'
          ? detail.step
          : (STEP_BY_NAME[String(detail.step)] ?? 0);
      }
      // Explicit open always wins — clear the session skip flag.
      try { sessionStorage.removeItem(DISMISS_KEY); } catch { /* storage unavailable */ }
      setDirection(1);
      setStep(targetStep);
      setSaveFailed(false);
      setOpen(true);
    };
    window.addEventListener('hp.profile.open', handler);
    return () => window.removeEventListener('hp.profile.open', handler);
  }, []);

  // ── Form field state ──────────────────────────────────────────────────────

  // Step 0 — Core
  const [salaryBand,        setSalaryBand]        = useState<SalaryBand | ''>('');
  const [visaStatus,        setVisaStatus]        = useState<VisaStatus | ''>('');
  const [metro,             setMetro]             = useState('');
  const [tenureYears,       setTenureYears]       = useState<string>('');
  const [jobTitle,          setJobTitle]          = useState('');
  const [industryKey,       setIndustryKey]       = useState('');
  const [yearsExperience,   setYearsExperience]   = useState<string>('');
  const [metroArea,         setMetroArea]         = useState('');
  const [citizenshipRegion, setCitizenshipRegion] = useState<string>('');
  const [performanceTier,   setPerformanceTier]   = useState<string>('');

  // Step 1 — Financial
  const [localCurrencyCode,       setLocalCurrencyCode]       = useState<string>('USD');
  const [localMonthlySalaryRaw,   setLocalMonthlySalaryRaw]   = useState<string>('');
  const [monthlyExpensesLocal,    setMonthlyExpensesLocal]    = useState<string>('');
  const [savingsMonthsRunway,     setSavingsMonthsRunway]     = useState<string>('');
  const [hasEquityVesting,        setHasEquityVesting]        = useState(false);
  const [equityVestMonths,        setEquityVestMonths]        = useState<string>('');

  // Step 2 — Situation + Skills (merged)
  const [hasDependents,           setHasDependents]           = useState(false);
  const [dualIncomeHousehold,     setDualIncomeHousehold]     = useState(false);
  const [priorLayoffSurvived,     setPriorLayoffSurvived]     = useState(false);
  const [selfRatedSkillsRaw,      setSelfRatedSkillsRaw]      = useState('');
  const [targetSkillsRaw,         setTargetSkillsRaw]         = useState('');
  const [uniquenessKnowledgeType, setUniquenessKnowledgeType] = useState<UniquenessKnowledgeType | ''>('');

  // ── Bootstrap from existing profile ──────────────────────────────────────
  // Only auto-opens if shouldRepromptProfile returns true AND the user hasn't
  // dismissed the modal in this browser session.
  useEffect(() => {
    if (!isHydrated || !user) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* storage unavailable — proceed */ }

    if (!shouldRepromptProfile(userProfile)) return;

    const vs = userProfile?.visaStatus ?? '';
    const mt = userProfile?.metro ?? '';

    setSalaryBand(userProfile?.salaryBand ?? '');
    setVisaStatus(vs);
    setMetro(mt);
    setTenureYears(userProfile?.tenureYears != null ? String(userProfile.tenureYears) : '');
    setJobTitle(userProfile?.jobTitle ?? '');
    setIndustryKey(userProfile?.industryKey ?? '');
    setYearsExperience(userProfile?.yearsExperience != null ? String(userProfile.yearsExperience) : '');
    setMetroArea(userProfile?.metroArea ?? '');
    setCitizenshipRegion(userProfile?.citizenshipRegion ?? '');
    setPerformanceTier(userProfile?.performanceTier ?? '');

    const detectedCurrency = userProfile?.localCurrencyCode ?? inferCurrencyFromContext(mt, vs);
    setLocalCurrencyCode(detectedCurrency);

    const storedLocal = userProfile?.localMonthlySalaryRaw;
    const storedInr   = userProfile?.monthlySalaryInr;
    const storedUsd   = userProfile?.monthlySalaryUsd;
    if (storedLocal != null)                              setLocalMonthlySalaryRaw(String(storedLocal));
    else if (storedInr != null && detectedCurrency === 'INR') setLocalMonthlySalaryRaw(String(storedInr));
    else if (storedUsd != null)                           setLocalMonthlySalaryRaw(String(storedUsd));

    // Expenses: stored as USD; if currency isn't USD show blank (user re-enters in their currency)
    if (userProfile?.monthlyExpensesUsd != null && detectedCurrency === 'USD') {
      setMonthlyExpensesLocal(String(userProfile.monthlyExpensesUsd));
    }
    setSavingsMonthsRunway(userProfile?.savingsMonthsRunway != null ? String(userProfile.savingsMonthsRunway) : '');
    setHasEquityVesting(userProfile?.hasEquityVesting ?? false);
    setEquityVestMonths(userProfile?.equityVestMonths != null ? String(userProfile.equityVestMonths) : '');

    setHasDependents(userProfile?.hasDependents ?? false);
    setDualIncomeHousehold(userProfile?.dualIncomeHousehold ?? false);
    setPriorLayoffSurvived(userProfile?.priorLayoffSurvived ?? false);
    setSelfRatedSkillsRaw(userProfile?.selfRatedSkills?.join(', ') ?? '');
    setTargetSkillsRaw(userProfile?.targetSkills?.join(', ') ?? '');
    setUniquenessKnowledgeType(userProfile?.uniquenessKnowledgeType ?? '');

    setOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, userProfile, user]);

  // ── Auto-update currency when visa or metro changes ───────────────────────
  useEffect(() => {
    if (!open) return;
    const detected    = inferCurrencyFromContext(metro, visaStatus);
    const prevDetected = inferCurrencyFromContext(userProfile?.metro ?? '', userProfile?.visaStatus ?? '');
    setLocalCurrencyCode(prev => prev === prevDetected ? detected : prev);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visaStatus, metro]);

  if (!open) return null;

  const isReprompt = userProfile != null && userProfile.lastConfirmedAt != null;
  const showForm   = !isReprompt || showUpdateForm;

  // ── Currency helper ───────────────────────────────────────────────────────
  const currencyMeta  = CURRENCY_META[localCurrencyCode];
  const currencySymbol = currencyMeta?.symbol ?? '$';

  // Convert monthly expenses from local currency to USD for persistence.
  function expensesLocalToUsd(local: string): number | undefined {
    if (!local) return undefined;
    const num = Number(local);
    if (!Number.isFinite(num) || num <= 0) return undefined;
    return localCurrencyCode === 'USD' ? num : convertToUsd(num, localCurrencyCode);
  }

  // ── Dismiss helpers ───────────────────────────────────────────────────────
  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
    setOpen(false);
    setSaveFailed(false);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirmExisting = async () => {
    setSubmitting(true);
    setSaveFailed(false);
    const result = await saveUserProfile({ confirm: true });
    setSubmitting(false);
    if (result === null && user) {
      // Authenticated but DB write failed — stay open so user can retry.
      setSaveFailed(true);
      return;
    }
    setOpen(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSaveFailed(false);

    const tenure = tenureYears === '' ? undefined : Number(tenureYears);
    const yoe    = yearsExperience === '' ? undefined : Number(yearsExperience);
    const rawToSkills = (raw: string) => raw.trim()
      ? raw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const localSalaryNum = localMonthlySalaryRaw !== '' ? Number(localMonthlySalaryRaw) : undefined;
    const salaryUsd = localSalaryNum != null ? convertToUsd(localSalaryNum, localCurrencyCode) : undefined;
    const salaryInr = localSalaryNum != null && localCurrencyCode === 'INR' ? localSalaryNum : undefined;

    const result = await saveUserProfile({
      salaryBand:              salaryBand || undefined,
      visaStatus:              visaStatus || undefined,
      metro:                   metro || undefined,
      tenureYears:             Number.isFinite(tenure) ? tenure : undefined,
      confirm:                 true,
      jobTitle:                jobTitle.trim() || undefined,
      industryKey:             industryKey || undefined,
      yearsExperience:         Number.isFinite(yoe) ? yoe : undefined,
      metroArea:               metroArea || undefined,
      citizenshipRegion:       (citizenshipRegion as UserProfile['citizenshipRegion']) || undefined,
      performanceTier:         (performanceTier as UserProfile['performanceTier']) || undefined,
      localCurrencyCode,
      localMonthlySalaryRaw:   localSalaryNum,
      monthlySalaryUsd:        salaryUsd,
      monthlySalaryInr:        salaryInr,
      monthlyExpensesUsd:      expensesLocalToUsd(monthlyExpensesLocal),
      savingsMonthsRunway:     savingsMonthsRunway !== '' ? Number(savingsMonthsRunway) : undefined,
      hasEquityVesting,
      equityVestMonths:        hasEquityVesting && equityVestMonths !== '' ? Number(equityVestMonths) : undefined,
      hasDependents,
      dualIncomeHousehold,
      priorLayoffSurvived,
      selfRatedSkills:         rawToSkills(selfRatedSkillsRaw),
      targetSkills:            rawToSkills(targetSkillsRaw),
      uniquenessKnowledgeType: uniquenessKnowledgeType || undefined,
    });

    setSubmitting(false);

    if (result === null && user) {
      // Authenticated but Supabase upsert failed — keep modal open, show error.
      setSaveFailed(true);
      return;
    }
    // Success (result !== null) or unauthenticated optimistic save (result === null && !user) — close.
    setOpen(false);
  };

  const goNext = () => { setDirection(1);  setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

  // ── Step content ──────────────────────────────────────────────────────────

  const stepNodes: Record<number, ReactNode> = {

    // ── Step 0: Core ─────────────────────────────────────────────────────────
    0: (
      <div className="profile-step-body">
        <FieldGroup
          label="Work authorization"
          helper="Highest impact on risk score — determines visa dependency layer"
        >
          <select className="input" title="Work authorization" value={visaStatus} onChange={e => setVisaStatus(e.target.value as VisaStatus)}>
            <option value="">Select…</option>
            {VISA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldGroup>

        {visaStatus && !['citizen', 'permanent_resident', 'not_applicable', 'eu_blue_card', 'eu_blue_card_germany', 'uae_golden_visa', ''].includes(visaStatus) && (
          <FieldGroup
            label="Your citizenship / passport"
            helper="EU citizens have 27-country fallback mobility — reduces visa dependency score"
          >
            <select className="input" title="Citizenship / passport region" value={citizenshipRegion} onChange={e => setCitizenshipRegion(e.target.value)}>
              <option value="">Select…</option>
              <option value="eu">EU / EEA citizen</option>
              <option value="uk_citizen">UK citizen</option>
              <option value="us_citizen">US citizen</option>
              <option value="au_citizen">Australian citizen</option>
              <option value="ca_citizen">Canadian citizen</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </FieldGroup>
        )}

        <FieldGroup label="Years at current company" helper="Feeds tenure protection score (D4, weight 0.18)">
          <input className="input" type="number" min={0} max={60} step={0.5}
            value={tenureYears} onChange={e => setTenureYears(e.target.value)} placeholder="e.g. 3.5" />
        </FieldGroup>

        <FieldGroup label="Performance level" helper="Self-assessed — used for D4 seniority shield">
          <select className="input" title="Performance tier" value={performanceTier} onChange={e => setPerformanceTier(e.target.value)}>
            <option value="">Select…</option>
            <option value="top">Top performer — consistently above expectations</option>
            <option value="average">Solid performer — meets expectations</option>
            <option value="below">Below expectations — recent feedback concerns</option>
            <option value="unknown">Not sure / no formal reviews</option>
          </select>
        </FieldGroup>

        <FieldGroup label="City / Metro area" helper="Personalizes job market data and financial runway math">
          <select className="input" title="City / Metro area" value={metroArea} onChange={e => setMetroArea(e.target.value)}>
            <option value="">Select…</option>
            {(['US', 'India', 'International'] as const).map(group => (
              <optgroup key={group} label={group}>
                {METRO_OPTIONS.filter(o => o.group === group).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldGroup>

        {!metroArea && (
          <FieldGroup label="City (free text)" helper="If your city isn't in the list — used for currency detection">
            <input className="input" type="text" value={metro} onChange={e => setMetro(e.target.value)}
              placeholder="e.g. Bengaluru, San Francisco, London" />
          </FieldGroup>
        )}

        <FieldGroup label="Job title" helper="Routes to 412-role personalized action database">
          <input className="input" type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer, Product Manager" />
        </FieldGroup>

        <FieldGroup label="Industry">
          <select className="input" title="Industry" value={industryKey} onChange={e => setIndustryKey(e.target.value)}>
            <option value="">Select…</option>
            {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Total years of professional experience" helper="Across all employers — shapes seniority bracket">
          <input className="input" type="number" min={0} max={60} step={1}
            value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="e.g. 8" />
        </FieldGroup>

        <FieldGroup label="Salary band (USD)" helper="Rough band — financial step captures your precise salary">
          <select className="input" title="Salary band (USD)" value={salaryBand} onChange={e => setSalaryBand(e.target.value as SalaryBand)}>
            <option value="">Select…</option>
            {SALARY_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </FieldGroup>
      </div>
    ),

    // ── Step 1: Financial ─────────────────────────────────────────────────────
    1: (
      <div className="profile-step-body">
        <p className="profile-hint-text">Stays private — shapes runway estimates and urgency of recommended actions.</p>

        <FieldGroup label="Currency" helper="Auto-detected from your location and visa — override if needed">
          <select className="input" aria-label="Currency" value={localCurrencyCode} onChange={e => setLocalCurrencyCode(e.target.value)}>
            {CURATED_CURRENCY_CODES.filter(c => CURRENCY_META[c]).map(c => {
              const m = CURRENCY_META[c];
              return <option key={c} value={c}>{m.symbol} {m.name} ({c})</option>;
            })}
          </select>
        </FieldGroup>

        <FieldGroup
          label={`Monthly Salary (${localCurrencyCode})`}
          helper={
            localMonthlySalaryRaw !== '' && localCurrencyCode !== 'USD'
              ? `${localToUsdLabel(Number(localMonthlySalaryRaw), localCurrencyCode)} — used for runway math`
              : 'Gross monthly — estimates how long your runway lasts'
          }
        >
          <input className="input" type="number" min={0} value={localMonthlySalaryRaw}
            onChange={e => setLocalMonthlySalaryRaw(e.target.value)}
            placeholder={
              localCurrencyCode === 'INR' ? '85,000' :
              localCurrencyCode === 'PHP' ? '45,000' :
              localCurrencyCode === 'SGD' ? '8,500'  :
              localCurrencyCode === 'GBP' ? '4,000'  :
              localCurrencyCode === 'EUR' ? '4,500'  : '5,000'
            }
          />
        </FieldGroup>

        <FieldGroup
          label={`Monthly Expenses (${localCurrencyCode})`}
          helper={
            localCurrencyCode !== 'USD' && monthlyExpensesLocal !== ''
              ? `≈ ${currencySymbol}${monthlyExpensesLocal} · USD equivalent used for runway calculation`
              : 'Rent + food + bills — estimates how long you could sustain a job search'
          }
        >
          <input className="input" type="number" min={0} value={monthlyExpensesLocal}
            onChange={e => setMonthlyExpensesLocal(e.target.value)}
            placeholder={
              localCurrencyCode === 'INR' ? '40,000' :
              localCurrencyCode === 'PHP' ? '25,000' :
              localCurrencyCode === 'SGD' ? '3,500'  :
              localCurrencyCode === 'GBP' ? '2,000'  :
              localCurrencyCode === 'EUR' ? '2,200'  : '3,000'
            }
          />
        </FieldGroup>

        <FieldGroup label="Months of savings" helper="Enter directly if you know your runway — overrides the calculation above">
          <input className="input" type="number" min={0} step={0.5} value={savingsMonthsRunway}
            onChange={e => setSavingsMonthsRunway(e.target.value)} placeholder="e.g. 6" />
        </FieldGroup>

        <div className="profile-equity-group">
          <CheckRow checked={hasEquityVesting} onChange={setHasEquityVesting}>
            I have unvested equity (RSUs / options)
          </CheckRow>
          {hasEquityVesting && (
            <FieldGroup label="Months until next vest cliff">
              <input className="input" type="number" min={0} max={48} value={equityVestMonths}
                onChange={e => setEquityVestMonths(e.target.value)} placeholder="e.g. 8" />
            </FieldGroup>
          )}
        </div>
      </div>
    ),

    // ── Step 2: Situation + Skills (merged) ───────────────────────────────────
    2: (
      <div className="profile-step-body">
        <p className="profile-hint-text">Life context and skills shape action recommendations and escape-path scoring.</p>

        {/* Situation checkboxes */}
        <div style={{ marginBottom: 18 }}>
          <div className="profile-field-label" style={{ marginBottom: 8 }}>Your Situation</div>
          <CheckRow checked={hasDependents} onChange={setHasDependents}>
            I support dependents (children, parents, etc.)
          </CheckRow>
          <CheckRow checked={dualIncomeHousehold} onChange={setDualIncomeHousehold}>
            My household has a second income (spouse / partner)
          </CheckRow>
          <CheckRow checked={priorLayoffSurvived} onChange={setPriorLayoffSurvived}>
            I've survived a layoff before and successfully re-landed
          </CheckRow>
        </div>

        {/* Skills */}
        <FieldGroup label="Current Skills">
          <input className="input" type="text" value={selfRatedSkillsRaw}
            onChange={e => setSelfRatedSkillsRaw(e.target.value)}
            placeholder="Python, React, SQL, Machine Learning…" />
          <SkillTags raw={selfRatedSkillsRaw} />
        </FieldGroup>

        <FieldGroup label="Learning Goals" helper="What are you actively building?">
          <input className="input" type="text" value={targetSkillsRaw}
            onChange={e => setTargetSkillsRaw(e.target.value)}
            placeholder="Rust, LLMs, System Design…" />
          <SkillTags raw={targetSkillsRaw} />
        </FieldGroup>

        <FieldGroup label="What makes you uniquely valuable? (optional)"
          helper="Shapes inaction scenario narratives">
          <select className="input" title="Unique knowledge type" value={uniquenessKnowledgeType}
            onChange={e => setUniquenessKnowledgeType(e.target.value as UniquenessKnowledgeType | '')}>
            <option value="">Not sure / doesn't apply</option>
            <option value="system_specific">System knowledge — I own a legacy system / proprietary platform</option>
            <option value="client_relationship">Client relationships — my clients trust me personally</option>
            <option value="process_institutional">Process knowledge — I'm the only one who knows how things work</option>
            <option value="domain_expert">Domain expertise — deep regulatory / specialized knowledge</option>
            <option value="leadership_capital">Leadership capital — organizational authority and team loyalty</option>
          </select>
          {uniquenessKnowledgeType === 'system_specific' && (
            <p className="profile-hint-emerald">
              Your protection window is the migration timeline (18–36 mo). Highest-ROI action: lateral move to migration architect before documentation begins.
            </p>
          )}
          {uniquenessKnowledgeType === 'client_relationship' && (
            <p className="profile-hint-emerald">
              That trust belongs to you, not the company. Understand which clients would follow you — build your move around those relationships.
            </p>
          )}
          {uniquenessKnowledgeType === 'leadership_capital' && (
            <p className="profile-hint-emerald">
              Organizational authority is mobile — it follows you. Identify where your leadership is most needed outside your current company.
            </p>
          )}
        </FieldGroup>
      </div>
    ),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
      className="profile-modal-shell"
    >
      <div className="profile-modal-card">

        {/* ── Always-visible header row with × close button ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <h2 id="profile-setup-title" className="profile-modal-title" style={{ marginBottom: 2 }}>
              {isReprompt ? 'Is your profile still accurate?' : 'Personalize your audit'}
            </h2>
            <p className="profile-modal-subtitle">
              {isReprompt
                ? 'Confirm or update every 90 days so your audit stays calibrated.'
                : 'These answers shape action ranking, runway math, and exit timing. Stored privately on your account.'}
            </p>
          </div>
          {/* × close — always visible, uses session dismiss flag */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1,
              padding: '2px 4px', flexShrink: 0, marginTop: 2,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            ×
          </button>
        </div>

        {/* ── Reprompt confirm block ── */}
        {isReprompt && !showUpdateForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-reprompt-card"
          >
            <div className="profile-reprompt-grid">
              <div>
                <div className="profile-reprompt-field-label">Salary band</div>
                <div className="profile-reprompt-field-value">{userProfile?.salaryBand ?? '—'}</div>
              </div>
              <div>
                <div className="profile-reprompt-field-label">Visa</div>
                <div className="profile-reprompt-field-value">{userProfile?.visaStatus ?? '—'}</div>
              </div>
              <div>
                <div className="profile-reprompt-field-label">Metro</div>
                <div className="profile-reprompt-field-value">{userProfile?.metroArea ?? userProfile?.metro ?? '—'}</div>
              </div>
              <div>
                <div className="profile-reprompt-field-label">Tenure</div>
                <div className="profile-reprompt-field-value">
                  {userProfile?.tenureYears != null ? `${userProfile.tenureYears} yrs` : '—'}
                </div>
              </div>
              <div>
                <div className="profile-reprompt-field-label">Performance</div>
                <div className="profile-reprompt-field-value">{userProfile?.performanceTier ?? '—'}</div>
              </div>
              <div>
                <div className="profile-reprompt-field-label">Role</div>
                <div className="profile-reprompt-field-value"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userProfile?.jobTitle ?? '—'}
                </div>
              </div>
            </div>

            {saveFailed && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0', lineHeight: 1.5 }}>
                Save failed — check your connection and try again.
              </p>
            )}

            <div className="profile-reprompt-actions">
              <button type="button" onClick={handleConfirmExisting} disabled={submitting} className="profile-btn-confirm">
                {submitting ? 'Confirming…' : '✓ Still accurate'}
              </button>
              <button type="button" onClick={() => { setShowUpdateForm(true); setStep(0); }} className="profile-btn-update">
                Update
              </button>
            </div>
          </motion.div>
        )}

        {/* ── 4-step wizard ── */}
        {showForm && (
          <>
            <StepIndicator step={step} />

            <div className="profile-step-block">
              <span className="profile-step-heading">Step {step + 1} of {TOTAL_STEPS}</span>
              <h3 className="profile-step-title">{STEP_TITLES[step]}</h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={SLIDE_TRANSITION}
              >
                {stepNodes[step]}
              </motion.div>
            </AnimatePresence>

            {/* Inline save error */}
            {saveFailed && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0', lineHeight: 1.5 }}>
                Save failed — check your connection and try again.
              </p>
            )}

            {/* Navigation */}
            <div className="profile-nav-row">
              {step > 0 && (
                <button type="button" onClick={goBack} className="profile-btn-back">← Back</button>
              )}
              <div className="flex-1" />
              {/* Skip available on ALL steps */}
              <button type="button" onClick={dismiss} className="profile-btn-skip">
                Skip for now
              </button>
              {step < TOTAL_STEPS - 1 ? (
                <button type="button" onClick={goNext} className="profile-btn-primary">Next →</button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting} className="profile-btn-primary">
                  {submitting ? 'Saving…' : 'Save profile'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
