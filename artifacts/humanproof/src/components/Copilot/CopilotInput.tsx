// CopilotInput.tsx — Text input + send button
import { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CopilotInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 8,
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14,
      transition: 'border-color 0.15s',
    }}
      onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)')}
      onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask anything about your career risk, salary, or strategy…"}
        disabled={disabled}
        rows={1}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text)', fontSize: 14, lineHeight: 1.5, resize: 'none',
          fontFamily: 'inherit', padding: 0,
          caretColor: 'var(--cyan)',
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <button
        onClick={submit}
        disabled={!value.trim() || disabled}
        style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          border: 'none', cursor: value.trim() && !disabled ? 'pointer' : 'default',
          background: value.trim() && !disabled ? 'var(--cyan)' : 'rgba(255,255,255,0.08)',
          color: value.trim() && !disabled ? '#000' : 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        aria-label="Send message"
      >
        <SendHorizontal size={15} />
      </button>
    </div>
  );
}
