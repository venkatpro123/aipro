// gdprService.ts
// GDPR compliance service for HumanProof.
//
// Responsibilities:
//   1. EU user detection (timezone-based, synchronous — no network call required)
//   2. Consent management (read/write to localStorage + Supabase user_profiles)
//   3. Data minimization: monthly_expenses + savings_months_runway are never
//      sent to Supabase for EU users who haven't consented. Stored in
//      localStorage under hp_gdpr_fin_* keys instead.
//   4. Data export / deletion helpers (wraps the EFs)
//
// EU detection strategy:
//   Primary:   Intl.DateTimeFormat().resolvedOptions().timeZone → Europe/* timezone
//   Secondary: userProfile.localCurrencyCode === 'EUR'
//   Tertiary:  visaStatus matches eu_blue_card* patterns
//   Override:  userProfile.is_eu_user (DB column set by this service on first detection)
//
// Consent schema v1.0 (stored in localStorage 'hp_gdpr_consent'):
//   {
//     version:             '1.0',
//     isEuUser:            boolean,
//     coreConsent:         boolean,   // always true when modal accepted
//     communityShare:      boolean,   // explicit EU opt-IN
//     financialDataCloud:  boolean,   // explicit EU opt-IN for cloud storage
//     consentedAt:         ISO string
//   }

import { supabase } from '../utils/supabase';

// ── EU country / timezone detection ──────────────────────────────────────────

// IANA timezone prefixes that indicate EU member state location.
// Includes timezones for all 27 EU member states. NOT Switzerland (not EU),
// NOT UK (post-Brexit), NOT Norway/Iceland (EEA but not EU).
const EU_TIMEZONE_PREFIXES = [
  'Europe/Amsterdam',  // Netherlands
  'Europe/Athens',     // Greece
  'Europe/Berlin',     // Germany
  'Europe/Bratislava', // Slovakia
  'Europe/Brussels',   // Belgium
  'Europe/Bucharest',  // Romania
  'Europe/Budapest',   // Hungary
  'Europe/Copenhagen', // Denmark
  'Europe/Dublin',     // Ireland
  'Europe/Helsinki',   // Finland
  'Europe/Lisbon',     // Portugal
  'Europe/Ljubljana',  // Slovenia
  'Europe/Luxembourg', // Luxembourg
  'Europe/Madrid',     // Spain
  'Europe/Malta',      // Malta
  'Europe/Mariehamn',  // Åland (Finland)
  'Europe/Nicosia',    // Cyprus
  'Europe/Paris',      // France
  'Europe/Prague',     // Czech Republic
  'Europe/Riga',       // Latvia
  'Europe/Rome',       // Italy
  'Europe/Skopje',     // North Macedonia (candidate, included for future-proofing)
  'Europe/Sofia',      // Bulgaria
  'Europe/Stockholm',  // Sweden
  'Europe/Tallinn',    // Estonia
  'Europe/Tirane',     // Albania (candidate)
  'Europe/Uzhgorod',   // Ukraine (western) — not EU, excluded
  'Europe/Vienna',     // Austria
  'Europe/Vilnius',    // Lithuania
  'Europe/Warsaw',     // Poland
  'Europe/Zagreb',     // Croatia
];

// ISO 4217 currency codes used exclusively (or almost exclusively) in the EU
const EU_CURRENCIES = new Set(['EUR']);

// Visa status values that indicate EU residency
const EU_VISA_STATUSES = new Set(['eu_blue_card', 'eu_blue_card_germany']);

// ISO 3166-1 country codes for EU member states (task specification)
export const EU_COUNTRY_CODES = new Set([
  'DE', 'FR', 'NL', 'ES', 'PT', 'IT', // task-specified
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR',
  'HR', 'HU', 'IE', 'LT', 'LU', 'LV', 'MT', 'PL', 'RO',
  'SE', 'SI', 'SK',
]);

/**
 * Synchronous EU detection from browser signals — no network call.
 * Returns true when any of: timezone, currency, visa status, or country code
 * indicates EU residency. Call once on app init and cache the result.
 */
export function detectEuUser(opts?: {
  localCurrencyCode?: string | null;
  visaStatus?: string | null;
  companyRegion?: string | null;
}): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (EU_TIMEZONE_PREFIXES.includes(tz)) return true;
  } catch { /* Intl unavailable in very old browsers */ }

  if (opts?.localCurrencyCode && EU_CURRENCIES.has(opts.localCurrencyCode)) return true;
  if (opts?.visaStatus && EU_VISA_STATUSES.has(opts.visaStatus)) return true;
  if (opts?.companyRegion && EU_COUNTRY_CODES.has(opts.companyRegion.toUpperCase())) return true;

  return false;
}

// ── Consent schema ─────────────────────────────────────────────────────────────

export interface GdprConsentState {
  version:            '1.0';
  isEuUser:           boolean;
  coreConsent:        boolean;    // always true — required to use the service
  communityShare:     boolean;    // EU: explicit opt-IN; non-EU: mirrors hp_community_share
  financialDataCloud: boolean;    // EU: explicit opt-IN for cloud financial storage
  consentedAt:        string;     // ISO timestamp
}

const CONSENT_KEY = 'hp_gdpr_consent';
const FIN_EXPENSES_KEY = 'hp_gdpr_fin_expenses';  // EU-local monthly expenses (number)
const FIN_SAVINGS_KEY  = 'hp_gdpr_fin_savings';   // EU-local savings runway (number)

/** Read current consent state from localStorage. Returns null if no consent recorded. */
export function getGdprConsent(): GdprConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GdprConsentState;
    if (parsed?.version !== '1.0') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Returns true when the user has completed the GDPR consent flow. */
export function hasGdprConsent(): boolean {
  const c = getGdprConsent();
  return c !== null && c.coreConsent === true;
}

/** Returns true when this is an EU user (consent recorded or auto-detected). */
export function isEuUser(userProfile?: { is_eu_user?: boolean | null; localCurrencyCode?: string | null; visaStatus?: string | null }): boolean {
  // Check DB column first (authoritative once set)
  if (userProfile?.is_eu_user === true) return true;

  // Check saved consent state
  const consent = getGdprConsent();
  if (consent?.isEuUser === true) return true;

  // Auto-detect from browser/profile signals
  return detectEuUser({
    localCurrencyCode: userProfile?.localCurrencyCode,
    visaStatus:        userProfile?.visaStatus,
  });
}

/**
 * Save GDPR consent to localStorage and, for authenticated users, to
 * user_profiles (gdpr_consent_given, gdpr_consent_at, is_eu_user,
 * community_share_consented, financial_data_consented).
 *
 * Also propagates the community share flag to hp_community_share so the
 * existing LayoffAuditDashboard toggle reflects the consent decision.
 */
export async function saveGdprConsent(consent: GdprConsentState): Promise<void> {
  // 1. localStorage (always)
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch { /* quota exceeded — non-fatal */ }

  // 2. Propagate community share to existing key
  try {
    localStorage.setItem('hp_community_share', consent.communityShare ? '1' : '0');
  } catch { /* non-fatal */ }

  // 3. Supabase user_profiles (if authenticated)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase
      .from('user_profiles')
      .upsert({
        user_id:                   session.user.id,
        is_eu_user:                consent.isEuUser,
        gdpr_consent_given:        consent.coreConsent,
        gdpr_consent_at:           consent.consentedAt,
        gdpr_consent_version:      consent.version,
        community_share_consented: consent.communityShare,
        financial_data_consented:  consent.financialDataCloud,
      }, { onConflict: 'user_id' });
  } catch { /* non-fatal — localStorage is the primary store */ }
}

// ── Data minimization: EU financial fields ────────────────────────────────────

/**
 * Returns true when monthly_expenses_usd and savings_months_runway
 * must NOT be sent to Supabase for this user.
 *
 * Rule: EU user AND has NOT given financial_data_consented.
 * In that state, these fields live in localStorage only.
 */
export function isFinancialDataLocal(): boolean {
  const consent = getGdprConsent();
  if (!consent?.isEuUser) return false;           // non-EU → no restriction
  if (consent.financialDataCloud) return false;   // EU + explicit consent → allowed
  return true;                                     // EU + no consent → localStorage only
}

/** Save EU-local financial data to localStorage (never Supabase). */
export function setLocalFinancialData(opts: {
  monthlyExpensesUsd?: number | null;
  savingsMonthsRunway?: number | null;
}): void {
  try {
    if (opts.monthlyExpensesUsd !== undefined) {
      if (opts.monthlyExpensesUsd !== null) {
        localStorage.setItem(FIN_EXPENSES_KEY, String(opts.monthlyExpensesUsd));
      } else {
        localStorage.removeItem(FIN_EXPENSES_KEY);
      }
    }
    if (opts.savingsMonthsRunway !== undefined) {
      if (opts.savingsMonthsRunway !== null) {
        localStorage.setItem(FIN_SAVINGS_KEY, String(opts.savingsMonthsRunway));
      } else {
        localStorage.removeItem(FIN_SAVINGS_KEY);
      }
    }
  } catch { /* quota exceeded */ }
}

/** Read EU-local financial data from localStorage. */
export function getLocalFinancialData(): {
  monthlyExpensesUsd: number | null;
  savingsMonthsRunway: number | null;
} {
  try {
    const expRaw = localStorage.getItem(FIN_EXPENSES_KEY);
    const savRaw = localStorage.getItem(FIN_SAVINGS_KEY);
    return {
      monthlyExpensesUsd:  expRaw !== null ? parseFloat(expRaw) : null,
      savingsMonthsRunway: savRaw !== null ? parseFloat(savRaw) : null,
    };
  } catch {
    return { monthlyExpensesUsd: null, savingsMonthsRunway: null };
  }
}

// ── Data export ───────────────────────────────────────────────────────────────

/**
 * Trigger GDPR Art. 15/20 data export via the user-data-export Edge Function.
 * Downloads the result as a JSON file.
 */
export async function exportUserData(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in to export your data.');

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const url = `${supabaseUrl}/functions/v1/user-data-export`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Export failed (HTTP ${response.status})`);
  }

  // Trigger browser download
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `humanproof-data-export-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

// ── Data deletion ─────────────────────────────────────────────────────────────

export interface DeletionResult {
  requestId:    string | null;
  completedAt:  string;
  tablesCleared: Record<string, number>;
  message:      string;
}

/**
 * GDPR Art. 17 right to erasure. Calls the user-data-delete Edge Function.
 * Requires the user to be authenticated.
 * On success: clears all local state (localStorage, sessionStorage, consent).
 */
export async function requestDataDeletion(): Promise<DeletionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in to request deletion.');

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const url = `${supabaseUrl}/functions/v1/user-data-delete`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'delete my data' }),
  });

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error((body.error as string | undefined) ?? `Deletion failed (HTTP ${response.status})`);
  }

  // Clear all local state
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch { /* best-effort */ }

  return {
    requestId:    (body.request_id as string | null) ?? null,
    completedAt:  (body.completed_at as string) ?? new Date().toISOString(),
    tablesCleared: (body.tables_cleared as Record<string, number>) ?? {},
    message:      (body.message as string) ?? 'Data deleted.',
  };
}

// ── Community share default enforcement ───────────────────────────────────────

/**
 * Initializes the community share localStorage key for EU users.
 * Must be called on app init BEFORE the LayoffAuditDashboard reads
 * hp_community_share. Ensures EU users default to opt-OUT (false).
 *
 * Non-EU users: no change (their existing key is respected).
 * EU users with saved consent: consent value is used.
 * EU users without consent (first visit): key is set to '0' (opt-out).
 */
export function enforceEuCommunityShareDefault(): void {
  const consent = getGdprConsent();

  // If this is an EU user and they haven't gone through the consent flow yet:
  // ensure community share is off by default.
  const eu = consent?.isEuUser ?? detectEuUser();
  if (!eu) return;

  try {
    const existing = localStorage.getItem('hp_community_share');
    if (existing === null) {
      // Key not set yet — enforce EU opt-out default
      localStorage.setItem('hp_community_share', '0');
    }
    // If key is already set ('0' or '1'), it was either set by the consent modal
    // or by the user explicitly — respect it.
  } catch { /* localStorage unavailable */ }
}

/**
 * Initializes the community share localStorage key for non-EU users.
 * Must be called on app init BEFORE reading hp_community_share.
 * Non-EU users default to opt-IN on first visit (key absent).
 *
 * EU users: governed by enforceEuCommunityShareDefault() — this fn is a no-op for them.
 * Non-EU users with an existing key ('0' or '1'): no change (user choice respected).
 * Non-EU users on first visit (key absent): key is set to '1' (opt-in default).
 */
export function enforceNonEuCommunityShareDefault(): void {
  if (isEuUser()) return; // EU path handled separately

  try {
    const existing = localStorage.getItem('hp_community_share');
    if (existing === null) {
      localStorage.setItem('hp_community_share', '1');
    }
  } catch { /* localStorage unavailable */ }
}

/**
 * Single read-point for community share setting before an audit write.
 * Applies the correct jurisdiction-aware default when the key has not been set:
 *   Non-EU: defaults to true (opt-in).
 *   EU:     defaults to false (opt-out, enforced by enforceEuCommunityShareDefault).
 *
 * Replaces the inline `localStorage.getItem('hp_community_share') === '1'`
 * pattern in LayoffCalculator and LayoffAuditDashboard.
 */
export function getEffectiveCommunityShare(): boolean {
  try {
    enforceNonEuCommunityShareDefault();
    return localStorage.getItem('hp_community_share') === '1';
  } catch {
    return false;
  }
}
