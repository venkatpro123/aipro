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
    return 'High risk detected — this is exactly what this platform was built for. Start with the Act Now tab.';
  }
  if (isHigh) {
    return 'Your situation is serious. The right actions over the next 30 days significantly reduce this.';
  }
  if (isModerate) {
    return 'Moderate risk. The right moves now can significantly lower your exposure before signals worsen.';
  }
  return "You're in a good position. Use this time to build leverage and monitor signals early.";
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
