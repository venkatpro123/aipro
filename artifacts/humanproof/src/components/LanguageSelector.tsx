import React from 'react';
import { useI18n } from '../i18n';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
];

export const LanguageSelector: React.FC = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{position: 'relative'}}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: '1px solid #333',
          padding: '8px 12px',
          borderRadius: '6px',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          minWidth: '80px',
        }}
      >
        {LANGUAGES.find(l => l.code === locale)?.name || 'English'}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: '#0b1020',
          border: '1px solid #333',
          borderRadius: '6px',
          minWidth: '140px',
          zIndex: 100,
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code as any);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                background: locale === lang.code ? '#1a1f35' : 'transparent',
                border: 'none',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                borderBottom: '1px solid #1a1f35',
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
