// PeerSurvivalCard — Peer comparison using score-anchored computed peers (Phase 8).
// Computed peers are derived from the user's actual D1–D6 score, not static lookup.
// Static role-family peers shown as secondary reference below.

import React from 'react';
import { getMarketPositioning, computePeerSurvival } from '../../data/peerComparisonMap';
import type { ScoreResult } from '../../data/riskFormula';

interface Props {
  roleKey: string;
  roleLabel: string;
  survivalPct: number;
  result?: ScoreResult | null;
  countryKey?: string;
  experience?: string;
  riskScore?: number;  // for computed peer mode
}

const TREND_SYMBOLS = { up: '↑', stable: '→', down: '↓' };
const TREND_COLORS  = { up: 'var(--emerald)', stable: 'var(--cyan)', down: 'var(--red)' };

function barColor(pct: number): string {
  if (pct >= 70) return 'var(--emerald)';
  if (pct >= 50) return 'var(--cyan)';
  if (pct >= 35) return 'var(--amber)';
  return 'var(--red)';
}

function positioningReason(survivalPct: number, result: ScoreResult | null | undefined): string {
  const d1 = result?.dimensions.find(d => d.key === 'D1')?.score ?? 50;
  const d4 = result?.dimensions.find(d => d.key === 'D4')?.score ?? 50;
  if (d1 < 35 && d4 < 40) return 'Low automation exposure plus strong experience shield places you above most peers.';
  if (d1 >= 65) return 'High task overlap with AI tools is the primary factor pulling your ranking down.';
  if (d4 >= 60) return 'Your experience provides a meaningful protection buffer that peers with fewer years lack.';
  if (survivalPct >= 75) return 'Your role has strong structural protection vs the average for this peer group.';
  return 'Moderate automation exposure with solid experience keeps you in the upper half of your peer group.';
}

export const PeerSurvivalCard: React.FC<Props> = ({
  roleKey, roleLabel, survivalPct, result, countryKey = 'Global', experience = '5-10', riskScore,
}) => {
  // Phase 8: Use computed peers anchored to actual risk score
  const computedPeers = computePeerSurvival(roleKey, roleLabel, riskScore ?? 50, experience);
  const positioning   = getMarketPositioning(survivalPct, roleLabel, countryKey, experience);

  const userIdx     = computedPeers.findIndex(p => p.isUser);
  const userRank    = userIdx >= 0 ? userIdx + 1 : null;
  const totalPeers  = computedPeers.length;
  const saferAbove  = userIdx > 0 ? computedPeers.slice(0, userIdx).map(p => p.role) : [];
  const exposedBelow= userIdx >= 0 && userIdx < computedPeers.length - 1 ? computedPeers.slice(userIdx + 1).map(p => p.role) : [];

  const reason = positioningReason(survivalPct, result);

  return (
    <div style={{
      marginTop: '14px',
      padding: '16px 18px',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-3)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '12px',
      }}>
        PEOPLE LIKE YOU — CAREER SURVIVAL COMPARISON
      </div>

      {/* Rank callout */}
      {userRank !== null && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: `${barColor(survivalPct)}08`, border: `1px solid ${barColor(survivalPct)}25` }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 900, color: barColor(survivalPct), fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
            YOUR POSITION — Rank #{userRank} of {totalPeers}
          </div>
          {saferAbove.length > 0 && (
            <div style={{ fontSize: '0.62rem', color: 'var(--emerald)', marginBottom: '2px' }}>
              Better positioned above: {saferAbove.join(', ')}
            </div>
          )}
          {exposedBelow.length > 0 && (
            <div style={{ fontSize: '0.62rem', color: 'var(--amber)', marginBottom: '4px' }}>
              More exposed below: {exposedBelow.join(', ')}
            </div>
          )}
          <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
            Why: {reason}
          </div>
        </div>
      )}

      {/* Computed peer rows — with reason on expand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {computedPeers.map((p) => (
          <div key={p.role} style={{
            borderRadius: p.isUser ? '8px' : '6px',
            padding: p.isUser ? '10px 12px' : '6px 8px',
            background: p.isUser ? `${barColor(p.survival)}10` : 'rgba(255,255,255,0.01)',
            border: p.isUser ? `1px solid ${barColor(p.survival)}30` : '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: p.isUser ? 800 : 600,
                color: p.isUser ? barColor(p.survival) : 'var(--text-2)',
              }}>
                {p.role}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: barColor(p.survival), fontFamily: 'var(--font-mono)', minWidth: '38px', textAlign: 'right' }}>
                {p.survival}%
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: TREND_COLORS[p.trend], minWidth: '14px', textAlign: 'center' }}>
                {TREND_SYMBOLS[p.trend]}
              </div>
            </div>
            <div style={{ height: '3px', borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '5px' }}>
              <div style={{ height: '100%', width: `${p.survival}%`, background: barColor(p.survival), borderRadius: 2, transition: 'width 0.6s ease' }} />
            </div>
            {/* WHY sentence for each peer */}
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.45, fontStyle: p.isUser ? 'normal' : 'italic' }}>
              {p.reason}
            </div>
          </div>
        ))}
      </div>

      {/* Market positioning strip */}
      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '0.56rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          YOUR MARKET POSITION VS PEERS
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px', fontStyle: 'italic' }}>
          {positioning.populationContext}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', marginBottom: '8px' }}>
          {([
            { label: 'Protection Rank',   val: positioning.protectionRank },
            { label: 'Demand Rank',       val: positioning.demandRank },
            { label: 'Adaptability Rank', val: positioning.adaptabilityRank },
            { label: 'Future Readiness',  val: positioning.futureReadinessRank },
          ] as const).map(({ label, val }) => (
            <div key={label} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px', letterSpacing: '0.06em' }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Positioning reason sentence */}
        <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5, fontStyle: 'italic' }}>
          {positioning.positioningReason}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '0.58rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
        Peer comparisons are computed from your risk score — not industry averages. Each peer profile represents a distinct upskilling or experience scenario applied to your role.
      </div>
    </div>
  );
};
