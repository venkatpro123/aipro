// CareerGraphInsights — Rule 9 (Career Graph v1) + Rule 18 (Cohort Benchmarks, Phase 5)
// Shows 3–5 outcome insights from users with a matching profile.
// N≥5 minimum before surfacing any insight. Source label on every row.
// Primary source: career_graph_insights (EF-computed). Fallback: cohort_outcome_cache.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { supabase } from '../../utils/supabase';
import { tenureBandFromYears } from '../../services/cohortOutcomesAggregator';
import type { HybridResult } from '../../types/hybridResult';
import type { UserProfile } from '../../services/userProfileService';
import { DataSourceLabel } from '../shared/DataSourceLabel';

interface Props {
  userProfile: UserProfile | null;
}

interface GraphInsight {
  id: string;
  headline: string;
  subtext: string;
  sampleSize: number;
  gainPts: number;    // avg readiness pts gained (positive = improvement)
  confidence: 'high' | 'medium';
}

const MIN_N = 5;

async function loadFromGraphTable(roleKey: string): Promise<GraphInsight[]> {
  const { data } = await supabase
    .from('career_graph_insights')
    .select('id, role_key, action_id, outcome_type, avg_outcome_value, sample_count, confidence')
    .eq('role_key', roleKey)
    .gte('sample_count', MIN_N)
    .order('sample_count', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return [];

  return data.map(row => ({
    id: row.id,
    headline: `${row.sample_count} ${roleKey} professionals who completed "${row.action_id}" saw avg ${row.avg_outcome_value > 0 ? '+' : ''}${Math.round(row.avg_outcome_value)} pts readiness`,
    subtext: `${row.outcome_type.replace(/_/g, ' ')} · avg outcome value ${Math.round(row.avg_outcome_value)}`,
    sampleSize: row.sample_count,
    gainPts: Math.round(row.avg_outcome_value ?? 0),
    confidence: row.sample_count >= 10 ? 'high' : 'medium',
  }));
}

async function loadFromCohortCache(
  roleKey: string,
  tenureBand: ReturnType<typeof tenureBandFromYears>,
  actionIds: string[],
): Promise<GraphInsight[]> {
  // Single batched query instead of per-action round-trips
  const { data } = await supabase
    .from('cohort_outcome_cache')
    .select('action_id, avg_risk_reduction, completion_count')
    .eq('role_key', roleKey)
    .eq('tenure_band', tenureBand)
    .in('action_id', actionIds.slice(0, 6))
    .gte('completion_count', MIN_N);

  if (!data || data.length === 0) return [];

  return (data as Array<Record<string, unknown>>)
    .map((row, i) => ({
      id: `cohort-${i}`,
      headline: `${row.completion_count} professionals with your profile tried "${(row.action_id as string).replace(/_/g, ' ')}"`,
      subtext: `avg +${Math.round(row.avg_risk_reduction as number)} readiness pts gained`,
      sampleSize: row.completion_count as number,
      gainPts: Math.round(row.avg_risk_reduction as number),
      confidence: ((row.completion_count as number) >= 10 ? 'high' : 'medium') as 'high' | 'medium',
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({ insight, index }: { insight: GraphInsight; index: number }) {
  const color = insight.gainPts > 5 ? '#10b981' : insight.gainPts > 0 ? 'var(--cyan)' : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      {/* Gain badge */}
      <div style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: 8,
        background: `${color}10`, border: `1px solid ${color}25`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <TrendingUp size={11} color={color} />
        <span style={{ fontSize: '0.62rem', fontWeight: 800, color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
          {insight.gainPts > 0 ? `+${insight.gainPts}` : insight.gainPts}
        </span>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>
          {insight.headline}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={9} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>
              N={insight.sampleSize}
            </span>
          </div>
          <DataSourceLabel
            tier={insight.confidence === 'high' ? 'MEASURED' : 'MODELED'}
            sourceName="Cohort data"
            sampleSize={insight.sampleSize}
            compact
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CareerGraphInsights({ userProfile }: Props) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [insights, setInsights] = useState<GraphInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const hr = state.scoreResult as HybridResult | null;

  useEffect(() => {
    if (!user || !hr) return;

    const roleKey = (hr as any)?.roleKey ?? (hr as any)?.role ?? 'unknown';
    const tenureBand = tenureBandFromYears(userProfile?.yearsExperience ?? 5);
    const actionIds = (hr.actionItems ?? []).slice(0, 6).map(a => a.id ?? a.title ?? '').filter(Boolean);

    setLoading(true);

    loadFromGraphTable(roleKey)
      .then(async (graphRows) => {
        if (graphRows.length >= 2) return graphRows;
        // Fallback to cohort_outcome_cache when graph table is sparse
        return loadFromCohortCache(roleKey, tenureBand, actionIds);
      })
      .then(rows => {
        setInsights(rows.filter(r => r.gainPts > 0 && r.sampleSize >= MIN_N));
      })
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hr, userProfile?.yearsExperience]);

  if (!hr) return null;
  if (loading) return null;
  if (insights.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={12} color="var(--cyan)" />
        <span style={{
          fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)',
          letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)',
        }}>
          CAREER GRAPH INSIGHTS
        </span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
          · based on users with your profile
        </span>
      </div>

      {/* Insight cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {insights.slice(0, 4).map((insight, i) => (
          <InsightCard key={insight.id} insight={insight} index={i} />
        ))}
      </div>

      {/* Footer disclaimer */}
      <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
        Outcomes sourced from users with similar role · tenure · industry. Min N={MIN_N} per insight. Correlation, not causation.
      </div>
    </div>
  );
}
