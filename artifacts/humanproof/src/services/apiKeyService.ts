// apiKeyService.ts
// Local-first API key management. Keys are minted client-side with a collision-safe random,
// persisted to localStorage, and shadow-POSTed to the backend when available.

import { track } from './analyticsService';

const STORAGE_KEY = 'humanproof_api_keys';
const API = '/api/v1/api-keys';

export type KeyScope = 'read:scores' | 'write:scores' | 'read:team' | 'admin';

export interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  maskedKey: string;
  fullKey?: string;
  scopes: KeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function randomBytes(length = 24): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function readKeys(): ApiKey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApiKey[]) : [];
  } catch {
    return [];
  }
}

function writeKeys(keys: ApiKey[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch {}
}

export function listApiKeys(): ApiKey[] {
  return readKeys().map(k => ({ ...k, fullKey: undefined }));
}

export interface CreateKeyInput {
  label: string;
  scopes: KeyScope[];
}

export interface CreatedApiKey extends ApiKey {
  fullKey: string;
}

export function createApiKey(input: CreateKeyInput): CreatedApiKey {
  const keys = readKeys();
  const secret = randomBytes(24);
  const prefix = `hp_live_${secret.slice(0, 6)}`;
  const fullKey = `${prefix}_${secret.slice(6)}`;
  const maskedKey = `${prefix}_${'•'.repeat(18)}`;
  const newKey: ApiKey = {
    id: randomBytes(8),
    label: input.label.trim() || 'Untitled key',
    prefix,
    maskedKey,
    fullKey,
    scopes: input.scopes.length ? input.scopes : ['read:scores'],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };
  keys.push(newKey);
  // Persist without fullKey — UI is responsible for showing it once.
  writeKeys(keys.map(k => (k.id === newKey.id ? { ...k, fullKey: undefined } : k)));
  shadowSync(newKey).catch(() => undefined); // arch-allow:R2 fire-and-forget shadow-write; canonical state already saved locally
  track('api_key_created', { scopes: newKey.scopes, label: newKey.label });
  return newKey as CreatedApiKey;
}

export function revokeApiKey(id: string): void {
  const keys = readKeys().map(k =>
    k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
  );
  writeKeys(keys);
  track('api_key_revoked', { id });
  fetch(`${API}/${id}`, { method: 'DELETE' }).catch(() => undefined); // arch-allow:R2 fire-and-forget server cleanup; local state authoritative
}

export function deleteApiKey(id: string): void {
  writeKeys(readKeys().filter(k => k.id !== id));
  track('api_key_deleted', { id });
  fetch(`${API}/${id}?hard=true`, { method: 'DELETE' }).catch(() => undefined); // arch-allow:R2 fire-and-forget server cleanup; local state authoritative
}

async function shadowSync(key: ApiKey): Promise<void> {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key.id, label: key.label, prefix: key.prefix, scopes: key.scopes }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Offline / unwired — no-op; the local key is still usable for demos.
  }
}

export const SCOPE_LABELS: Record<KeyScope, string> = {
  'read:scores': 'Read score history',
  'write:scores': 'Submit new scores',
  'read:team': 'Read team data',
  'admin': 'Admin (all operations)',
};
