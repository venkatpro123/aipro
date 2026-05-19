// localeFormat.ts — v40.0
// Centralized locale-aware formatting helpers.
// Replaces hardcoded 'en-US' usage that broke non-US user experience
// (e.g. German users saw "January" instead of "Januar").

/**
 * Returns the user's preferred locale, falling back to 'en-US'.
 * Safe for SSR contexts where `navigator` may be undefined.
 */
export function userLocale(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.language || (navigator.languages?.[0] ?? 'en-US');
}

/**
 * Format a date with the user's locale.
 * Accepts ISO string, Date, or number (ms since epoch).
 * Returns empty string for invalid input — never throws.
 */
export function formatDate(
  input: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  if (input == null) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(userLocale(), options);
  } catch {
    return d.toLocaleDateString('en-US', options);
  }
}

/**
 * Format a number as currency using the user's locale.
 * Default currency is USD but accepts any ISO 4217 code.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD',
): string {
  if (value == null || !isFinite(value)) return '';
  try {
    return new Intl.NumberFormat(userLocale(), { style: 'currency', currency }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
}

/**
 * Format a number with locale-aware thousands separators.
 */
export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value == null || !isFinite(value)) return '';
  try {
    return new Intl.NumberFormat(userLocale(), options).format(value);
  } catch {
    return String(value);
  }
}
