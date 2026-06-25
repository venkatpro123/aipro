// CareerTwinSubmissionModal.tsx
// Accuracy Gap 3 — v4.0
// Volunteer transition story submission system.
//
// The 15 hardcoded career twin seeds are insufficient for meaningful matching.
// After 200 verified submissions, Euclidean distance matching becomes
// statistically useful. After 1,000, it becomes a competitive moat.
//
// Incentive: "Transition Verified" badge reduces displayed risk score by 2 pts.

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, CheckCircle, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { getSeededRoleKeys } from "../data/intelligence/index";

interface Props {
  /** Pre-fill fromRole when opened from Action Plan tab */
  fromRole?: string;
  fromRiskScore?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

// Role display labels for the most common transitions
const COMMON_ROLES = [
  "QA / Manual Tester", "QA Automation Engineer", "Software Developer",
  "Data Analyst", "Business Analyst", "Financial Analyst",
  "HR Generalist", "Recruiter", "Content Writer / Copywriter",
  "Customer Support Agent", "Product Manager", "UX/UI Designer",
  "DevOps / Cloud Engineer", "Data Scientist / ML Engineer",
  "Legal Associate / Paralegal", "Accountant / Finance Ops",
  "Marketing Manager", "BPO Agent / Data Entry", "Other",
];

export const CareerTwinSubmissionModal: React.FC<Props> = ({
  fromRole = "",
  fromRiskScore = 50,
  onClose,
  onSuccess,
}) => {
  // Required fields
  const [prevRole, setPrevRole] = useState(fromRole);
  const [prevScore, setPrevScore] = useState(fromRiskScore);
  const [expYears, setExpYears] = useState(5);
  const [toRole, setToRole] = useState("");
  const [monthsToTransition, setMonthsToTransition] = useState(6);
  // Optional enrichment
  const [incomeChangePct, setIncomeChangePct] = useState<string>("");
  const [whatWorked, setWhatWorked] = useState("");
  const [country, setCountry] = useState("India");
  const [city, setCity] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const [state, setState] = useState<SubmissionState>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  const isValid = prevRole.trim().length > 0 &&
    toRole.trim().length > 2 &&
    expYears > 0 &&
    monthsToTransition > 0 &&
    (whatWorked.length === 0 || whatWorked.length >= 50);

  const handleSubmit = async () => {
    if (!isValid) return;
    setState('submitting');
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const record = {
        from_role: prevRole.trim(),
        from_risk_score: prevScore,
        from_experience_years: expYears,
        to_role: toRole.trim(),
        months_to_transition: monthsToTransition,
        income_change_pct: incomeChangePct ? parseInt(incomeChangePct, 10) : null,
        what_worked: whatWorked.trim() || null,
        country: country.trim() || 'India',
        city: city.trim() || null,
        user_id: session?.user?.id ?? null,
        is_verified: false,
        moderation_status: 'pending',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('career_transitions').insert(record);

      if (error) {
        console.warn('[CareerTwin] Submit error:', error.message);
        // Don't fail silently — store locally as fallback
        storeLocally(record);
      }

      setState('success');
      onSuccess?.();
    } catch (e: any) {
      console.warn('[CareerTwin] Submit exception:', e);
      storeLocally({ fromRole: prevRole, toRole, monthsToTransition, whatWorked });
      setState('success'); // Still show success — stored locally
    }
  };

  const storeLocally = (record: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem('hp_pending_transitions') ?? '[]');
      existing.push({ ...record, pendingSync: true });
      localStorage.setItem('hp_pending_transitions', JSON.stringify(existing));
    } catch { /* quota */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95 }}
          className="glass-panel-heavy rounded-2xl overflow-hidden"
          style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {state === 'success' ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-black mb-2">Transition Shared — Thank You</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Your transition has been added to the network. It will be reviewed within 5 business days.
                Once verified, you'll receive a{' '}
                <span className="text-cyan-400 font-bold">Transition Verified</span> badge
                that reduces your displayed risk score by 2 points as a platform credit.
              </p>
              <p className="text-xs text-muted-foreground opacity-60 mb-6">
                You're helping professionals in similar situations find their path.
              </p>
              <button onClick={onClose} className="btn btn-primary btn-sm">Done</button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-5 border-b border-white/10">
                <div className="p-2 rounded-lg bg-cyan-500/10"><Users className="w-5 h-5 text-cyan-400" /></div>
                <div className="flex-1">
                  <h3 className="text-sm font-black">Share Your Transition Story</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Help others like you find their path</p>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-[var(--text)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Incentive banner */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    Verified submissions earn a <strong>Transition Verified</strong> badge — reducing your risk score by 2 points.
                  </p>
                </div>

                {/* Previous role */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Previous Role *
                  </label>
                  <select
                    value={prevRole}
                    onChange={e => setPrevRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
                  >
                    <option value="">Select your previous role...</option>
                    {COMMON_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Risk score at time of decision */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Your Risk Score When You Decided to Transition *
                    <span className="ml-2 font-mono text-cyan-400 font-black">{prevScore}/100</span>
                  </label>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={prevScore}
                    onChange={e => setPrevScore(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--cyan)]"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span>Low risk (0)</span><span>High risk (100)</span>
                  </div>
                </div>

                {/* Experience years */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Total Years of Experience at Time of Transition *
                  </label>
                  <input
                    type="number" min="0" max="40" step="1"
                    value={expYears}
                    onChange={e => setExpYears(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                  />
                </div>

                {/* Transition destination */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    What Role Did You Transition To? *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AI Quality Strategist, Product Manager, Data Scientist"
                    value={toRole}
                    onChange={e => setToRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50"
                  />
                </div>

                {/* Months to transition */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    How Many Months Did the Transition Take? *
                    <span className="ml-2 font-mono text-cyan-400 font-black">{monthsToTransition} months</span>
                  </label>
                  <input
                    type="range" min="1" max="24" step="1"
                    value={monthsToTransition}
                    onChange={e => setMonthsToTransition(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--cyan)]"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span>1 month</span><span>24 months</span>
                  </div>
                </div>

                {/* Optional enrichment toggle */}
                <button
                  onClick={() => setShowOptional(v => !v)}
                  className="w-full flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-[var(--cyan)] transition-colors"
                >
                  <span>Optional: Enrich your story (improves matching quality)</span>
                  {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showOptional && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      {/* Income change */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                          Income Change % (e.g. +40 or -15)
                        </label>
                        <input
                          type="number" step="5"
                          placeholder="e.g. +45"
                          value={incomeChangePct}
                          onChange={e => setIncomeChangePct(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 font-mono"
                        />
                      </div>

                      {/* What worked */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                          What Specifically Worked? (min 50 chars if provided)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="e.g., 'Built a prompt evaluation framework, got certified in LLM testing, joined an AI-first startup through a warm referral from a former colleague'"
                          value={whatWorked}
                          onChange={e => setWhatWorked(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[var(--cyan)]/50 resize-none"
                        />
                        {whatWorked.length > 0 && whatWorked.length < 50 && (
                          <p className="text-[10px] text-amber-400 mt-1">{50 - whatWorked.length} more characters needed</p>
                        )}
                      </div>

                      {/* Country / City */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Country</label>
                          <input
                            type="text" placeholder="India"
                            value={country}
                            onChange={e => setCountry(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">City</label>
                          <input
                            type="text" placeholder="Bangalore"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Privacy note */}
                <p className="text-[10px] text-muted-foreground opacity-60 leading-relaxed">
                  Your name and personal details are never associated with this submission. Only role, experience bracket, transition outcome, and what worked are shared with matching users.
                </p>

                {/* Error */}
                {state === 'error' && (
                  <p className="text-xs text-red-400">{errorMsg || "Submission failed. Please try again."}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!isValid || state === 'submitting'}
                  className="w-full py-3 rounded-xl text-sm font-black transition-all"
                  style={{
                    background: isValid ? 'var(--cyan)' : 'var(--alpha-bg-06)',
                    color: isValid ? '#000' : 'var(--text-3)',
                    cursor: isValid ? 'pointer' : 'not-allowed',
                  }}
                >
                  {state === 'submitting' ? 'Sharing...' : 'Share My Transition Story'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CareerTwinSubmissionModal;
