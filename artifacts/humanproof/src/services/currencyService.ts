// currencyService.ts — v40.0
// Static currency metadata for display, formatting, local↔USD conversion,
// and PPP-calibrated advice amount derivation.
//
// Exchange rates are approximate 2024-Q2 averages. They are used ONLY for:
//   (a) displaying local salary amounts to the user
//   (b) converting local input to USD for pipeline calculations
//   (c) PPP-calibrating advice budget ranges (e.g. skill investment per month)
//
// The runway TIER classification (months_covered) is always currency-neutral.
// These rates are NEVER used for financial calculations or predictions.
//
// PPP factors: World Bank purchasing-power-parity conversion factor 2023 (approx).
// A PPP factor of 0.25 means local purchasing power is 25% of US equivalent —
// so $100 of US purchasing power costs only $25 USD worth of local currency.
// Used to scale advice amounts so "invest in a course" is meaningful locally.

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** Approximate 2024-Q2 rate: how many local units = 1 USD */
  unitsPerUsd: number;
  /** How to format large amounts */
  largeFormat: 'k' | 'L' | 'M';
  /** Local-currency threshold above which largeFormat kicks in */
  largeThreshold: number;
  /**
   * PPP factor relative to US: 1.0 = US equivalent purchasing power.
   * Local advice amounts = baseUsd × pppFactor × unitsPerUsd.
   */
  pppFactor: number;
}

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  // ── Americas ──────────────────────────────────────────────────────────────
  USD: { code: 'USD', symbol: '$',    name: 'US Dollar',            unitsPerUsd: 1,       largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 1.00 },
  CAD: { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',      unitsPerUsd: 1.36,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.80 },
  BRL: { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',       unitsPerUsd: 5.0,     largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.32 },
  MXN: { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso',         unitsPerUsd: 17.3,    largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.40 },
  COP: { code: 'COP', symbol: 'COP',  name: 'Colombian Peso',       unitsPerUsd: 3_950,   largeFormat: 'M', largeThreshold: 1_000_000,  pppFactor: 0.28 },
  ARS: { code: 'ARS', symbol: 'AR$',  name: 'Argentine Peso',       unitsPerUsd: 920,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.20 },
  // ── Europe ───────────────────────────────────────────────────────────────
  GBP: { code: 'GBP', symbol: '£',    name: 'British Pound',        unitsPerUsd: 0.79,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.82 },
  EUR: { code: 'EUR', symbol: '€',    name: 'Euro',                 unitsPerUsd: 0.92,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.76 },
  CHF: { code: 'CHF', symbol: 'CHF',  name: 'Swiss Franc',          unitsPerUsd: 0.88,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.85 },
  SEK: { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',        unitsPerUsd: 10.5,    largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.75 },
  NOK: { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',      unitsPerUsd: 10.7,    largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.75 },
  DKK: { code: 'DKK', symbol: 'kr',   name: 'Danish Krone',         unitsPerUsd: 6.9,     largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.78 },
  PLN: { code: 'PLN', symbol: 'zł',   name: 'Polish Zloty',         unitsPerUsd: 3.95,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.48 },
  CZK: { code: 'CZK', symbol: 'Kč',  name: 'Czech Koruna',         unitsPerUsd: 22.8,    largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.52 },
  HUF: { code: 'HUF', symbol: 'Ft',  name: 'Hungarian Forint',     unitsPerUsd: 360,     largeFormat: 'k', largeThreshold: 1_000_000,  pppFactor: 0.42 },
  RON: { code: 'RON', symbol: 'lei',  name: 'Romanian Leu',         unitsPerUsd: 4.6,     largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.42 },
  // ── South Asia ───────────────────────────────────────────────────────────
  INR: { code: 'INR', symbol: '₹',    name: 'Indian Rupee',         unitsPerUsd: 83,      largeFormat: 'L', largeThreshold: 100_000,    pppFactor: 0.25 },
  BDT: { code: 'BDT', symbol: '৳',    name: 'Bangladeshi Taka',     unitsPerUsd: 110,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.18 },
  PKR: { code: 'PKR', symbol: 'Rs',   name: 'Pakistani Rupee',      unitsPerUsd: 278,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.15 },
  LKR: { code: 'LKR', symbol: 'Rs',   name: 'Sri Lankan Rupee',     unitsPerUsd: 305,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.20 },
  // ── East / SE Asia ───────────────────────────────────────────────────────
  SGD: { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',     unitsPerUsd: 1.34,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.80 },
  AUD: { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',    unitsPerUsd: 1.53,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.73 },
  NZD: { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar',   unitsPerUsd: 1.63,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.68 },
  PHP: { code: 'PHP', symbol: '₱',    name: 'Philippine Peso',      unitsPerUsd: 57,      largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.22 },
  MYR: { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit',    unitsPerUsd: 4.7,     largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.35 },
  IDR: { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah',    unitsPerUsd: 15_800,  largeFormat: 'M', largeThreshold: 10_000_000, pppFactor: 0.28 },
  VND: { code: 'VND', symbol: '₫',    name: 'Vietnamese Dong',      unitsPerUsd: 25_000,  largeFormat: 'M', largeThreshold: 10_000_000, pppFactor: 0.22 },
  THB: { code: 'THB', symbol: '฿',    name: 'Thai Baht',            unitsPerUsd: 35.5,    largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.32 },
  JPY: { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',         unitsPerUsd: 150,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.60 },
  KRW: { code: 'KRW', symbol: '₩',    name: 'South Korean Won',     unitsPerUsd: 1_360,   largeFormat: 'M', largeThreshold: 1_000_000,  pppFactor: 0.55 },
  TWD: { code: 'TWD', symbol: 'NT$',  name: 'Taiwan Dollar',        unitsPerUsd: 32,      largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.52 },
  HKD: { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',     unitsPerUsd: 7.8,     largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.68 },
  CNY: { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',         unitsPerUsd: 7.25,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.48 },
  // ── MENA ─────────────────────────────────────────────────────────────────
  AED: { code: 'AED', symbol: 'AED',  name: 'UAE Dirham',           unitsPerUsd: 3.67,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.62 },
  SAR: { code: 'SAR', symbol: 'SAR',  name: 'Saudi Riyal',          unitsPerUsd: 3.75,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.57 },
  QAR: { code: 'QAR', symbol: 'QAR',  name: 'Qatari Riyal',         unitsPerUsd: 3.64,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.65 },
  KWD: { code: 'KWD', symbol: 'KD',   name: 'Kuwaiti Dinar',        unitsPerUsd: 0.307,   largeFormat: 'k', largeThreshold: 1_000,      pppFactor: 0.70 },
  BHD: { code: 'BHD', symbol: 'BD',   name: 'Bahraini Dinar',       unitsPerUsd: 0.377,   largeFormat: 'k', largeThreshold: 1_000,      pppFactor: 0.65 },
  OMR: { code: 'OMR', symbol: 'OMR',  name: 'Omani Rial',           unitsPerUsd: 0.385,   largeFormat: 'k', largeThreshold: 1_000,      pppFactor: 0.62 },
  EGP: { code: 'EGP', symbol: 'E£',   name: 'Egyptian Pound',       unitsPerUsd: 48,      largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.20 },
  // ── Africa ───────────────────────────────────────────────────────────────
  KES: { code: 'KES', symbol: 'KES',  name: 'Kenyan Shilling',      unitsPerUsd: 131,     largeFormat: 'k', largeThreshold: 100_000,    pppFactor: 0.15 },
  NGN: { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira',       unitsPerUsd: 1_570,   largeFormat: 'M', largeThreshold: 1_000_000,  pppFactor: 0.14 },
  ZAR: { code: 'ZAR', symbol: 'R',    name: 'South African Rand',   unitsPerUsd: 18.6,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.25 },
  GHS: { code: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi',        unitsPerUsd: 15.5,    largeFormat: 'k', largeThreshold: 10_000,     pppFactor: 0.17 },
};

// ── Public helpers ─────────────────────────────────────────────────────────────

/**
 * Format a local-currency amount for display.
 * Examples: formatCurrency(45000, 'PHP') → '₱45k'
 *           formatCurrency(83000, 'INR') → '₹83K' (but 100000 → '₹1.0L')
 *           formatCurrency(6000, 'GBP')  → '£6k'
 */
export function formatCurrency(amount: number, code: string): string {
  const meta = CURRENCY_META[code] ?? CURRENCY_META['USD'];
  const abs = Math.abs(amount);
  if (meta.largeFormat === 'L') {
    // Indian Lakh: 1L = 100,000
    return abs >= meta.largeThreshold
      ? `${meta.symbol}${(amount / 100_000).toFixed(1)}L`
      : `${meta.symbol}${(amount / 1_000).toFixed(0)}K`;
  }
  if (meta.largeFormat === 'M') {
    return abs >= meta.largeThreshold
      ? `${meta.symbol}${(amount / 1_000_000).toFixed(1)}M`
      : `${meta.symbol}${(amount / 1_000).toFixed(0)}k`;
  }
  // Standard k format
  return abs >= meta.largeThreshold
    ? `${meta.symbol}${(amount / 1_000).toFixed(0)}k`
    : `${meta.symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Convert a local currency amount to USD.
 * Returns the input unchanged if the currency code is unrecognised.
 */
export function convertToUsd(amount: number, code: string): number {
  const meta = CURRENCY_META[code];
  if (!meta) return amount;
  return amount / meta.unitsPerUsd;
}

/**
 * Convert a USD amount to local currency.
 */
export function convertFromUsd(amountUsd: number, code: string): number {
  const meta = CURRENCY_META[code];
  if (!meta) return amountUsd;
  return amountUsd * meta.unitsPerUsd;
}

/**
 * PPP-calibrate a USD-base advice amount into local currency.
 *
 * Example: skill investment base is $70/month (US).
 *   Manila (PHP, pppFactor=0.22): 70 × 0.22 × 57 = ₱878/month — locally appropriate.
 *   Berlin  (EUR, pppFactor=0.76): 70 × 0.76 × 0.92 = €49/month.
 *   Nairobi (KES, pppFactor=0.15): 70 × 0.15 × 131 = KES 1,376/month.
 *
 * The pppFactor corrects for local purchasing power so advice amounts
 * feel proportionate to local income, not just exchange-rate-converted.
 */
export function pppCalibrate(baseUsd: number, code: string): number {
  const meta = CURRENCY_META[code] ?? CURRENCY_META['USD'];
  return Math.round(baseUsd * meta.pppFactor * meta.unitsPerUsd);
}

/**
 * Return a human-readable USD equivalent string for a local-currency amount.
 * Used in UI to show "$~790/mo USD" next to a PHP 45,000 salary entry.
 */
export function localToUsdLabel(localAmount: number, code: string): string {
  const usd = convertToUsd(localAmount, code);
  if (usd >= 1_000) return `~$${(usd / 1_000).toFixed(1)}k/mo USD`;
  return `~$${Math.round(usd)}/mo USD`;
}

/**
 * Infer a user's most likely currency from their metro area and/or visa status.
 * Visa status takes precedence (more reliable signal than metro string).
 * Returns ISO 4217 code. Defaults to 'USD' when unable to determine.
 */
export function inferCurrencyFromContext(
  metro: string | null | undefined,
  visaStatus: string | null | undefined,
): string {
  // Visa-status inference (strongest signal)
  const vsMap: Record<string, string> = {
    uk_skilled_worker:   'GBP',
    eu_blue_card:        'EUR',
    singapore_ep:        'SGD',
    singapore_s_pass:    'SGD',
    australia_482_tss:   'AUD',
    canada_lmia_permit:  'CAD',
    philippines_9g_aep:  'PHP',
    uae_employment_visa: 'AED',
    uae_golden_visa:     'AED',
    saudi_iqama:         'SAR',
    qatar_work_permit:   'QAR',
    kuwait_work_permit:  'KWD',
    gcc_sponsored:       'AED', // conservative default within GCC
  };
  if (visaStatus && vsMap[visaStatus]) return vsMap[visaStatus];

  if (!metro) return 'USD';
  const m = metro.toLowerCase().replace(/[\s-]/g, '_');

  const metroMap: Array<[string[], string]> = [
    // India
    [['bangalore', 'bengaluru', 'hyderabad', 'pune', 'chennai', 'mumbai', 'delhi', 'ncr', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'kochi', 'ahmedabad', 'coimbatore', 'indore', 'bhubaneswar', 'jaipur', 'nagpur'], 'INR'],
    // UK
    [['london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'bristol', 'leeds', 'sheffield', 'liverpool', 'cambridge', 'oxford', 'reading', 'newcastle'], 'GBP'],
    // EU — Germany-first (Blue Card), then broader EU
    [['berlin', 'munich', 'frankfurt', 'hamburg', 'cologne', 'stuttgart', 'dusseldorf', 'dortmund', 'dresden', 'leipzig', 'amsterdam', 'rotterdam', 'paris', 'lyon', 'marseille', 'madrid', 'barcelona', 'milan', 'rome', 'brussels', 'vienna', 'warsaw', 'prague', 'budapest', 'bucharest', 'sofia', 'athens', 'lisbon', 'porto', 'dublin', 'stockholm', 'gothenburg', 'oslo', 'bergen', 'copenhagen', 'helsinki', 'tallinn', 'riga', 'vilnius', 'zurich', 'geneva', 'basel'], 'EUR'],
    // Singapore
    [['singapore'], 'SGD'],
    // Australia / NZ
    [['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'gold_coast', 'auckland', 'wellington', 'christchurch'], 'AUD'],
    // Canada
    [['toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'edmonton', 'winnipeg', 'quebec'], 'CAD'],
    // Philippines
    [['manila', 'makati', 'taguig', 'bgc', 'quezon', 'cebu', 'davao'], 'PHP'],
    // Malaysia
    [['kuala_lumpur', 'kl', 'petaling_jaya', 'johor', 'penang'], 'MYR'],
    // UAE
    [['dubai', 'abu_dhabi', 'sharjah', 'ajman'], 'AED'],
    // Saudi
    [['riyadh', 'jeddah', 'dammam', 'khobar', 'medina'], 'SAR'],
    // Qatar
    [['doha'], 'QAR'],
    // Kuwait
    [['kuwait_city', 'kuwait'], 'KWD'],
    // Bahrain
    [['manama', 'bahrain'], 'BHD'],
    // Oman
    [['muscat', 'oman'], 'OMR'],
    // Egypt
    [['cairo', 'alexandria', 'giza'], 'EGP'],
    // Kenya
    [['nairobi', 'mombasa', 'kisumu'], 'KES'],
    // Nigeria / Ghana
    [['lagos', 'abuja', 'kano', 'ibadan'], 'NGN'],
    [['accra', 'kumasi'], 'GHS'],
    // South Africa
    [['cape_town', 'johannesburg', 'durban', 'pretoria', 'sandton'], 'ZAR'],
    // Japan
    [['tokyo', 'osaka', 'yokohama', 'nagoya', 'kyoto', 'fukuoka'], 'JPY'],
    // South Korea
    [['seoul', 'busan', 'incheon', 'daejeon'], 'KRW'],
    // Taiwan
    [['taipei', 'taiwan'], 'TWD'],
    // Hong Kong
    [['hong_kong', 'kowloon'], 'HKD'],
    // China
    [['beijing', 'shanghai', 'shenzhen', 'guangzhou', 'chengdu', 'hangzhou', 'wuhan'], 'CNY'],
    // Indonesia
    [['jakarta', 'bali', 'surabaya', 'bandung', 'medan'], 'IDR'],
    // Vietnam
    [['ho_chi_minh', 'hcmc', 'hanoi', 'da_nang'], 'VND'],
    // Thailand
    [['bangkok', 'chiang_mai', 'phuket'], 'THB'],
    // Brazil
    [['sao_paulo', 'rio', 'belo_horizonte', 'brasilia', 'curitiba', 'porto_alegre'], 'BRL'],
    // Mexico
    [['mexico_city', 'guadalajara', 'monterrey', 'puebla', 'tijuana'], 'MXN'],
    // Argentina / Colombia
    [['buenos_aires', 'cordoba', 'rosario'], 'ARS'],
    [['bogota', 'medellin', 'cali', 'barranquilla'], 'COP'],
    // Switzerland
    [['zurich', 'geneva', 'basel', 'bern'], 'CHF'],
  ];

  for (const [cities, code] of metroMap) {
    if (cities.some(city => m.includes(city))) return code;
  }
  return 'USD';
}

/**
 * Return the display name for a currency code.
 */
export function currencyName(code: string): string {
  return CURRENCY_META[code]?.name ?? code;
}

/**
 * Localize embedded currency amounts in an action description to the user's
 * local currency. Converts inline INR (₹) and USD ($) course/certification
 * cost amounts so a Singapore user sees "S$152" instead of "₹8,500".
 *
 * EXCLUSION RULES — amounts are left unchanged when:
 *   • Followed by " LPA" (Indian annual salary market data, not a course cost)
 *   • Converted USD equivalent > $20,000 (salary / TC ranges, not course costs)
 *   • Target currency already matches the source symbol (no identity conversion)
 *   • Amount is a salary range context ("$40,000–$70,000 salary")
 *
 * LABELED: MODELED — rates are static 2024-Q2 approximations, not live FX.
 *
 * @param text            Description string potentially containing ₹ / $ amounts
 * @param toCurrencyCode  ISO 4217 code of the user's local currency (e.g. 'SGD')
 */
export function localizeActionCosts(text: string, toCurrencyCode: string): string {
  if (!text) return text;
  const toMeta = CURRENCY_META[toCurrencyCode];
  // No conversion needed when the target is not in our table or is already INR/USD.
  if (!toMeta) return text;

  const INR_UNITS = CURRENCY_META['INR'].unitsPerUsd; // 83
  const USD_UNITS = 1;

  /** Format a USD amount into the target currency (exchange rate only — not PPP).
   *  We use straight exchange rate (not PPP) because certification exam prices are
   *  set in local markets, not based on purchasing power. PPP is for advice budgets. */
  function toLocal(usdAmount: number): string {
    // Skip amounts that look like salary ranges (> $20k USD)
    if (usdAmount > 20_000) return '';
    const localAmount = usdAmount * toMeta.unitsPerUsd;
    return formatCurrency(Math.round(localAmount), toCurrencyCode);
  }

  // ── Replace INR amounts (₹N or ₹N–₹N ranges) ─────────────────────────────
  // Skip when: (a) followed by " LPA" (salary data), (b) amount > $20k USD equiv.
  if (toCurrencyCode !== 'INR') {
    // Range: ₹12,000–15,000 or ₹12,000–₹15,000
    text = text.replace(
      /₹\s?([\d,]+(?:\.\d+)?)\s*[–\-]\s*₹?\s?([\d,]+(?:\.\d+)?)(?!\s*(?:L|LPA|lakh|crore))/g,
      (match, a, b, offset, str) => {
        // Skip if followed by LPA
        const after = str.slice(offset + match.length, offset + match.length + 5);
        if (/^\s*LPA/i.test(after)) return match;
        const amtA = parseFloat(a.replace(/,/g, ''));
        const amtB = parseFloat(b.replace(/,/g, ''));
        const usdA = amtA / INR_UNITS;
        const usdB = amtB / INR_UNITS;
        if (usdA > 20_000 || usdB > 20_000) return match;
        const locA = toLocal(usdA);
        const locB = toLocal(usdB);
        if (!locA || !locB) return match;
        // Format: "S$152–S$184" (reuse same symbol)
        return `${locA}–${locB}`;
      }
    );
    // Single: ₹8,500
    text = text.replace(
      /₹\s?([\d,]+(?:\.\d+)?)(?!\s*(?:L\b|LPA|lakh|crore|–|-|,\d))/g,
      (match, a, offset, str) => {
        const after = str.slice(offset + match.length, offset + match.length + 5);
        if (/^\s*LPA/i.test(after)) return match;
        const amt = parseFloat(a.replace(/,/g, ''));
        const usd = amt / INR_UNITS;
        if (usd > 20_000) return match;
        const loc = toLocal(usd);
        return loc || match;
      }
    );
  }

  // ── Replace USD amounts ($N or $N–$N ranges) ─────────────────────────────
  // Only when target is NOT USD.
  if (toCurrencyCode !== 'USD') {
    // Range: $12,000–$15,000 (but skip salary ranges > $20k)
    text = text.replace(
      /\$\s?([\d,]+(?:\.\d+)?)\s*[–\-]\s*\$\s?([\d,]+(?:\.\d+)?)/g,
      (match, a, b) => {
        const amtA = parseFloat(a.replace(/,/g, ''));
        const amtB = parseFloat(b.replace(/,/g, ''));
        // If either endpoint > $20k it's a salary range — leave intact
        if (amtA > 20_000 || amtB > 20_000) return match;
        const locA = toLocal(amtA * USD_UNITS);
        const locB = toLocal(amtB * USD_UNITS);
        if (!locA || !locB) return match;
        return `${locA}–${locB}`;
      }
    );
    // Single: $395
    text = text.replace(
      /\$\s?([\d,]+(?:\.\d+)?)(?!\s*(?:k\b|,\d))/g,
      (match, a) => {
        const amt = parseFloat(a.replace(/,/g, ''));
        if (amt > 20_000) return match;
        const loc = toLocal(amt * USD_UNITS);
        return loc || match;
      }
    );
  }

  return text;
}

/**
 * List all supported currency codes, sorted alphabetically.
 */
export function supportedCurrencies(): string[] {
  return Object.keys(CURRENCY_META).sort();
}

/**
 * PPP-convert a USD cost amount to local currency.
 * Alias for pppCalibrate() — the optional metroArea param is reserved for future
 * city-level PPP adjustments; currently ignored.
 * Use for affordability comparisons (course cost vs. local monthly budget).
 */
export function convertPPP(costUsd: number, toCurrencyCode: string, _metroArea?: string): number {
  return pppCalibrate(costUsd, toCurrencyCode);
}

/**
 * Extract the primary USD-equivalent cost from an action item's title + description.
 * Returns null when no recognisable cost amount is found.
 *
 * Rules:
 *   • ₹ amounts → USD via 83.5 INR/USD
 *   • $ amounts taken at face value
 *   • Skip LPA-suffixed amounts (India annual salary data)
 *   • Skip amounts > $2,000 USD equiv (salary ranges, not course costs)
 *   • First match wins
 */
export function extractCostUsd(title: string, description: string): number | null {
  const text = `${title ?? ''} ${description ?? ''}`;
  const INR_PER_USD = 83.5;

  const inrMatch = text.match(/₹\s?([\d,]+(?:\.\d+)?)(?!\s*(?:L\b|LPA|lakh|crore))/);
  if (inrMatch) {
    const inr = parseFloat(inrMatch[1].replace(/,/g, ''));
    const usd = inr / INR_PER_USD;
    if (usd <= 2_000) return Math.round(usd);
  }

  const usdMatch = text.match(/\$\s?([\d,]+(?:\.\d+)?)(?!\s*(?:k\b|,\d{3}))/);
  if (usdMatch) {
    const usd = parseFloat(usdMatch[1].replace(/,/g, ''));
    if (usd <= 2_000) return Math.round(usd);
  }

  return null;
}

/**
 * Format an action cost as a localised label with USD reference.
 * Uses straight exchange rate (not PPP) because exam prices are set in local
 * markets — the exchange-rate price is what the user actually pays.
 *
 * Examples: formatCostLabel(215, 'SGD') → "S$288 (≈$215 USD)"
 *           formatCostLabel(150, 'GBP') → "£119 (≈$150 USD)"
 *           formatCostLabel(150, 'USD') → "$150"
 */
export function formatCostLabel(costUsd: number, localCurrencyCode: string): string {
  if (!localCurrencyCode || localCurrencyCode === 'USD') return `$${costUsd}`;
  const toMeta = CURRENCY_META[localCurrencyCode];
  if (!toMeta) return `$${costUsd}`;
  const localAmount = Math.round(costUsd * toMeta.unitsPerUsd);
  return `${formatCurrency(localAmount, localCurrencyCode)} (≈$${costUsd} USD)`;
}
