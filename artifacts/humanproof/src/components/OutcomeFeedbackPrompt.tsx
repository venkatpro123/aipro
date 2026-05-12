import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { recordOutcome } from '../services/swarm/swarmLearningStore';
import {
  fetchDuePrompts,
  recordOutcomeForLatestAudit,
  type DuePrompt,
  type OutcomeLabel,
} from '../services/outcomeService';

interface Props {
  /** Legacy props from AuditDashboardLayout — kept for backward compatibility. */
  companyRoleKey?: string;
  predictionDate?: string;
}

const OUTCOME_OPTIONS: Array<{ label: OutcomeLabel; display: string; swarmValue: number }> = [
  { label: 'layoff_occurred',   display: 'Got laid off',       swarmValue: 100 },
  { label: 'voluntarily_left',  display: 'Left voluntarily',   swarmValue: 0   },
  { label: 'no_layoff',         display: 'Still here — no cuts', swarmValue: 0  },
  { label: 'other',             display: 'Something else',     swarmValue: 50  },
];

export const OutcomeFeedbackPrompt: React.FC<Props> = ({ companyRoleKey, predictionDate }) => {
  const [duePrompt, setDuePrompt] = useState<DuePrompt | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check for outstanding due-prompts from the edge function (v15.0).
    // Falls back to showing the inline prompt if legacy props are provided.
    fetchDuePrompts().then((prompts) => {
      if (prompts.length > 0) {
        setDuePrompt(prompts[0]);
        setIsVisible(true);
      } else if (companyRoleKey && predictionDate) {
        // Legacy path: show the simple inline prompt after 24h.
        const age = Date.now() - new Date(predictionDate).getTime();
        if (age > 86_400_000) setIsVisible(true);
      }
    });
  }, [companyRoleKey, predictionDate]);

  const handleOutcome = async (option: typeof OUTCOME_OPTIONS[number]) => {
    // Write to both tables: user_prediction_outcomes (personalized) and
    // prediction_outcomes (swarm training). Failures are silently swallowed.
    if (duePrompt) {
      await recordOutcomeForLatestAudit(option.label);
    }
    if (companyRoleKey) {
      recordOutcome(companyRoleKey, option.swarmValue);
    }
    setSubmitted(true);
    setTimeout(() => setIsVisible(false), 3000);
  };

  if (!isVisible) return null;

  const company = duePrompt?.company_name ?? 'this company';
  const role = duePrompt?.role_title ?? 'this role';
  const dateStr = duePrompt?.audit_date ?? predictionDate;
  const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : 'a previous date';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl p-4 overflow-hidden"
        role="dialog"
        aria-label="Outcome feedback"
      >
        <div className="absolute inset-0 bg-blue-500/5 rounded-xl pointer-events-none" />

        <button
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3 text-emerald-400 font-medium py-2"
          >
            <CheckCircle className="w-5 h-5" />
            <p>Thank you — outcome recorded.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 pr-6">
              <div className="p-2 bg-blue-500/10 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">What happened?</h4>
                <p className="text-xs text-neutral-400 leading-snug">
                  You ran a risk audit for <strong>{role}</strong> at{' '}
                  <strong>{company}</strong> on {formattedDate}. What actually happened?
                  Your answer improves prediction accuracy for everyone.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleOutcome(opt)}
                  className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors text-xs font-medium border border-neutral-700 hover:border-neutral-500"
                >
                  {opt.display}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
