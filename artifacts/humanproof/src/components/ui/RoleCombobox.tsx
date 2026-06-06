// RoleCombobox — Free-text role input with dropdown + custom role escape hatch.
// Replaces PremiumSelect for role selection in AuditTerminalPage.
// No new library required — plain input + filtered ul popover.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SelectOption } from './PremiumSelect';

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string, customTitle?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  customTitle?: string;
}

const CUSTOM_KEY = '__custom__';

export const RoleCombobox: React.FC<Props> = ({
  options, value, onChange, placeholder = 'Search or type any role...', disabled = false, customTitle = '',
}) => {
  const selectedLabel = value === CUSTOM_KEY
    ? customTitle || 'Custom role'
    : options.find((o) => o.key === value)?.label ?? '';

  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const showCustom = query.trim().length >= 3 && !filtered.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
  );

  const allItems: Array<SelectOption | { key: typeof CUSTOM_KEY; label: string; isCustom: true }> = [
    ...filtered,
    ...(showCustom ? [{ key: CUSTOM_KEY as typeof CUSTOM_KEY, label: `Use "${query.trim()}" as a custom role`, isCustom: true as const }] : []),
  ];

  const select = useCallback(
    (item: (typeof allItems)[number]) => {
      if ('isCustom' in item) {
        onChange(CUSTOM_KEY, query.trim());
      } else {
        onChange(item.key);
      }
      setQuery('');
      setOpen(false);
    },
    [onChange, query],
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset focused index when filtered list changes
  useEffect(() => { setFocused(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused((f) => Math.min(f + 1, allItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (allItems[focused]) select(allItems[focused]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger — shows selected value or input */}
      {open ? (
        <input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={selectedLabel || placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
            color: 'var(--text)', fontSize: '0.85rem', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      ) : (
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: selectedLabel ? 'var(--text)' : 'var(--text-3)',
            fontSize: '0.85rem', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel || placeholder}
          </span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0, marginLeft: '6px' }}>▼</span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
          background: 'rgba(20,20,30,0.98)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: '260px', overflowY: 'auto',
        }}>
          {allItems.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center' }}>
              Type at least 3 characters to use a custom role
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isCustom = 'isCustom' in item;
              const isSelected = !isCustom && item.key === value;
              const isFocused = idx === focused;
              return (
                <button
                  key={item.key + idx}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(item); }}
                  onMouseEnter={() => setFocused(idx)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 16px', fontSize: '0.82rem', border: 'none', cursor: 'pointer',
                    background: isFocused ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: isCustom ? 'var(--amber, #f59e0b)' : isSelected ? 'var(--cyan, #22d3ee)' : 'var(--text)',
                    fontFamily: 'inherit', borderTop: isCustom ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    fontStyle: isCustom ? 'italic' : 'normal',
                  }}
                >
                  {isCustom && <span style={{ marginRight: '6px', fontSize: '0.72rem' }}>✦</span>}
                  {item.label}
                  {isSelected && <span style={{ float: 'right', fontSize: '0.7rem', opacity: 0.7 }}>✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
