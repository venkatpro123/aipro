import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type {
  NegotiationIntelligenceResult,
  NegotiationLeverageRating,
  NegotiationEmailScript,
  NegotiationClauseKey,
} from '../../../services/negotiationIntelligenceService';
import { NEGOTIATION_CLAUSE_LABELS } from '../../../services/negotiationIntelligenceService';
import { NegotiationIllustration } from '../../illustrations/AdditionalIllustrations';

interface Props {
  negotiation: NegotiationIntelligenceResult;
}

const RATING_CONFIG: Record<NegotiationLeverageRating, {
  bg: string; border: string; badge: string; label: string; barColor: string;
}> = {
  STRONG:   { bg: 'bg-emerald-950/25', border: 'border-emerald-500/40', badge: 'bg-emerald-500/15 text-emerald-300', label: 'Strong Leverage', barColor: 'var(--color-emerald-text)' },
  MODERATE: { bg: 'bg-blue-950/20',    border: 'border-blue-500/30',    badge: 'bg-blue-500/15 text-blue-300',    label: 'Moderate Leverage', barColor: '#3b82f6' },
  WEAK:     { bg: 'bg-amber-950/15',   border: 'border-amber-500/25',   badge: 'bg-amber-500/15 text-amber-300',  label: 'Weak Leverage',   barColor: 'var(--color-amber500-text)' },
  NONE:     { bg: '', border: '', badge: '', label: '', barColor: '' },
};

const CLAUSE_COLORS: Record<NegotiationClauseKey, string> = {
  visa_grace_period:          'bg-violet-500/12 text-violet-300 border-violet-500/25',
  family_stability:           'bg-sky-500/12 text-sky-300 border-sky-500/25',
  equity_acceleration:        'bg-amber-500/12 text-amber-300 border-amber-500/25',
  knowledge_transfer_premium: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
};

// ── CopyButton — clipboard with check confirmation ────────────────────────────

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded transition-colors"
      style={{
        background: copied ? 'rgba(16,185,129,0.12)' : 'var(--alpha-bg-06)',
        color:      copied ? '#34d399' : 'var(--alpha-text-45)',
        border:     `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'var(--alpha-bg-08)'}`,
      }}
      title="Copy email to clipboard"
    >
      {copied
        ? <><Check size={10} /> Copied</>
        : <><Copy size={10} /> Copy email</>}
    </button>
  );
};

// ── EmailScriptCard — one copy-pasteable email ────────────────────────────────

const EmailScriptCard: React.FC<{ email: NegotiationEmailScript; index: number }> = ({ email, index }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const fullText = `Subject: ${email.subject}\n\n${email.body}`;

  return (
    <div
      className="rounded-lg overflow-hidden border border-[var(--alpha-bg-08)]"
      style={{ background: 'var(--alpha-bg-04)' }}
    >
      {/* Email header row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--alpha-bg-04)] transition-colors"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex-shrink-0">
          {email.label}
        </span>

        {/* Clause badges */}
        {email.clausesInjected.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-1">
            {email.clausesInjected.map(clause => (
              <span
                key={clause}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${CLAUSE_COLORS[clause]}`}
              >
                {NEGOTIATION_CLAUSE_LABELS[clause]}
              </span>
            ))}
          </div>
        )}

        {expanded
          ? <ChevronUp size={12} className="text-muted-foreground flex-shrink-0 ml-auto" />
          : <ChevronDown size={12} className="text-muted-foreground flex-shrink-0 ml-auto" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {/* Subject line */}
              <div className="flex items-center gap-2 mb-1.5 pt-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Subject:</span>
                <span className="text-[11px] text-[var(--alpha-text-78)] font-medium">{email.subject}</span>
              </div>

              {/* Body — pre-formatted, monospace for easy scanning */}
              <pre
                className="text-[11px] leading-relaxed text-[var(--alpha-text-60)] whitespace-pre-wrap font-sans rounded-lg p-3 mb-2.5"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--alpha-bg-06)' }}
              >
                {email.body}
              </pre>

              {/* Footer: placeholder guide + copy button */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground opacity-60 leading-relaxed">
                  Substitute: <span className="font-mono text-amber-400/70">[First name]</span>,{' '}
                  <span className="font-mono text-amber-400/70">[Your name]</span>
                  {email.body.includes('[target comp]') && (
                    <>, <span className="font-mono text-amber-400/70">[target comp]</span></>
                  )}
                  {email.body.includes('[your achievement metric]') && (
                    <>, <span className="font-mono text-amber-400/70">[your achievement metric]</span></>
                  )}
                  {' '}— everything else is already filled in.
                </p>
                <CopyButton text={fullText} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

export function NegotiationIntelligencePanel({ negotiation }: Props) {
  const [showRisks, setShowRisks] = useState(false);

  if (!negotiation.shouldDisplay) return null;

  const cfg = RATING_CONFIG[negotiation.leverageRating] ?? RATING_CONFIG['WEAK'];
  const hasEmailScripts = (negotiation.emailScripts?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 mb-4 ${cfg.bg} ${cfg.border}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <NegotiationIllustration size={36} className="flex-shrink-0 opacity-80" />
        <div className="flex items-center gap-2 flex-wrap">
          <Scale size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-[var(--text)]">Negotiation Intelligence</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Leverage bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-[var(--alpha-text-45)] mb-1">
          <span>Leverage score</span>
          <span>{negotiation.leverageScore}/100</span>
        </div>
        <div className="h-1.5 bg-[var(--alpha-bg-08)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${negotiation.leverageScore}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: cfg.barColor }}
          />
        </div>
      </div>

      {/* Tactic + ask */}
      <div className="p-3 rounded-lg bg-[var(--alpha-bg-04)] mb-3">
        <div className="text-[11px] font-medium text-[var(--alpha-text-45)] mb-1">{negotiation.recommendedTactic}</div>
        <div className="text-xs text-[var(--alpha-text-78)]">{negotiation.specificAsk}</div>
      </div>

      {/* BATNA + timing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-[var(--alpha-bg-04)] border border-[var(--alpha-bg-06)]">
          <div className="text-[10px] text-[var(--alpha-text-35)] mb-0.5">Outside Option (BATNA)</div>
          <div className="text-[11px] text-[var(--alpha-text-60)]">{negotiation.batnaStrength}</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--alpha-bg-04)] border border-[var(--alpha-bg-06)]">
          <div className="text-[10px] text-[var(--alpha-text-35)] mb-0.5">Timing Window</div>
          <div className="text-[11px] text-[var(--alpha-text-60)] line-clamp-3">{negotiation.timingWindow}</div>
        </div>
      </div>

      {/* Copy-pasteable email scripts */}
      {hasEmailScripts && (
        <div className="border-t border-[var(--alpha-bg-06)] pt-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[var(--alpha-text-60)]">
              Ready-to-send email scripts
            </span>
            <span className="text-[10px] text-muted-foreground">
              — personalised, copy-paste ready
            </span>
          </div>
          <div className="space-y-2">
            {negotiation.emailScripts.map((email, i) => (
              <EmailScriptCard key={i} email={email} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Risks + red lines — collapsible */}
      {(negotiation.risksToNegotiating.length > 0 || negotiation.redLines.length > 0) && (
        <div className="border-t border-[var(--alpha-bg-06)] pt-3 mt-1">
          <button
            type="button"
            onClick={() => setShowRisks(!showRisks)}
            className="w-full flex items-center justify-between text-[11px] text-[var(--alpha-text-45)] hover:text-[var(--alpha-text-78)] transition-colors"
          >
            <span>Risks &amp; red lines</span>
            {showRisks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showRisks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1"
              >
                {negotiation.risksToNegotiating.map((risk, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px] mt-0.5">⚠</span>
                    <span className="text-[11px] text-[var(--alpha-text-60)]">{risk}</span>
                  </div>
                ))}
                {negotiation.redLines.map((line, i) => (
                  <div key={`rl-${i}`} className="flex items-start gap-1.5">
                    <span className="text-red-400 text-[10px] mt-0.5">✗</span>
                    <span className="text-[11px] text-[var(--alpha-text-60)]">{line}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
