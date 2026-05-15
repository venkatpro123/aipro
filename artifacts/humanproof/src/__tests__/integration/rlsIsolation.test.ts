// rlsIsolation.test.ts — gap #5 fix (verify RLS actually enforces what migrations declare).
//
// This test guards against the silent-cross-user-data-leak failure mode:
// a migration enables RLS but the policy is malformed (typo'd column,
// wrong auth.uid() reference, missing WITH CHECK) and reads/writes
// still succeed across users.
//
// Strategy:
//   1. Skip the suite when SUPABASE_URL is not configured (CI sets these;
//      developers without a Supabase project see the suite as skipped
//      rather than failing).
//   2. Create two anonymous-signup users via supabase.auth.
//   3. Each user writes a row to a tenant-scoped table (using their
//      own JWT).
//   4. User A queries the table with their own JWT — must see ONLY
//      their own row.
//   5. User A queries with User B's id as the filter — must see ZERO
//      rows even though User B's row exists.
//   6. Delete the two test users + their data.
//
// The test verifies the contract at the RLS layer, not the repository
// layer. Repository tests use mocks; this test must hit a real DB.
//
// SAFETY: this test creates and deletes users. It REQUIRES a non-prod
// environment. Guarded by SUPABASE_URL containing 'staging' or 'localhost'
// — if it doesn't, the test refuses to run.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const PROD_GUARD = /staging|localhost|127\.0\.0\.1|preview/i;

function shouldRun(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (!PROD_GUARD.test(SUPABASE_URL)) {
    // eslint-disable-next-line no-console
    console.warn('[rlsIsolation.test] refusing to run against suspected production URL:', SUPABASE_URL);
    return false;
  }
  return true;
}

// ── Test users ───────────────────────────────────────────────────────────

interface TestUser {
  email: string;
  password: string;
  id: string;
  client: SupabaseClient;
}

async function createTestUser(adminClient: SupabaseClient, label: string): Promise<TestUser> {
  const email = `rls-test-${label}-${Date.now()}@humanproof.test`;
  const password = `RlsT3st!${Math.random().toString(36).slice(2, 10)}`;

  const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !createData.user) throw new Error(`createUser failed: ${createErr?.message}`);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`signInWithPassword failed: ${signInErr.message}`);

  return { email, password, id: createData.user.id, client: userClient };
}

async function deleteTestUser(adminClient: SupabaseClient, userId: string): Promise<void> {
  // Cascades to user-owned rows via ON DELETE CASCADE.
  await adminClient.auth.admin.deleteUser(userId);
}

// ── Suite ────────────────────────────────────────────────────────────────

const suiteEnabled = shouldRun();
const describeOrSkip = suiteEnabled ? describe : describe.skip;

describeOrSkip('RLS isolation — user_prediction_outcomes', () => {
  let admin: SupabaseClient;
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY required to provision test users');
    }
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    alice = await createTestUser(admin, 'alice');
    bob = await createTestUser(admin, 'bob');
  });

  afterAll(async () => {
    if (alice) await deleteTestUser(admin, alice.id);
    if (bob) await deleteTestUser(admin, bob.id);
  });

  it('SELECT is restricted to own rows', async () => {
    // Alice and Bob each insert one outcome row.
    const aliceInsert = await alice.client.from('user_prediction_outcomes').insert({
      user_id: alice.id,
      company_name: 'AliceCo',
      predicted_risk_tier: 'Moderate risk',
      predicted_score: 50,
      audit_date: new Date().toISOString().slice(0, 10),
    });
    expect(aliceInsert.error).toBeNull();

    const bobInsert = await bob.client.from('user_prediction_outcomes').insert({
      user_id: bob.id,
      company_name: 'BobCo',
      predicted_risk_tier: 'High risk',
      predicted_score: 80,
      audit_date: new Date().toISOString().slice(0, 10),
    });
    expect(bobInsert.error).toBeNull();

    // Alice queries — must see only her own row.
    const { data: aliceVisible, error: aliceReadErr } = await alice.client
      .from('user_prediction_outcomes')
      .select('company_name, user_id');
    expect(aliceReadErr).toBeNull();
    expect(aliceVisible ?? []).toHaveLength(1);
    expect((aliceVisible ?? [])[0]?.company_name).toBe('AliceCo');

    // Bob queries — must see only his own row.
    const { data: bobVisible, error: bobReadErr } = await bob.client
      .from('user_prediction_outcomes')
      .select('company_name, user_id');
    expect(bobReadErr).toBeNull();
    expect(bobVisible ?? []).toHaveLength(1);
    expect((bobVisible ?? [])[0]?.company_name).toBe('BobCo');
  });

  it('SELECT with another user\'s id filter returns no rows (RLS pre-filters)', async () => {
    // Alice TRIES to read Bob's row by explicit user_id filter.
    // RLS pre-filters BEFORE the WHERE clause, so the result is empty
    // even though the row exists.
    const { data, error } = await alice.client
      .from('user_prediction_outcomes')
      .select('company_name')
      .eq('user_id', bob.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('INSERT with WITH CHECK fails when forging another user_id', async () => {
    // Alice attempts to insert a row claiming to be Bob.
    // The upo_own_rows_insert policy has WITH CHECK (auth.uid() = user_id)
    // so this MUST fail at the policy layer.
    const { error } = await alice.client.from('user_prediction_outcomes').insert({
      user_id: bob.id, // <-- forging Bob's id
      company_name: 'ForgedCo',
      predicted_risk_tier: 'Moderate risk',
      predicted_score: 50,
      audit_date: new Date().toISOString().slice(0, 10),
    });
    expect(error).not.toBeNull();
    // The error code for RLS denial is 42501 (insufficient_privilege).
    expect(error?.code).toBe('42501');
  });

  it('DELETE is blocked entirely (preserves calibration dataset)', async () => {
    // First find Alice's row.
    const { data: rows } = await alice.client
      .from('user_prediction_outcomes')
      .select('id')
      .eq('user_id', alice.id)
      .limit(1);
    expect((rows ?? []).length).toBeGreaterThan(0);
    const rowId = (rows as Array<{ id: string }>)[0]!.id;

    // Try to delete. The upo_no_delete policy (FOR DELETE USING (false))
    // makes every delete a no-op from the user's perspective.
    const { error } = await alice.client
      .from('user_prediction_outcomes')
      .delete()
      .eq('id', rowId);
    // Delete returns ok but affects 0 rows because the policy excludes
    // every row. Verify the row still exists.
    expect(error).toBeNull();
    const { data: stillThere } = await alice.client
      .from('user_prediction_outcomes')
      .select('id')
      .eq('id', rowId);
    expect((stillThere ?? []).length).toBe(1);
  });
});

describeOrSkip('RLS isolation — score_trajectory', () => {
  let admin: SupabaseClient;
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    alice = await createTestUser(admin, 'st-alice');
    bob = await createTestUser(admin, 'st-bob');
  });

  afterAll(async () => {
    if (alice) await deleteTestUser(admin, alice.id);
    if (bob) await deleteTestUser(admin, bob.id);
  });

  it('isolates score history between users', async () => {
    await alice.client.from('score_trajectory').insert({
      user_id: alice.id,
      company_canonical_name: 'AliceCorp',
      score: 42,
      tier: 'LOW',
    });
    await bob.client.from('score_trajectory').insert({
      user_id: bob.id,
      company_canonical_name: 'BobCorp',
      score: 78,
      tier: 'HIGH',
    });

    const { data: aliceVisible } = await alice.client.from('score_trajectory').select('company_canonical_name');
    expect((aliceVisible ?? []).every((r) => (r as { company_canonical_name: string }).company_canonical_name === 'AliceCorp')).toBe(true);

    const { data: bobVisible } = await bob.client.from('score_trajectory').select('company_canonical_name');
    expect((bobVisible ?? []).every((r) => (r as { company_canonical_name: string }).company_canonical_name === 'BobCorp')).toBe(true);
  });
});
