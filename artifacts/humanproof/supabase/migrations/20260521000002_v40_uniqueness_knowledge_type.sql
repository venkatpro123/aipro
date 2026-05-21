-- v40.0 — uniqueness_knowledge_type column on user_profiles
-- Sub-classifies critical_knowledge uniqueness depth into 5 structurally
-- distinct moat types, each with a different inaction scenario narrative.
-- Only meaningful when the user's per-audit uniquenessDepth = 'critical_knowledge';
-- stored at the profile level so it pre-populates the input form and persists
-- across audit sessions without re-entry.

CREATE TYPE uniqueness_knowledge_type_enum AS ENUM (
  'system_specific',        -- legacy system / migration-deadline moat
  'client_relationship',    -- personal client trust — portable to next employer
  'process_institutional',  -- undocumented tribal process memory
  'domain_expert',          -- regulatory / deep-domain specialist
  'leadership_capital'      -- organizational authority — mobile, follows person
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS uniqueness_knowledge_type uniqueness_knowledge_type_enum;

COMMENT ON COLUMN user_profiles.uniqueness_knowledge_type IS
  'Sub-classification of critical_knowledge uniqueness depth. '
  'Drives differentiated inaction scenario narratives. '
  'NULL = not applicable or user has not specified.';

-- RLS: no new policy needed — existing SELECT/UPDATE policies on user_profiles
-- cover this column (row-level, user_id = auth.uid()).
