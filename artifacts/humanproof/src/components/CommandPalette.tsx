// CommandPalette.tsx — P2 Navigation
//
// Global Cmd+K / Ctrl+K search palette for quick navigation.
// Fuzzy-matches routes, features, and common actions.
// Renders as a centered modal with auto-focus input.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, Sparkles, Settings, DollarSign,
  BookOpen, BarChart3, Shield, Home, X, ArrowRight,
  TrendingUp, Zap, Award,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
}

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items: CommandItem[] = useMemo(() => [
    { id: 'home', label: 'Home', description: 'Go to homepage', icon: Home, action: () => navigate('/'), keywords: ['home', 'landing', 'start'] },
    { id: 'audit', label: 'Layoff Audit', description: 'Run a career risk audit', icon: LayoutDashboard, action: () => navigate('/terminal'), keywords: ['audit', 'layoff', 'risk', 'score', 'check'] },
    { id: 'calc', label: 'Risk Calculator', description: 'AI displacement calculator', icon: Sparkles, action: () => navigate('/risk-calculator'), keywords: ['calculator', 'risk', 'displacement', 'ai'] },
    { id: 'pricing', label: 'Pricing', description: 'View plans and pricing', icon: DollarSign, action: () => navigate('/pricing'), keywords: ['pricing', 'plans', 'subscribe', 'pay'] },
    { id: 'intel', label: 'Intelligence', description: 'Community intelligence reports', icon: BookOpen, action: () => navigate('/intelligence'), keywords: ['intelligence', 'reports', 'community', 'signals'] },
    { id: 'predict', label: 'Predictions', description: 'Prediction ledger history', icon: BarChart3, action: () => navigate('/predictions'), keywords: ['predictions', 'ledger', 'history', 'forecast'] },
    { id: 'cert', label: 'Certification', description: 'Get career certification', icon: Award, action: () => navigate('/certification'), keywords: ['certification', 'certificate', 'badge', 'verify'] },
    { id: 'settings', label: 'Settings', description: 'Account and preferences', icon: Settings, action: () => navigate('/settings'), keywords: ['settings', 'account', 'preferences', 'profile'] },
    { id: 'team', label: 'Team Dashboard', description: 'Team risk aggregation', icon: Shield, action: () => navigate('/team'), keywords: ['team', 'dashboard', 'enterprise', 'group'] },
  ], [navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q)),
    );
  }, [query, items]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const executeItem = useCallback((item: CommandItem) => {
    item.action();
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      executeItem(filtered[selectedIdx]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setOpen(false); setQuery(''); }}
          />

          {/* Palette */}
          <motion.div
            key="cmd-palette"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[10000] left-1/2 -translate-x-1/2"
            style={{ top: 'min(20%, 120px)', width: 'min(480px, calc(100vw - 32px))' }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(12,16,28,0.97)',
                border: '1px solid rgba(0,212,224,0.20)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,224,0.06)',
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search features, pages, actions..."
                  className="flex-1 bg-transparent border-none outline-none text-[13px]"
                  style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}
                />
                <kbd
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[320px] overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    No results found for "{query}"
                  </p>
                ) : (
                  filtered.map((item, i) => {
                    const Icon = item.icon;
                    const isSelected = i === selectedIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{
                          background: isSelected ? 'rgba(0,212,224,0.08)' : 'transparent',
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected ? 'rgba(0,212,224,0.15)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.40)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: isSelected ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.65)' }}>
                            {item.label}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                            {item.description}
                          </p>
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--cyan)', opacity: 0.5 }} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                    <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↑↓</kbd> navigate
                  </span>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                    <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>↵</kbd> open
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
