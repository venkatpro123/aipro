import { useEffect, useMemo, useState } from 'react';
import {
  TeamSnapshot,
  TeamMember,
  RiskTier,
  createTeam,
  deleteTeam,
  getTeams,
  addMember,
  removeMember,
  computeAggregates,
} from '../services/teamDashboardService';
import { useUserPlan } from '../services/subscriptionService';
import { GateCard } from '../components/GateCard';
import { track } from '../services/analyticsService';

const TIER_LABELS: Record<RiskTier, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  safe: 'AI-resistant',
};

const TIER_COLORS: Record<RiskTier, string> = {
  critical: 'var(--red, #ef4444)',
  high: 'var(--orange, #f97316)',
  moderate: 'var(--yellow, #eab308)',
  low: 'var(--cyan, #00F5FF)',
  safe: 'var(--emerald, #10b981)',
};

export default function TeamDashboardPage() {
  const plan = useUserPlan();
  const [teams, setTeams] = useState<TeamSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    const loaded = getTeams();
    setTeams(loaded);
    if (loaded[0]) setActiveId(loaded[0].id);
    track('team_dashboard_viewed', { teams: loaded.length, plan });
  }, [plan]);

  const activeTeam = teams.find(t => t.id === activeId) || null;
  const aggregates = useMemo(
    () => (activeTeam ? computeAggregates(activeTeam) : null),
    [activeTeam],
  );

  const refresh = () => setTeams(getTeams());

  const canUseTeamFeatures = plan === 'enterprise' || plan === 'thriver';
  if (!canUseTeamFeatures) {
    return (
      <div className="page-wrap" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <GateCard
            feature="team_audit"
            onUpgrade={() => (window.location.href = '/pricing')}
          />
        </div>
      </div>
    );
  }

  const handleCreate = () => {
    if (!newTeamName.trim()) return;
    const team = createTeam(newTeamName);
    setNewTeamName('');
    setActiveId(team.id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteTeam(id);
    const remaining = getTeams();
    setTeams(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  };

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            TEAM DASHBOARD
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
            Your team's AI exposure at a glance
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', maxWidth: 680 }}>
            Add team members with their individual scores. We aggregate into tier distributions,
            department rollups, and a critical-member watchlist. Data stays local until you publish.
          </p>
        </div>

        <TeamSwitcher
          teams={teams}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
        />

        {activeTeam && aggregates && (
          <>
            <SummaryRow aggregates={aggregates} />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, marginTop: 24 }}>
              <TierDistributionCard aggregates={aggregates} />
              <DepartmentRollupCard aggregates={aggregates} />
            </div>
            <CriticalMembersCard aggregates={aggregates} />
            <AddMemberForm
              teamId={activeTeam.id}
              onAdded={refresh}
            />
            <MembersTable
              team={activeTeam}
              onRemove={(memberId) => {
                removeMember(activeTeam.id, memberId);
                refresh();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TeamSwitcher({
  teams, activeId, onSelect, onCreate, onDelete, newTeamName, setNewTeamName,
}: {
  teams: TeamSnapshot[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  newTeamName: string;
  setNewTeamName: (v: string) => void;
}) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      {teams.map(t => (
        <div
          key={t.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px 6px 14px',
            borderRadius: 999,
            background: t.id === activeId ? 'rgba(0,245,255,0.15)' : 'var(--alpha-bg-05)',
            border: `1px solid ${t.id === activeId ? 'rgba(0,245,255,0.45)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
          onClick={() => onSelect(t.id)}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{t.name}</span>
          <span style={{ color: 'var(--text-2)', fontSize: '0.75rem' }}>
            {t.members.length} member{t.members.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
            aria-label={`Delete ${t.name}`}
            style={{
              background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer',
              fontSize: '0.95rem', padding: '0 4px',
            }}
          >×</button>
        </div>
      ))}
      <div style={{ marginLeft: teams.length ? 8 : 0, display: 'flex', gap: 8, flex: '1 1 260px' }}>
        <input
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="New team name"
          style={{
            flex: 1,
            background: 'var(--alpha-bg-05)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            padding: '8px 12px',
            fontSize: '0.9rem',
          }}
        />
        <button className="btn-teal" onClick={onCreate} style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
          + Add team
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ aggregates }: { aggregates: ReturnType<typeof computeAggregates> }) {
  const stats = [
    { label: 'Members', value: aggregates.memberCount.toString() },
    { label: 'Average score', value: aggregates.avgScore.toString() },
    { label: 'Median score', value: aggregates.medianScore.toString() },
    { label: 'Highest score', value: aggregates.maxScore.toString() },
  ];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 16,
      marginBottom: 8,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
        }}>
          <div style={{ color: 'var(--text-2)', fontSize: '0.72rem', letterSpacing: 1.2, fontWeight: 700, textTransform: 'uppercase' }}>
            {s.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.65rem', fontWeight: 700, marginTop: 6 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierDistributionCard({ aggregates }: { aggregates: ReturnType<typeof computeAggregates> }) {
  const total = Math.max(1, aggregates.memberCount);
  const tiers = (Object.keys(aggregates.tierDistribution) as RiskTier[]);
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: 20,
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>Risk tier distribution</h3>
      {aggregates.memberCount === 0 ? (
        <EmptyHint>Add team members to see tier distribution.</EmptyHint>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiers.map(tier => {
            const count = aggregates.tierDistribution[tier];
            const pct = (count / total) * 100;
            return (
              <div key={tier}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                  <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}>{TIER_LABELS[tier]}</span>
                  <span style={{ color: 'var(--text-2)' }}>{count} · {pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--alpha-bg-06)', borderRadius: 3 }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 3, background: TIER_COLORS[tier],
                    transition: 'width 300ms ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DepartmentRollupCard({ aggregates }: { aggregates: ReturnType<typeof computeAggregates> }) {
  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: 20,
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>Highest-risk departments</h3>
      {aggregates.topDepartments.length === 0 ? (
        <EmptyHint>Add team members with departments to see rollups.</EmptyHint>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
          {aggregates.topDepartments.map(dept => (
            <li key={dept.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span>{dept.name}</span>
              <span style={{ color: 'var(--text-2)' }}>
                avg <strong style={{ color: 'var(--text)' }}>{Math.round(dept.avg)}</strong> · {dept.count} {dept.count === 1 ? 'person' : 'people'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CriticalMembersCard({ aggregates }: { aggregates: ReturnType<typeof computeAggregates> }) {
  if (!aggregates.criticalMembers.length) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(0,0,0,0))',
      border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: 12, padding: 20, marginTop: 24,
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, color: 'var(--red, #ef4444)' }}>
        Critical / high-risk watchlist ({aggregates.criticalMembers.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aggregates.criticalMembers.slice(0, 8).map(m => (
          <MemberRow key={m.id} member={m} compact />
        ))}
      </div>
    </div>
  );
}

function AddMemberForm({ teamId, onAdded }: { teamId: string; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [score, setScore] = useState('');
  const [country, setCountry] = useState('US');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(score);
    if (!name || !role || !Number.isFinite(parsed)) return;
    addMember(teamId, { name, role, department, score: parsed, country });
    setName(''); setRole(''); setDepartment(''); setScore('');
    onAdded();
  };
  return (
    <form
      onSubmit={submit}
      style={{
        marginTop: 24,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        alignItems: 'end',
      }}
    >
      <Field label="Name">
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Full name" required />
      </Field>
      <Field label="Role">
        <input value={role} onChange={e => setRole(e.target.value)} style={inputStyle} placeholder="Engineer, PM..." required />
      </Field>
      <Field label="Department">
        <input value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} placeholder="Engineering" />
      </Field>
      <Field label="Score (0-100)">
        <input value={score} onChange={e => setScore(e.target.value)} type="number" min={0} max={100} style={inputStyle} required />
      </Field>
      <Field label="Country">
        <input value={country} onChange={e => setCountry(e.target.value)} style={inputStyle} placeholder="US" />
      </Field>
      <button type="submit" className="btn-primary" style={{ padding: '10px 14px', fontSize: '0.88rem' }}>
        + Add member
      </button>
    </form>
  );
}

function MembersTable({ team, onRemove }: { team: TeamSnapshot; onRemove: (id: string) => void }) {
  if (!team.members.length) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>All members</h3>
      <div style={{
        background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      }}>
        {team.members.map((m, i) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            <MemberRow member={m} />
            <button
              onClick={() => onRemove(m.id)}
              aria-label={`Remove ${m.name}`}
              style={{
                marginLeft: 'auto', background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-2)', cursor: 'pointer', padding: '4px 10px', borderRadius: 6,
                fontSize: '0.78rem',
              }}
            >Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, compact }: { member: TeamMember; compact?: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? '1fr auto' : '1fr 1fr auto',
      gap: 12,
      alignItems: 'center',
      flex: 1,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{member.name}</div>
        <div style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>
          {member.role} · {member.department}
        </div>
      </div>
      {!compact && (
        <div style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
          {member.country}
        </div>
      )}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ color: TIER_COLORS[member.tier], fontWeight: 700, fontSize: '0.88rem' }}>
          {member.score}
        </span>
        <span style={{
          fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999,
          background: 'var(--alpha-bg-05)', color: TIER_COLORS[member.tier], fontWeight: 700,
        }}>
          {TIER_LABELS[member.tier]}
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', padding: '12px 0' }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--alpha-bg-04)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: '0.88rem',
};
