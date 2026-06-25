// pushNotificationService.ts — P3 Retention
//
// Web Push API integration for market change alerts.
// Handles permission request, subscription management, and
// dispatching notifications for score changes and new signals.
// Falls back gracefully when Push API is unavailable.

const LS_KEY = 'hp.push.subscription';
const LS_PREF_KEY = 'hp.push.enabled';

export interface PushPreferences {
  enabled: boolean;
  scoreChanges: boolean;
  marketAlerts: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_PREFS: PushPreferences = {
  enabled: false,
  scoreChanges: true,
  marketAlerts: true,
  weeklyDigest: false,
};

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export function getPushPreferences(): PushPreferences {
  try {
    const raw = localStorage.getItem(LS_PREF_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

export function savePushPreferences(prefs: Partial<PushPreferences>): void {
  try {
    const current = getPushPreferences();
    localStorage.setItem(LS_PREF_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {}
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      savePushPreferences({ enabled: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function sendLocalNotification(
  title: string,
  options?: NotificationOptions,
): boolean {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  const prefs = getPushPreferences();
  if (!prefs.enabled) return false;

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'hp-alert',
      ...options,
    } as NotificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function notifyScoreChange(
  companyName: string,
  oldScore: number,
  newScore: number,
): boolean {
  const prefs = getPushPreferences();
  if (!prefs.scoreChanges) return false;

  const delta = newScore - oldScore;
  if (Math.abs(delta) < 3) return false;

  const direction = delta > 0 ? 'increased' : 'decreased';
  const emoji = delta > 0 ? '⚠️' : '✅';

  return sendLocalNotification(
    `${emoji} Risk score ${direction} for ${companyName}`,
    {
      body: `Your score went from ${oldScore} to ${newScore} (${delta > 0 ? '+' : ''}${delta} points). Tap to review.`,
      tag: `hp-score-${companyName}`,
    },
  );
}

export function notifyMarketChange(
  headline: string,
  companyName?: string,
): boolean {
  const prefs = getPushPreferences();
  if (!prefs.marketAlerts) return false;

  return sendLocalNotification(
    `📡 New market signal${companyName ? ` for ${companyName}` : ''}`,
    {
      body: headline,
      tag: 'hp-market-signal',
    },
  );
}
