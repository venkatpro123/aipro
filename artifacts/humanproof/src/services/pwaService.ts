// pwaService.ts
// PWA installation and service worker management.
// v40.0: IndexedDB HybridResult cache — allows offline audit access with stale banner.

let deferredPrompt: any = null;

// ── IndexedDB audit result cache ──────────────────────────────────────────────

const AUDIT_DB_NAME = 'humanproof_audit_cache';
const AUDIT_STORE = 'auditResults';
const AUDIT_DB_VERSION = 1;
const AUDIT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let _auditDb: IDBDatabase | null = null;

async function openAuditCacheDB(): Promise<IDBDatabase> {
  if (_auditDb) return _auditDb;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIT_DB_NAME, AUDIT_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIT_STORE)) {
        db.createObjectStore(AUDIT_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => {
      _auditDb = (e.target as IDBOpenDBRequest).result;
      resolve(_auditDb!);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persist the last successful audit result to IndexedDB.
 * Called at the end of each successful pipeline run.
 * v40.0 FIX-2: key now includes role + department to prevent cache collisions
 * between different audits for the same company. Previously, an audit of
 * "Google + SWE" and "Google + Marketing" would return the same cached result.
 */
function buildCacheKey(companyName: string, role?: string, department?: string): string {
  const c = companyName.toLowerCase().trim();
  const r = (role ?? '').toLowerCase().trim() || '(none)';
  const d = (department ?? '').toLowerCase().trim() || '(none)';
  // Use sentinel '(none)' instead of filter(Boolean) so that
  // (company, '', '') and (company, undefined, undefined) collide intentionally
  // as "company-only audit", while (company, 'swe', '(none)') is distinct from
  // (company, '(none)', 'swe').
  return [c, r, d].join('::');
}

export async function cacheLastAuditResult(
  companyName: string,
  result: unknown,
  role?: string,
  department?: string,
): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const db = await openAuditCacheDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIT_STORE, 'readwrite');
      tx.objectStore(AUDIT_STORE).put({
        key: buildCacheKey(companyName, role, department),
        result,
        cachedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-fatal — offline cache is a best-effort enhancement.
  }
}

/**
 * Retrieve the last cached audit result for a company.
 * Returns null when: cache miss, entry expired (>24h), or IndexedDB unavailable.
 */
export async function getLastAuditResult(
  companyName: string,
  role?: string,
  department?: string,
): Promise<unknown | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  try {
    const db = await openAuditCacheDB();
    const key = buildCacheKey(companyName, role, department);
    const record = await new Promise<{ key: string; result: unknown; cachedAt: number } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(AUDIT_STORE, 'readonly');
        const req = tx.objectStore(AUDIT_STORE).get(key);
        req.onsuccess = () => resolve(req.result as any);
        req.onerror = () => reject(req.error);
      },
    );
    if (!record) return null;
    // v40.0 FIX-13: guard against future-dated cachedAt with 60s skew tolerance.
    // Allow small clock differences (NTP resync, VM clock drift) but reject
    // entries with timestamps far in the future as corrupted.
    const CLOCK_SKEW_TOLERANCE_MS = 60_000;
    if (record.cachedAt > Date.now() + CLOCK_SKEW_TOLERANCE_MS
        || Date.now() - record.cachedAt > AUDIT_CACHE_TTL_MS) {
      const tx = db.transaction(AUDIT_STORE, 'readwrite');
      tx.objectStore(AUDIT_STORE).delete(key);
      return null;
    }
    return record.result;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('pwa-update-available'));
        }
      });
    });
  } catch (err) {
    console.error('[PWA] Service worker registration failed:', err);
  }
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return result.outcome === 'accepted';
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  deferredPrompt = null;
}

export function applyServiceWorkerUpdate(): void {
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
}
