// CareerProgressNarrative.tsx — "You've run N audits over X months" progress story
import type { CareerMemorySummary } from '../../services/careerMemoryService';

interface Props {
  summary: CareerMemorySummary;
}

function buildNarrative(summary: CareerMemorySummary): string {
  const { auditCount, firstAuditDate, actionsCompleted, scoreDelta, currentScore, scoreAtFirstAudit } = summary;

  const parts: string[] = [];

  // Audit history sentence
  if (auditCount > 0 && firstAuditDate) {
    const monthsAgo = Math.max(1, Math.round(
      (Date.now() - new Date(firstAuditDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    const auditStr = auditCount === 1 ? '1 audit' : `${auditCount} audits`;
    const monthStr = monthsAgo === 1 ? '1 month' : `${monthsAgo} months`;
    parts.push(`You've run ${auditStr} over ${monthStr}.`);
  }

  // Score change sentence
  if (scoreDelta !== null && scoreAtFirstAudit !== null && currentScore !== null && Math.abs(scoreDelta) >= 1) {
    const improved = scoreDelta < 0;
    const pts = Math.abs(Math.round(scoreDelta));
    if (improved) {
      parts.push(`Your risk dropped from ${Math.round(scoreAtFirstAudit)} → ${Math.round(currentScore)} — a ${pts}-point improvement.`);
    } else {
      parts.push(`Your risk has risen ${pts} points since ${Math.round(scoreAtFirstAudit)} — worth addressing.`);
    }
  }

  // Action completion sentence
  if (actionsCompleted > 0) {
    const actionStr = actionsCompleted === 1 ? '1 action' : `${actionsCompleted} actions`;
    parts.push(`${actionStr} completed.`);
  }

  return parts.join(' ');
}

export function CareerProgressNarrative({ summary }: Props) {
  const narrative = buildNarrative(summary);
  if (!narrative) return null;

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 8,
      background: 'rgba(0,245,255,0.04)',
      border: '1px solid rgba(0,245,255,0.1)',
      fontSize: '0.8rem',
      color: 'rgba(255,255,255,0.55)',
      lineHeight: 1.6,
      fontStyle: 'italic',
    }}>
      {narrative}
    </div>
  );
}
