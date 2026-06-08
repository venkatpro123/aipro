-- Phase 4 Migration: Career Network Contacts (Tool 6 — Networking OS)
CREATE TABLE IF NOT EXISTS career_network_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  relationship_type TEXT, -- 'former_manager','peer','recruiter','mentor','sponsor'
  last_contact_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE career_network_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_career_network"
  ON career_network_contacts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
