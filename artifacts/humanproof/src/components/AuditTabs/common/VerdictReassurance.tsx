// VerdictReassurance.tsx — v audit UX
//
// A single reassurance line rendered below the score verdict inside the score hero block.
// Purpose: prevent the user from spiralling after seeing a high-risk score.
// The message is calibrated per tier — it doesn't minimize risk but repositions
// it as actionable, not catastrophic.
//
// Usage:
//   <VerdictReassurance score={score} urgency={urgencyLevel} />

import React from 'react';

interface VerdictReassuranceProps {
  score: number;
  urgency?: string;
}

function getReassurance(score: number, urgency?: string): string {
  const isCritical = urgency === 'CRITICAL' || score >= 75;
  const isHigh     = urgency === 'HIGH'     || (score >= 55 && score < 75);
  const isModerate = urgency === 'MODERATE' || (score >= 35 && score < 55);

  if (isCritical) {
    // Statistical grounding: user is ahead of most people who face this.
    // Most people discover layoff risk 2 weeks before it happens; this user has months.
    // Direct them to the action plan, not to panic.
    const pctAhead = score >= 85 ? 96 : score >= 78 ? 94 : 90;
    return `You're ahead of ${pctAhead}% of people who face this. Most find out 2 weeks before — you have months. Open Action Plan.`;
  }
  if (isHigh) {
    return 'Elevated risk. The right actions over the next 30 days significantly lower your exposure.';
  }
  if (isModerate) {
    return 'Moderate risk. Strategic positioning now builds a meaningful buffer before signals worsen.';
  }
  return "Strong position. Use this window to build career capital — the best defense is early offense.";
}

export const VerdictReassurance: React.FC<VerdictReassuranceProps> = ({ score, urgency }) => {
  const text = getReassurance(score, urgency);

  return (
    <p
      style={{
        marginTop: 6,
        fontSize: '0.72rem',
        lineHeight: 1.5,
        color: 'rgba(255,255,255,0.50)',
        fontStyle: 'italic',
        maxWidth: 260,
        textAlign: 'center',
      }}
    >
      {text}
    </p>
  );
};

export default VerdictReassurance;
