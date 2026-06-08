// ToolsHubPage.tsx — Career OS Tools Hub at /tools
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useLayoff } from '../context/LayoffContext';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Brain, Briefcase, DollarSign, BarChart2, Network,
  TrendingUp, Target, Zap, Users, ArrowRight, Lock
} from 'lucide-react';

const TOOLS = [
  {
    id: 'layoff-defense',
    route: '/tools/layoff-defense',
    icon: Shield,
    color: '#ef4444',
    title: 'Layoff Defense Center',
    subtitle: 'Reduce your displacement risk',
    description: 'Risk simulators, company watchlist, forecast, and reduction planner.',
    phase: 3,
  },
  {
    id: 'ai-defense',
    route: '/tools/ai-defense',
    icon: Brain,
    color: 'var(--cyan)',
    title: 'AI Career Defense',
    subtitle: 'Protect against automation',
    description: 'AI replacement analysis, readiness scoring, and futureproofing roadmap.',
    phase: 3,
  },
  {
    id: 'career-readiness',
    route: '/tools/career-readiness',
    icon: Briefcase,
    color: '#a78bfa',
    title: 'Career Readiness Center',
    subtitle: 'Get market-ready immediately',
    description: 'Resume, LinkedIn, interview, portfolio, and referral readiness.',
    phase: 3,
  },
  {
    id: 'career-insurance',
    route: '/tools/career-insurance',
    icon: DollarSign,
    color: '#10b981',
    title: 'Career Insurance Center',
    subtitle: 'Financial survivability planning',
    description: 'Emergency fund planner, runway calculator, scenario planning.',
    phase: 3,
  },
  {
    id: 'market-intel',
    route: '/tools/market-intel',
    icon: BarChart2,
    color: '#f59e0b',
    title: 'Market Intelligence Center',
    subtitle: 'Spot opportunities early',
    description: 'Demand scanner, forecasts, geographic intelligence, hiring trends.',
    phase: 3,
  },
  {
    id: 'networking',
    route: '/tools/networking',
    icon: Network,
    color: '#06b6d4',
    title: 'Networking OS',
    subtitle: 'Build strategic connections',
    description: 'Network map, relationship tracker, referral intelligence.',
    phase: 4,
    comingSoon: true,
  },
  {
    id: 'compensation',
    route: '/tools/compensation',
    icon: TrendingUp,
    color: '#84cc16',
    title: 'Compensation Intelligence',
    subtitle: 'Know your market worth',
    description: 'Salary benchmarks, offer analysis, raise planning, negotiation scripts.',
    phase: 4,
    comingSoon: true,
  },
  {
    id: 'strategy',
    route: '/tools/strategy',
    icon: Target,
    color: '#f97316',
    title: 'Career Strategy Studio',
    subtitle: 'Build your career roadmap',
    description: 'Stay/exit strategy, promotion planning, career pivot navigator.',
    phase: 4,
    comingSoon: true,
  },
  {
    id: 'opportunity-radar',
    route: '/tools/opportunity-radar',
    icon: Zap,
    color: '#eab308',
    title: 'Opportunity Radar',
    subtitle: 'Find hidden openings',
    description: 'Hiring detection, company targeting, market alerts.',
    phase: 4,
    comingSoon: true,
  },
  {
    id: 'career-twin',
    route: '/tools/career-twin',
    icon: Users,
    color: '#8b5cf6',
    title: 'Career Twin',
    subtitle: 'Your persistent career model',
    description: 'Profile, career history, skills inventory, goals tracker.',
    phase: 4,
    comingSoon: true,
  },
];

export default function ToolsHubPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { state } = useLayoff();
  const score = (state.scoreResult as import('../types/hybridResult').HybridResult | null)?.total ?? null;

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  // Recommend tool based on score
  const recommended = score !== null
    ? (score >= 70 ? 'layoff-defense' : score >= 50 ? 'ai-defense' : 'career-readiness')
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{
        padding: '32px 16px 24px',
        maxWidth: 1100,
        margin: '0 auto',
        borderBottom: '1px solid var(--border)',
      }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>
            CAREER OS
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
            Tool Ecosystem
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 14, margin: '8px 0 0' }}>
            Specialized tools that work together to protect and advance your career.
          </p>
        </motion.div>
      </div>

      {/* Tools Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 16,
          }}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isRecommended = tool.id === recommended;
            return (
              <motion.div
                key={tool.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <div
                  className="card-premium"
                  style={{
                    padding: 20,
                    cursor: tool.comingSoon ? 'default' : 'pointer',
                    opacity: tool.comingSoon ? 0.6 : 1,
                    position: 'relative',
                    border: isRecommended ? `1px solid ${tool.color}44` : undefined,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => !tool.comingSoon && navigate(tool.route)}
                >
                  {isRecommended && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: `${tool.color}22`,
                      color: tool.color,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.05em',
                    }}>
                      RECOMMENDED
                    </div>
                  )}
                  {tool.comingSoon && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 11,
                    }}>
                      <Lock size={12} /> Phase 4
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${tool.color}18`,
                      border: `1px solid ${tool.color}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: tool.color,
                    }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{tool.title}</div>
                      <div style={{ fontSize: 12, color: tool.color, marginTop: 2, fontWeight: 500 }}>{tool.subtitle}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.5 }}>
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  {!tool.comingSoon && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: tool.color,
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 14,
                    }}>
                      Open tool <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
