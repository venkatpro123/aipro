// FinancialContextInput.tsx
// Optional deep-context form: emergency fund, dependents, monthly expenses.
// These three numbers change what advice is appropriate — giving the same
// advice to a person with ₹2L savings vs ₹20L savings is potentially harmful.
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

interface Props {
  riskScore: number;
  currency?: "INR" | "USD";
  onProfileDerived?: (profile: FinancialProfile) => void;
}

const APPETITE_CONFIG = {
  conservative: { color: "var(--cyan)", label: "Conservative bridge strategy", icon: "🛡" },
  moderate: { color: "var(--amber)", label: "Moderate transition strategy", icon: "⚖" },
  aggressive: { color: "var(--emerald)", label: "Full transition strategy", icon: "⚡" },
};

export const FinancialContextInput: React.FC<Props> = ({
  riskScore,
  currency = "INR",
  onProfileDerived,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);

  const [expenses, setExpenses] = useState("");
  const [dependents, setDependents] = useState("0");
  const [runwayMonths, setRunwayMonths] = useState("");
  const [income, setIncome] = useState("");
  const [city, setCity] = useState("");

  const handleSave = () => {
    const normCity = normaliseCityKey(city.trim() || null);
    const ctx: FinancialContext = {
      monthlyExpenses: expenses ? parseInt(expenses.replace(/[^0-9]/g, ""), 10) : null,
      dependents: parseInt(dependents, 10) || 0,
      emergencyFundMonths: runwayMonths ? parseFloat(runwayMonths) : null,
      currentAnnualIncome: income ? parseInt(income.replace(/[^0-9]/g, ""), 10) : null,
      currency,
      capturedAt: Date.now(),
      city: normCity ?? undefined,
    };
    saveFinancialContext(ctx);
    const derived = deriveFinancialProfile(ctx, riskScore);
    setProfile(derived);
    setSaved(true);
    onProfileDerived?.(derived);
  };

  const currSymbol = currency === "INR" ? "₹" : "$";

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header — collapsible */}
      <button
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
                      placeholder={currency === "INR" ? "e.g. 50000" : "e.g. 3000"}
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
                      placeholder={currency === "INR" ? "e.g. 1200000" : "e.g. 80000"}
                      value={income}
                      onChange={e => setIncome(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                    />
                  </div>
                </div>

                {/* City — unlocks named-employer recommendations */}
                {currency === "INR" && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Your City (optional — names local employers in your action plan)
                    </label>
                    <input
                      type="text"
                      list="city-suggestions"
                      placeholder="e.g. Bangalore, Mumbai, Hyderabad, Pune"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
                    />
                    <datalist id="city-suggestions">
                      {['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi NCR', 'Kolkata', 'Noida', 'Gurgaon', 'Ahmedabad', 'Kochi', 'Indore', 'Coimbatore'].map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      When provided, your action plan names specific companies hiring in your city — not just "the market."
                    </p>
                  </div>
                )}
              </div>

              <button
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
                        Emergency runway: <strong>{profile.emergencyRunway}</strong>{" · "}
                        Transition budget: <strong>{profile.transitionBudgetRange}</strong>
                      </div>
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
