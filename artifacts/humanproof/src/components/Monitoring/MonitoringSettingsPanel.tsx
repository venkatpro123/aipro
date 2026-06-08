import { useState } from "react";
import { Settings2, Save, CheckCircle } from "lucide-react";
import { supabase } from "../../utils/supabase";

type AlertFrequency = 'realtime' | 'daily' | 'weekly';

interface MonitoringPreferences {
  alertFrequency: AlertFrequency;
  suppressCategories: string[];
}

const DEFAULT_PREFS: MonitoringPreferences = {
  alertFrequency: 'realtime',
  suppressCategories: [],
};

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string; desc: string }[] = [
  { value: 'realtime', label: 'Real-time', desc: 'Signals appear as they arrive' },
  { value: 'daily', label: 'Daily digest', desc: 'One summary per day' },
  { value: 'weekly', label: 'Weekly', desc: 'One summary per week' },
];

const CATEGORY_OPTIONS = [
  { value: 'company', label: 'Company signals' },
  { value: 'role', label: 'Role signals' },
  { value: 'market', label: 'Market signals' },
  { value: 'personal', label: 'Personal signals' },
];

export function MonitoringSettingsPanel() {
  const [prefs, setPrefs] = useState<MonitoringPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleCategory = (cat: string) => {
    setPrefs(prev => ({
      ...prev,
      suppressCategories: prev.suppressCategories.includes(cat)
        ? prev.suppressCategories.filter(c => c !== cat)
        : [...prev.suppressCategories, cat],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_profiles')
          .update({ monitoring_preferences: prefs })
          .eq('user_id', user.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* offline */ }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Settings2 size={18} style={{ color: "var(--cyan)" }} />
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
          Monitoring Settings
        </h3>
      </div>

      {/* Alert frequency */}
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 10, letterSpacing: "0.06em" }}>
          ALERT FREQUENCY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FREQUENCY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                padding: "10px 14px", borderRadius: 8,
                background: prefs.alertFrequency === opt.value ? "rgba(0,245,255,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${prefs.alertFrequency === opt.value ? "rgba(0,245,255,0.3)" : "var(--border)"}`,
                transition: "all 150ms",
              }}
            >
              <input
                type="radio"
                name="alertFreq"
                value={opt.value}
                checked={prefs.alertFrequency === opt.value}
                onChange={() => setPrefs(p => ({ ...p, alertFrequency: opt.value }))}
                style={{ accentColor: "var(--cyan)" }}
              />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Suppress categories */}
      <div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 10, letterSpacing: "0.06em" }}>
          ACTIVE SIGNAL CATEGORIES
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CATEGORY_OPTIONS.map(opt => {
            const active = !prefs.suppressCategories.includes(opt.value);
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                  padding: "10px 14px", borderRadius: 8,
                  background: active ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                  border: `1px solid var(--border)`,
                  opacity: active ? 1 : 0.5, transition: "all 150ms",
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleCategory(opt.value)}
                  style={{ accentColor: "var(--cyan)" }}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saved ? "#10b981" : "var(--cyan)", color: "#000",
          border: "none", borderRadius: 10, padding: "11px 0",
          fontSize: "0.88rem", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 300ms",
        }}
      >
        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
        {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
