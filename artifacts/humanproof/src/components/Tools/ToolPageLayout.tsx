// ToolPageLayout.tsx — Shared layout for all Career OS tools
import { useNavigate } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ToolPageLayoutProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accentColor?: string;
  children: ReactNode;
}

export function ToolPageLayout({ title, subtitle, icon, accentColor = 'var(--cyan)', children }: ToolPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        padding: '12px 16px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/os')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              opacity: 0.7,
            }}
          >
            <ArrowLeft size={14} />
            Career OS
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: accentColor, display: 'flex', alignItems: 'center' }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.3px' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{subtitle}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => navigate('/os')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Home size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 40px' }}
      >
        {children}

        {/* Return-to-OS footer CTA — applies to all 10 tool pages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
            This tool is part of your Career OS
          </div>
          <button
            type="button"
            onClick={() => navigate('/os')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,245,255,0.07)',
              border: '1px solid rgba(0,245,255,0.2)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--cyan)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.07)'; }}
          >
            ← Back to Career OS dashboard
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
