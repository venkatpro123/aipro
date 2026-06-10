// ToolPageLayout.tsx — Shared layout for all Career OS tools
import { useNavigate } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface ToolPageLayoutProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accentColor?: string;
  children: ReactNode;
}

export function ToolPageLayout({ title, subtitle, icon, accentColor = 'var(--cyan)', children }: ToolPageLayoutProps) {
  const navigate = useNavigate();
  // Track viewport width for mobile-specific layout adjustments
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 769);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Sticky tool header ─────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        // On mobile the global top nav is hidden, so top:0. On desktop it's below the floating pill nav.
        top: isMobile ? 0 : 'var(--nav-h, 72px)',
        zIndex: 20,
        padding: isMobile ? '10px 16px' : '12px 20px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {/* Back button — minimum 44px touch target */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              // Guaranteed ≥44px tall for WCAG 2.5.5
              minHeight: 44,
              minWidth: 44,
              padding: isMobile ? '0 10px' : '0 12px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: isMobile ? 12 : 13,
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <ArrowLeft size={14} />
            {!isMobile && 'Career OS'}
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

          {/* Tool title + icon — truncates on very small screens */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0, flex: 1 }}>
            <div style={{ color: accentColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 700,
                fontSize: isMobile ? 14 : 16,
                color: 'var(--text)',
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {title}
              </div>
              {!isMobile && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{subtitle}</div>
              )}
            </div>
          </div>

          {/* Home icon — 44px touch target */}
          <button
            type="button"
            onClick={() => navigate('/os')}
            aria-label="Career OS home"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              minHeight: 44,
              minWidth: 44,
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            <Home size={16} />
          </button>
        </div>
      </div>

      {/* ── Page content ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: isMobile
            // Mobile: top 20px, horizontal 16px, bottom clears the 64px bottom nav + safe area
            ? '20px 16px calc(var(--nav-bottom-h, 64px) + env(safe-area-inset-bottom, 0px) + 32px)'
            : '28px 20px 60px',
        }}
      >
        {children}

        {/* Return-to-OS footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: isMobile ? 32 : 48,
            paddingTop: 20,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
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
              minHeight: 44,
              padding: '0 16px',
              color: 'var(--cyan)',
              fontSize: isMobile ? '0.78rem' : '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.07)'; }}
          >
            ← Back to Career OS
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
