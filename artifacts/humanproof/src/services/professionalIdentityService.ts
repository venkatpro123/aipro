// professionalIdentityService.ts — Phase 9 / P16 (Career Infrastructure Layer)
// Credential vault: save and retrieve verified credentials via the supabase singleton.

import { supabase } from '../utils/supabase';

export interface CredentialRecord {
  id: string;
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string | null;
  verificationUrl: string | null;
  impactConfidenceSource: 'MEASURED';
}

export async function saveCredential(
  userId: string,
  record: Omit<CredentialRecord, 'id'>,
): Promise<CredentialRecord | null> {
  const { data, error } = await supabase
    .from('user_credentials')
    .insert({
      user_id: userId,
      title: record.title,
      issuer: record.issuer,
      issued_at: record.issuedAt,
      expires_at: record.expiresAt ?? null,
      verification_url: record.verificationUrl ?? null,
    })
    .select('id, title, issuer, issued_at, expires_at, verification_url')
    .single();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    issuer: r.issuer as string,
    issuedAt: r.issued_at as string,
    expiresAt: (r.expires_at as string | null) ?? null,
    verificationUrl: (r.verification_url as string | null) ?? null,
    impactConfidenceSource: 'MEASURED',
  };
}

export async function getCredentials(userId: string): Promise<CredentialRecord[]> {
  const { data } = await supabase
    .from('user_credentials')
    .select('id, title, issuer, issued_at, expires_at, verification_url')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    title: r.title as string,
    issuer: r.issuer as string,
    issuedAt: r.issued_at as string,
    expiresAt: (r.expires_at as string | null) ?? null,
    verificationUrl: (r.verification_url as string | null) ?? null,
    impactConfidenceSource: 'MEASURED' as const,
  }));
}
