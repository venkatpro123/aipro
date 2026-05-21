// ProfileSetupModal.tsx — v20.0
// 4-step wizard: Core → Financial → Situation → Skills.
// Framer Motion animated slide transitions + premium token-based modal styling.

import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHumanProof } from '../context/HumanProofContext';
import { useAuth } from '../context/AuthContext';
import { shouldRepromptProfile } from '../services/userProfileService';
import type { SalaryBand, VisaStatus, UniquenessKnowledgeType } from '../services/userProfileService';
import { inferCurrencyFromContext, convertToUsd, localToUsdLabel, CURRENCY_META } from '../services/currencyService';

// ── Constants ─────────────────────────────────────────────────────────────────

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

// Visa options grouped by region — label is shown in the <select> dropdown.
// The value must match a VisaStatus key so the engine can route correctly.
const VISA_OPTIONS: Array<{ value: VisaStatus; label: string }> = [
  // ── No constraint ────────────────────────────────────────────────────────
  { value: 'citizen',             label: 'Citizen / National' },
  { value: 'permanent_resident',  label: 'Permanent resident / ILR / Green card' },
  // ── US ───────────────────────────────────────────────────────────────────
  { value: 'h1b',                 label: 'H1B (US)' },
  { value: 'l1',                  label: 'L1 (US — intracompany transfer)' },
  { value: 'opt_stem',            label: 'OPT / OPT STEM (US)' },
  { value: 'tn',                  label: 'TN (US/Canada — CUSMA/NAFTA)' },
  // ── UK ───────────────────────────────────────────────────────────────────
  { value: 'uk_skilled_worker',   label: 'UK Skilled Worker visa' },
  // ── EU ───────────────────────────────────────────────────────────────────
  { value: 'eu_blue_card_germany', label: 'EU Blue Card — Germany (§20 AufenthG 6-month extension)' },
  { value: 'eu_blue_card',         label: 'EU Blue Card — France / Netherlands / other EU' },
  // ── Singapore ────────────────────────────────────────────────────────────
  { value: 'singapore_ep',         label: 'Singapore Employment Pass (EP)' },
  { value: 'singapore_s_pass',     label: 'Singapore S Pass' },
  // ── Australia ────────────────────────────────────────────────────────────
  { value: 'australia_482_tss',    label: 'Australia 482 TSS (Temporary Skill Shortage)' },
  // ── Philippines ──────────────────────────────────────────────────────────
  { value: 'philippines_9g_aep',   label: 'Philippines 9G (Alien Employment Permit)' },
  // ── Japan ────────────────────────────────────────────────────────────────
  { value: 'japan_work_visa',      label: 'Japan Work Visa (Engineer / Specialist / HSP)' },
  // ── Canada ───────────────────────────────────────────────────────────────
  { value: 'canada_lmia_permit',  label: 'Canada LMIA work permit' },
  // ── MENA ─────────────────────────────────────────────────────────────────
  { value: 'uae_employment_visa', label: 'UAE Employment Visa' },
  { value: 'uae_golden_visa',     label: 'UAE Golden Visa (5–10yr residency)' },
  { value: 'saudi_iqama',         label: 'Saudi Iqama (work residence permit)' },
  { value: 'qatar_work_permit',   label: 'Qatar work permit' },
  { value: 'kuwait_work_permit',  label: 'Kuwait work permit' },
  { value: 'gcc_sponsored',       label: 'GCC sponsored (Bahrain / Oman)' },
  // ── Generic ──────────────────────────────────────────────────────────────
  { value: 'other_work_auth',     label: 'Other work authorization' },
  { value: 'not_applicable',      label: 'Prefer not to say / Self-employed' },
];

const METRO_OPTIONS: Array<{ value: string; label: string; group: string }> = [
  { value: 'san_francisco', label: 'San Francisco', group: 'US' },
  { value: 'new_york',      label: 'New York',      group: 'US' },
  { value: 'seattle',       label: 'Seattle',        group: 'US' },
  { value: 'austin',        label: 'Austin',         group: 'US' },
  { value: 'boston',        label: 'Boston',         group: 'US' },
  { value: 'bangalore',     label: 'Bangalore',      group: 'India' },
  { value: 'hyderabad',     label: 'Hyderabad',      group: 'India' },
  { value: 'pune',          label: 'Pune',           group: 'India' },
  { value: 'chennai',       label: 'Chennai',        group: 'India' },
  { value: 'mumbai',        label: 'Mumbai',         group: 'India' },
  { value: 'london',        label: 'London',         group: 'International' },
  { value: 'berlin',        label: 'Berlin',         group: 'International' },
  { value: 'toronto',       label: 'Toronto',        group: 'International' },
  { value: 'singapore',     label: 'Singapore',      group: 'International' },
  { value: 'other',         label: 'Other',          group: 'International' },
];

// Curated display list — ordered by global professional population.
// All 48 currencies are in CURRENCY_META; these cover the vast majority of users.
const CURATED_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'INR', 'PHP', 'AED', 'SAR',
  'QAR', 'KWD', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'MYR', 'IDR', 'THB',
  'VND', 'BRL', 'MXN', 'COP', 'ARS', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'NZD', 'BDT', 'PKR', 'LKR', 'EGP', 'ZAR', 'NGN',
  'KES', 'GHS', 'OMR', 'BHD',
];

const STEP_LABELS = ['Core', 'Financial', 'Situation', 'Skills'] as const;
const TOTAL_STEPS = STEP_LABELS.length;
const STEP_TITLES = [
  'Core Information',
  'Financial Situation',
  'Your Situation',
  'Skills',
];

const SLIDE_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldGroup({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
        {label}
      </span>
      {children}
      {helper && (
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
          {helper}
        </span>
      )}
    </div>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: 'var(--cyan, #00d4e0)', flexShrink: 0 }}
      />
      {children}
    </label>
  );
}

function SkillTags({ raw }: { raw: string }) {
  const tags = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {tags.map((t) => (
        <span key={t} style={{
          padding: '2px 10px', borderRadius: 999,
          background: 'rgba(0,212,224,0.10)', border: '1px solid rgba(0,212,224,0.25)',
          fontSize: '0.75rem', color: 'var(--cyan, #00d4e0)',
        }}>
          {t}
        </span>
      ))}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {STEP_LABELS.map((label, i) => (
          <span key={i} style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', flex: 1,
            textAlign: i === 0 ? 'left' : i === STEP_LABELS.length - 1 ? 'right' : 'center',
            color: i === step
              ? 'var(--cyan, #00d4e0)'
              : i < step ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.20)',
          }}>
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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 0 — Core
  const [salaryBand, setSalaryBand] = useState<SalaryBand | ''>('');
  const [visaStatus, setVisaStatus] = useState<VisaStatus | ''>('');
  const [metro, setMetro] = useState('');
  const [tenureYears, setTenureYears] = useState<string>('');

  // Step 1 — Financial
  const [localCurrencyCode, setLocalCurrencyCode] = useState<string>('USD');
  const [localMonthlySalaryRaw, setLocalMonthlySalaryRaw] = useState<string>('');
  const [monthlyExpensesUsd, setMonthlyExpensesUsd] = useState<string>('');
  const [savingsMonthsRunway, setSavingsMonthsRunway] = useState<string>('');
  const [hasEquityVesting, setHasEquityVesting] = useState(false);
  const [equityVestMonths, setEquityVestMonths] = useState<string>('');

  // Step 2 — Situation
  const [hasDependents, setHasDependents] = useState(false);
  const [dualIncomeHousehold, setDualIncomeHousehold] = useState(false);
  const [priorLayoffSurvived, setPriorLayoffSurvived] = useState(false);
  const [metroArea, setMetroArea] = useState('');

  // Step 3 — Skills
  const [selfRatedSkillsRaw, setSelfRatedSkillsRaw] = useState('');
  const [targetSkillsRaw, setTargetSkillsRaw] = useState('');
  const [uniquenessKnowledgeType, setUniquenessKnowledgeType] = useState<UniquenessKnowledgeType | ''>('');

  // Step 0 extension — Role identity (v36)
  const [jobTitle, setJobTitle] = useState('');
  const [industryKey, setIndustryKey] = useState('');
  const [yearsExperience, setYearsExperience] = useState<string>('');

  // Bootstrap from existing profile
  useEffect(() => {
    if (!isHydrated || !user) return;
    if (shouldRepromptProfile(userProfile)) {
      const vs = userProfile?.visaStatus ?? '';
      const mt = userProfile?.metro ?? '';
      setSalaryBand(userProfile?.salaryBand ?? '');
      setVisaStatus(vs);
      setMetro(mt);
      setTenureYears(userProfile?.tenureYears != null ? String(userProfile.tenureYears) : '');
      // Currency: prefer stored value, then auto-detect from metro+visa
      const detectedCurrency = userProfile?.localCurrencyCode
        ?? inferCurrencyFromContext(mt, vs);
      setLocalCurrencyCode(detectedCurrency);
      // Local salary: prefer stored raw value, fall back to INR then USD
      const storedLocal = userProfile?.localMonthlySalaryRaw;
      const storedInr = userProfile?.monthlySalaryInr;
      const storedUsd = userProfile?.monthlySalaryUsd;
      if (storedLocal != null) {
        setLocalMonthlySalaryRaw(String(storedLocal));
      } else if (storedInr != null && detectedCurrency === 'INR') {
        setLocalMonthlySalaryRaw(String(storedInr));
      } else if (storedUsd != null) {
        setLocalMonthlySalaryRaw(String(storedUsd));
      }
      setMonthlyExpensesUsd(userProfile?.monthlyExpensesUsd != null ? String(userProfile.monthlyExpensesUsd) : '');
      setSavingsMonthsRunway(userProfile?.savingsMonthsRunway != null ? String(userProfile.savingsMonthsRunway) : '');
      setHasEquityVesting(userProfile?.hasEquityVesting ?? false);
      setEquityVestMonths(userProfile?.equityVestMonths != null ? String(userProfile.equityVestMonths) : '');
      setHasDependents(userProfile?.hasDependents ?? false);
      setDualIncomeHousehold(userProfile?.dualIncomeHousehold ?? false);
      setPriorLayoffSurvived(userProfile?.priorLayoffSurvived ?? false);
      setMetroArea(userProfile?.metroArea ?? '');
      setSelfRatedSkillsRaw(userProfile?.selfRatedSkills?.join(', ') ?? '');
      setTargetSkillsRaw(userProfile?.targetSkills?.join(', ') ?? '');
      setUniquenessKnowledgeType(userProfile?.uniquenessKnowledgeType ?? '');
      setJobTitle(userProfile?.jobTitle ?? '');
      setIndustryKey(userProfile?.industryKey ?? '');
      setYearsExperience(userProfile?.yearsExperience != null ? String(userProfile.yearsExperience) : '');
      setOpen(true);
    }
  }, [isHydrated, userProfile, user]);

  // Auto-update currency when visa or metro changes (only if not overridden by user)
  useEffect(() => {
    if (!open) return;
    const detected = inferCurrencyFromContext(metro, visaStatus);
    setLocalCurrencyCode((prev) => {
      // Only auto-update if the current value is also auto-derived (not manually chosen)
      // We detect this by checking if the current value matches what was auto-detected
      // before the change — this prevents overwriting deliberate manual selection.
      const prevDetected = inferCurrencyFromContext(
        userProfile?.metro ?? '', userProfile?.visaStatus ?? '',
      );
      return prev === prevDetected ? detected : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visaStatus, metro]);

  if (!open) return null;

  const isReprompt = userProfile != null && userProfile.lastConfirmedAt != null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirmExisting = async () => {
    setSubmitting(true);
    await saveUserProfile({ confirm: true });
    setSubmitting(false);
    setOpen(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const tenure = tenureYears === '' ? undefined : Number(tenureYears);
    const rawToSkills = (raw: string): string[] | undefined =>
      raw.trim() ? raw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const yoe = yearsExperience === '' ? undefined : Number(yearsExperience);

    // Salary: store raw local amount + derived USD for pipeline calculations
    const localSalaryNum = localMonthlySalaryRaw !== '' ? Number(localMonthlySalaryRaw) : undefined;
    const salaryUsd = localSalaryNum != null
      ? convertToUsd(localSalaryNum, localCurrencyCode)
      : undefined;
    const salaryInr = localSalaryNum != null && localCurrencyCode === 'INR'
      ? localSalaryNum
      : undefined;

    await saveUserProfile({
      salaryBand:             salaryBand || undefined,
      visaStatus:             visaStatus || undefined,
      metro:                  metro || undefined,
      tenureYears:            Number.isFinite(tenure) ? tenure : undefined,
      confirm:                true,
      jobTitle:               jobTitle.trim() || undefined,
      industryKey:            industryKey || undefined,
      yearsExperience:        Number.isFinite(yoe) ? yoe : undefined,
      localCurrencyCode:      localCurrencyCode,
      localMonthlySalaryRaw:  localSalaryNum,
      monthlySalaryUsd:       salaryUsd,
      monthlySalaryInr:       salaryInr,
      monthlyExpensesUsd:     monthlyExpensesUsd !== '' ? Number(monthlyExpensesUsd) : undefined,
      savingsMonthsRunway:    savingsMonthsRunway !== '' ? Number(savingsMonthsRunway) : undefined,
      hasEquityVesting,
      equityVestMonths:       hasEquityVesting && equityVestMonths !== '' ? Number(equityVestMonths) : undefined,
      hasDependents,
      dualIncomeHousehold,
      priorLayoffSurvived,
      metroArea:              metroArea || undefined,
      selfRatedSkills:           rawToSkills(selfRatedSkillsRaw),
      targetSkills:              rawToSkills(targetSkillsRaw),
      uniquenessKnowledgeType:   uniquenessKnowledgeType || undefined,
    });
    setSubmitting(false);
    setOpen(false);
  };

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const stepNodes: Record<number, ReactNode> = {
    0: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FieldGroup label="Salary band (USD)">
          <select className="input" value={salaryBand} onChange={(e) => setSalaryBand(e.target.value as SalaryBand)}>
            <option value="">Select…</option>
            {SALARY_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Work authorization">
          <select className="input" value={visaStatus} onChange={(e) => setVisaStatus(e.target.value as VisaStatus)}>
            <option value="">Select…</option>
            {VISA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Metro / city">
          <input className="input" type="text" value={metro}
            onChange={(e) => setMetro(e.target.value)}
            placeholder="e.g. Bengaluru, San Francisco, London" />
        </FieldGroup>

        <FieldGroup label="Years at current company">
          <input className="input" type="number" min={0} max={60} step={0.5}
            value={tenureYears} onChange={(e) => setTenureYears(e.target.value)}
            placeholder="e.g. 3.5" />
        </FieldGroup>

        <FieldGroup label="Job title" helper="Helps us personalize actions and seniority recommendations">
          <input className="input" type="text" value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer, Product Manager" />
        </FieldGroup>

        <FieldGroup label="Industry">
          <select className="input" value={industryKey} onChange={(e) => setIndustryKey(e.target.value)}>
            <option value="">Select…</option>
            {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Total years of professional experience" helper="Across all employers — shapes your seniority bracket">
          <input className="input" type="number" min={0} max={60} step={1}
            value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)}
            placeholder="e.g. 8" />
        </FieldGroup>
      </div>
    ),

    1: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: '0.80rem', color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
          Stays private — shapes runway estimates and urgency of recommended actions.
        </p>

        <FieldGroup label="Currency" helper="Auto-detected from your location and visa status — override if needed">
          <select className="input" aria-label="Currency" value={localCurrencyCode} onChange={(e) => setLocalCurrencyCode(e.target.value)}>
            {CURATED_CURRENCY_CODES.filter((c) => CURRENCY_META[c]).map((c) => {
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
              : 'Gross monthly — used to estimate how long your runway lasts'
          }
        >
          <input className="input" type="number" min={0} value={localMonthlySalaryRaw}
            onChange={(e) => setLocalMonthlySalaryRaw(e.target.value)}
            placeholder={
              localCurrencyCode === 'INR' ? '85,000' :
              localCurrencyCode === 'PHP' ? '45,000' :
              localCurrencyCode === 'SGD' ? '8,500' :
              localCurrencyCode === 'GBP' ? '4,000' :
              localCurrencyCode === 'EUR' ? '4,500' :
              '5,000'
            }
          />
        </FieldGroup>

        <FieldGroup label="Monthly Expenses (USD)" helper="Rent + food + bills in USD — estimates how long you could sustain a job search">
          <input className="input" type="number" min={0} value={monthlyExpensesUsd}
            onChange={(e) => setMonthlyExpensesUsd(e.target.value)} placeholder="$3,000" />
        </FieldGroup>

        <FieldGroup label="Months of savings" helper="Enter directly if you know your runway (overrides salary/expenses)">
          <input className="input" type="number" min={0} step={0.5} value={savingsMonthsRunway}
            onChange={(e) => setSavingsMonthsRunway(e.target.value)} placeholder="e.g. 6" />
        </FieldGroup>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CheckRow checked={hasEquityVesting} onChange={setHasEquityVesting}>
            I have unvested equity (RSUs/options)
          </CheckRow>
          {hasEquityVesting && (
            <FieldGroup label="Months until next vest cliff">
              <input className="input" type="number" min={0} max={48} value={equityVestMonths}
                onChange={(e) => setEquityVestMonths(e.target.value)} placeholder="e.g. 8" />
            </FieldGroup>
          )}
        </div>
      </div>
    ),

    2: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: '0.80rem', color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
          Life context shapes action recommendations and risk urgency scoring.
        </p>

        <CheckRow checked={hasDependents} onChange={setHasDependents}>
          I support dependents (children, parents, etc.)
        </CheckRow>
        <CheckRow checked={dualIncomeHousehold} onChange={setDualIncomeHousehold}>
          My household has a second income (spouse/partner)
        </CheckRow>
        <CheckRow checked={priorLayoffSurvived} onChange={setPriorLayoffSurvived}>
          I've survived a layoff before and successfully re-landed
        </CheckRow>

        <FieldGroup label="Metro Area">
          <select className="input" value={metroArea} onChange={(e) => setMetroArea(e.target.value)}>
            <option value="">Select…</option>
            {(['US', 'India', 'International'] as const).map((group) => (
              <optgroup key={group} label={group}>
                {METRO_OPTIONS.filter((o) => o.group === group).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldGroup>
      </div>
    ),

    3: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: '0.80rem', color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
          Skills power escape-path scoring and alternative role suggestions.
        </p>

        <FieldGroup label="Current Skills">
          <input className="input" type="text" value={selfRatedSkillsRaw}
            onChange={(e) => setSelfRatedSkillsRaw(e.target.value)}
            placeholder="Python, React, SQL, Machine Learning…" />
          <SkillTags raw={selfRatedSkillsRaw} />
        </FieldGroup>

        <FieldGroup label="Learning Goals" helper="What skills are you actively building?">
          <input className="input" type="text" value={targetSkillsRaw}
            onChange={(e) => setTargetSkillsRaw(e.target.value)}
            placeholder="Rust, LLMs, System Design…" />
          <SkillTags raw={targetSkillsRaw} />
        </FieldGroup>

        <FieldGroup
          label="What makes you uniquely valuable? (optional)"
          helper="Shapes inaction scenario narratives — the advice you get when you ask 'what happens if I do nothing?'"
        >
          <select
            title="Unique knowledge type"
            className="input"
            value={uniquenessKnowledgeType}
            onChange={(e) => setUniquenessKnowledgeType(e.target.value as UniquenessKnowledgeType | '')}
          >
            <option value="">Not sure / doesn't apply</option>
            <option value="system_specific">System knowledge — I own a legacy system / proprietary platform</option>
            <option value="client_relationship">Client relationships — my clients trust me personally</option>
            <option value="process_institutional">Process knowledge — I'm the only one who knows how things work</option>
            <option value="domain_expert">Domain expertise — deep regulatory / specialized knowledge</option>
            <option value="leadership_capital">Leadership capital — organizational authority and team loyalty</option>
          </select>
          {uniquenessKnowledgeType === 'system_specific' && (
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'rgba(16,185,129,0.75)', lineHeight: 1.45 }}>
              Your protection window is the migration timeline (18–36 mo). Highest-ROI action: lateral move to migration architect before documentation begins.
            </p>
          )}
          {uniquenessKnowledgeType === 'client_relationship' && (
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'rgba(16,185,129,0.75)', lineHeight: 1.45 }}>
              That trust belongs to you, not the company. Understand which clients would follow you — build your move around those relationships.
            </p>
          )}
          {uniquenessKnowledgeType === 'leadership_capital' && (
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'rgba(16,185,129,0.75)', lineHeight: 1.45 }}>
              Organizational authority is mobile — it follows you. Identify where your leadership is most needed outside your current company.
            </p>
          )}
        </FieldGroup>
      </div>
    ),
  };

  const showForm = !isReprompt || showUpdateForm;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(5,7,12,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'var(--elevation-3, #1e2136)',
        color: 'var(--fg, #E6E6F0)',
        borderRadius: 'var(--radius-xl, 16px)',
        maxWidth: 520, width: '100%',
        padding: 28,
        border: '1px solid rgba(0,212,224,0.20)',
        boxShadow: 'var(--shadow-modal, 0 20px 60px rgba(0,0,0,0.60))',
        marginTop: 24, marginBottom: 24,
      }}>

        {/* Title + subtitle */}
        <h2 id="profile-setup-title" style={{ fontSize: '1.18rem', marginTop: 0, marginBottom: 6, fontWeight: 700 }}>
          {isReprompt ? 'Is your profile still accurate?' : 'Personalize your audit'}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
          {isReprompt
            ? 'Refresh personalization every 90 days. Confirm or update so your audit stays calibrated.'
            : 'These answers shape action ranking, runway math, and exit timing. Stored privately on your account.'}
        </p>

        {/* ── Reprompt confirm block ── */}
        {isReprompt && !showUpdateForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(0,212,224,0.05)',
              border: '1px solid rgba(0,212,224,0.15)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16, fontSize: '0.875rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Salary band</div>
                <div style={{ fontWeight: 600 }}>{userProfile?.salaryBand ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Visa</div>
                <div style={{ fontWeight: 600 }}>{userProfile?.visaStatus ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Metro</div>
                <div style={{ fontWeight: 600 }}>{userProfile?.metro ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginBottom: 2 }}>Tenure</div>
                <div style={{ fontWeight: 600 }}>
                  {userProfile?.tenureYears != null ? `${userProfile.tenureYears} yrs` : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleConfirmExisting}
                disabled={submitting}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 8,
                  background: 'var(--cyan, #00d4e0)', color: '#000',
                  border: 'none', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {submitting ? 'Confirming…' : '✓ Still accurate'}
              </button>
              <button
                type="button"
                onClick={() => { setShowUpdateForm(true); setStep(0); }}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  background: 'transparent', color: 'var(--fg, #E6E6F0)',
                  border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Update
              </button>
            </div>
          </motion.div>
        )}

        {/* ── 4-step wizard ── */}
        {showForm && (
          <>
            {/* Progress indicator */}
            <StepIndicator step={step} />

            {/* Step heading */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--cyan, #00d4e0)',
              }}>
                Step {step + 1} of {TOTAL_STEPS}
              </span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                {STEP_TITLES[step]}
              </h3>
            </div>

            {/* Animated step content */}
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

            {/* Step navigation */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    padding: '10px 16px', borderRadius: 8,
                    background: 'transparent', color: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: 500,
                  }}
                >
                  ← Back
                </button>
              )}

              <div style={{ flex: 1 }} />

              {step === 0 && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'transparent', color: 'rgba(255,255,255,0.35)',
                    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                  }}
                >
                  Skip for now
                </button>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  style={{
                    padding: '10px 22px', borderRadius: 8,
                    background: 'var(--cyan, #00d4e0)', color: '#000',
                    border: 'none', fontWeight: 700, cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '10px 22px', borderRadius: 8,
                    background: 'var(--cyan, #00d4e0)', color: '#000',
                    border: 'none', fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {submitting ? 'Saving…' : 'Save profile'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Reprompt dismiss */}
        {isReprompt && !showUpdateForm && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              display: 'block', width: '100%', marginTop: 10, padding: '8px',
              background: 'transparent', color: 'rgba(255,255,255,0.30)',
              border: 'none', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'center',
            }}
          >
            Remind me later
          </button>
        )}
      </div>
    </div>
  );
}
