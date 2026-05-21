// FinancialContextInput.tsx — v21.0
// Multi-currency financial context intake.
// Supports 12 ISO 4217 currencies. MENA users get gratuity fields.
// Data stored in localStorage ONLY — never transmitted.

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Wallet, ChevronDown, ChevronUp, Lock, CheckCircle,
} from "lucide-react";
import {
  saveFinancialContext,
  deriveFinancialProfile,
  normaliseCityKey,
  type FinancialContext,
  type FinancialProfile,
} from "../services/financialContextService";
import { CURRENCY_META } from "../services/currencyService";

// Supported currencies exposed in the selector (spec-listed + common MENA)
const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'QAR', label: 'QAR — Qatari Riyal' },
  { code: 'PHP', label: 'PHP — Philippine Peso (₱)' },
  { code: 'BRL', label: 'BRL — Brazilian Real (R$)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'MXN', label: 'MXN — Mexican Peso (MX$)' },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { code: 'BHD', label: 'BHD — Bahraini Dinar' },
  { code: 'OMR', label: 'OMR — Omani Rial' },
];

// MENA currencies that trigger gratuity fields
const MENA_CURRENCY_CODES = new Set(['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR']);

// Default country code per MENA currency (user can override via dropdown)
const MENA_CURRENCY_TO_COUNTRY: Record<string, string> = {
  AED: 'AE', SAR: 'SA', QAR: 'QA', KWD: 'KW', BHD: 'BH', OMR: 'OM',
};

const MENA_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'QA', label: 'Qatar' },
  { code: 'KW', label: 'Kuwait' },
  { code: 'BH', label: 'Bahrain' },
  { code: 'OM', label: 'Oman' },
];

interface Props {
  riskScore: number;
  /** ISO 4217 currency code. Used as initial selection; user can override. */
  currency?: string;
  onProfileDerived?: (profile: FinancialProfile) => void;
}

const APPETITE_CONFIG = {
  conservative: { color: "var(--cyan)", label: "Conservative bridge strategy", icon: "🛡" },
  moderate: { color: "var(--amber)", label: "Moderate transition strategy", icon: "⚖" },
  aggressive: { color: "var(--emerald)", label: "Full transition strategy", icon: "⚡" },
};

export const FinancialContextInput: React.FC<Props> = ({
  riskScore,
  currency = "USD",
  onProfileDerived,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);

  // User can change currency within the form — override the prop default
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    CURRENCY_OPTIONS.find(o => o.code === currency) ? currency : 'USD'
  );

  const [expenses, setExpenses] = useState("");
  const [dependents, setDependents] = useState("0");
  const [runwayMonths, setRunwayMonths] = useState("");
  const [income, setIncome] = useState("");
  const [city, setCity] = useState("");

  // MENA gratuity fields — only shown when selectedCurrency is a MENA currency
  const isMena = MENA_CURRENCY_CODES.has(selectedCurrency);
  const [countryCode, setCountryCode] = useState<string>(
    MENA_CURRENCY_TO_COUNTRY[currency] ?? ''
  );
  const [tenureYears, setTenureYears] = useState("");

  // Auto-update countryCode when MENA currency changes
  const handleCurrencyChange = (code: string) => {
    setSelectedCurrency(code);
    if (MENA_CURRENCY_CODES.has(code) && MENA_CURRENCY_TO_COUNTRY[code]) {
      setCountryCode(MENA_CURRENCY_TO_COUNTRY[code]);
    }
  };

  const handleSave = () => {
    const normCity = normaliseCityKey(city.trim() || null);
    const ctx: FinancialContext = {
      monthlyExpenses: expenses ? parseInt(expenses.replace(/[^0-9]/g, ""), 10) : null,
      dependents: parseInt(dependents, 10) || 0,
      emergencyFundMonths: runwayMonths ? parseFloat(runwayMonths) : null,
      currentAnnualIncome: income ? parseInt(income.replace(/[^0-9]/g, ""), 10) : null,
      currency: selectedCurrency,
      capturedAt: Date.now(),
      city: normCity ?? undefined,
      // MENA gratuity fields — included for all users; computeGratuity returns null for non-MENA
      countryCode: isMena && countryCode ? countryCode : undefined,
      tenureYears: isMena && tenureYears ? parseFloat(tenureYears) : undefined,
    };
    saveFinancialContext(ctx);
    const derived = deriveFinancialProfile(ctx, riskScore);
    setProfile(derived);
    setSaved(true);
    onProfileDerived?.(derived);
  };

  const currMeta = CURRENCY_META[selectedCurrency] ?? CURRENCY_META['USD'];
  const currSymbol = currMeta.symbol;

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header — collapsible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
          <Wallet className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">Financial Context — Personalizes Your Strategy</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {saved && profile
              ? `Strategy: ${APPETITE_CONFIG[profile.riskAppetite].label}`
              : "Optional · Stored locally only · Significantly improves advice accuracy"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5">
              {/* Privacy notice */}
              <div className="flex items-center gap-2 py-3 mb-4 text-[10px] text-muted-foreground">
                <Lock className="w-3 h-3 flex-shrink-0" />
                This data is stored only in your browser. It is never sent to any server. You can clear it at any time.
              </div>

              {/* Currency selector — top of form */}
              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Currency
                </label>
                <select
                  title="Currency"
                  value={selectedCurrency}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
                >
                  {CURRENCY_OPTIONS.map(o => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Monthly expenses */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Monthly Expenses (approx.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currSymbol}</span>
                    <input
                      type="text"
                      placeholder={`e.g. ${Math.round(3_000 * currMeta.unitsPerUsd).toLocaleString()}`}
                      value={expenses}
                      onChange={e => setExpenses(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                    />
                  </div>
                </div>

                {/* Emergency fund runway */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Emergency Fund (months of expenses)
                  </label>
                  <input
                    type="number"
                    min="0" max="36" step="0.5"
                    placeholder="e.g. 3.5"
                    value={runwayMonths}
                    onChange={e => setRunwayMonths(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                  />
                </div>

                {/* Dependents */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Financial Dependents
                  </label>
                  <select
                    title="Financial Dependents"
                    value={dependents}
                    onChange={e => setDependents(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="0">None</option>
                    <option value="1">1 (spouse or parent)</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                {/* Annual income */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Current Annual Income (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currSymbol}</span>
                    <input
                      type="text"
                      placeholder={`e.g. ${Math.round(80_000 * currMeta.unitsPerUsd).toLocaleString()}`}
                      value={income}
                      onChange={e => setIncome(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                    />
                  </div>
                </div>

                {/* City — unlocks named-employer recommendations for all users */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Your City (optional — names local employers in your action plan)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. London, Singapore, Dubai, Bangalore, Manila"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    When provided, your action plan names specific companies hiring in your city.
                  </p>
                </div>
              </div>

              {/* MENA gratuity fields — only shown for MENA currencies */}
              {isMena && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300">
                      End-of-Service Gratuity — adds to your effective runway
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/70 mb-3 leading-relaxed">
                    GCC law mandates a lump-sum gratuity on termination. A 7-year UAE employee adds ~5.5 months of
                    salary to their runway — this shifts urgency classification from CRITICAL to MODERATE.
                    Formula: 21 days/yr × first 5 years + 30 days/yr thereafter.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                        Country of Employment
                      </label>
                      <select
                        title="Country of Employment"
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none"
                      >
                        <option value="">Select country</option>
                        {MENA_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                        Years at Current Employer
                      </label>
                      <input
                        type="number"
                        min="0" max="40" step="0.5"
                        placeholder="e.g. 7"
                        value={tenureYears}
                        onChange={e => setTenureYears(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-emerald-200/50 mt-2">
                    MEASURED — statutory formula (not an estimate). Individual entitlement varies by contract type
                    and termination reason. Verify with your HR or a labour law specialist.
                  </p>
                </motion.div>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "var(--cyan)", color: "#000" }}
              >
                Personalise My Strategy
              </button>

              {/* Profile result */}
              {saved && profile && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border p-4"
                  style={{
                    borderColor: `${APPETITE_CONFIG[profile.riskAppetite].color}30`,
                    background: `${APPETITE_CONFIG[profile.riskAppetite].color}08`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{APPETITE_CONFIG[profile.riskAppetite].icon}</span>
                    <div>
                      <div className="text-sm font-black mb-1" style={{ color: APPETITE_CONFIG[profile.riskAppetite].color }}>
                        {profile.advice.headline}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {profile.advice.strategy}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="font-bold text-emerald-400 mb-0.5">DO NOW</div>
                          <div className="text-muted-foreground leading-relaxed">{profile.advice.doNow}</div>
                        </div>
                        <div>
                          <div className="font-bold text-red-400 mb-0.5">AVOID</div>
                          <div className="text-muted-foreground leading-relaxed">{profile.advice.avoid}</div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-muted-foreground">
                        Effective runway:{' '}
                        <strong className="text-white">{profile.emergencyRunway}</strong>
                        {profile.gratuityMonths > 0 && (
                          <span className="text-emerald-400 ml-1">
                            (+{profile.gratuityMonths.toFixed(1)} mo gratuity)
                          </span>
                        )}
                        {' · '}
                        Transition budget: <strong>{profile.transitionBudgetRange}</strong>
                      </div>
                      {profile.gratuityDisclosure && (
                        <div className="mt-1 pt-1 border-t border-white/5 text-[9px] text-emerald-300/70 leading-relaxed">
                          {profile.gratuityDisclosure}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancialContextInput;
