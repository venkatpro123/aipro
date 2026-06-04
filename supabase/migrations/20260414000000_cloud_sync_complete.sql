-- PHASE-2: Cloud Sync - Apply missing migrations
-- Apply policies for existing tables

-- Fix swarm_agent_logs policies if they already exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon select on swarm_agent_logs'
    ) THEN
        CREATE POLICY "Allow anon select on swarm_agent_logs"
          ON swarm_agent_logs FOR SELECT TO anon USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert on swarm_agent_logs'
    ) THEN
        CREATE POLICY "Allow anon insert on swarm_agent_logs"
          ON swarm_agent_logs FOR INSERT TO anon WITH CHECK (true);
    END IF;
END $$;

-- Create journal_entries table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'journal_entries' AND table_schema = 'public'
    ) THEN
        CREATE TABLE journal_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            dimension VARCHAR(20) NOT NULL CHECK (dimension IN (
                'empathic', 'moral', 'creative', 'physical', 'social', 'contextual'
            )),
            title VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            tags TEXT[] DEFAULT '{}',
            human_score SMALLINT,
            job_risk_score SMALLINT,
            skill_risk_score SMALLINT,
            assessment_date TIMESTAMP,
            linked_course_id UUID,
            linked_roadmap_item_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_date DATE GENERATED ALWAYS AS (CAST(created_at AT TIME ZONE 'UTC' AS DATE)) STORED
        );

        CREATE INDEX idx_journal_user ON journal_entries(user_id);
        CREATE INDEX idx_journal_dimension ON journal_entries(dimension);
        CREATE INDEX idx_journal_created ON journal_entries(created_at DESC);
        CREATE INDEX idx_journal_user_date ON journal_entries(user_id, created_at DESC);

        ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can manage own journal entries" ON journal_entries
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create update_updated_at_column trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $inner$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$inner$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'journal_entries' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_journal_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_journal_entries_updated_at
            BEFORE UPDATE ON journal_entries
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create score_history table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'score_history' AND table_schema = 'public'
    ) THEN
        CREATE TABLE score_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            source VARCHAR(20) NOT NULL CHECK (source IN ('job', 'skill', 'human-index')),
            score SMALLINT NOT NULL,
            plot_score SMALLINT NOT NULL,
            data_version VARCHAR(20) DEFAULT '2026-Q1',
            app_version VARCHAR(20) DEFAULT '3.0',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_score_user ON score_history(user_id);
        CREATE INDEX idx_score_user_source ON score_history(user_id, source);
        CREATE INDEX idx_score_created ON score_history(created_at DESC);

        ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can manage own scores" ON score_history
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to get latest score by source
CREATE OR REPLACE FUNCTION get_latest_score(p_user_id UUID, p_source VARCHAR)
RETURNS TABLE(score SMALLINT, plot_score SMALLINT, created_at TIMESTAMP WITH TIME ZONE) AS $inner$
BEGIN
    RETURN QUERY
    SELECT s.score, s.plot_score, s.created_at
    FROM score_history s
    WHERE s.user_id = p_user_id AND s.source = p_source
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$inner$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get score trend
CREATE OR REPLACE FUNCTION get_score_trend(p_user_id UUID, p_source VARCHAR, p_days INTEGER DEFAULT 30)
RETURNS TABLE(change_num SMALLINT, direction VARCHAR, pct_change NUMERIC) AS $inner$
DECLARE
    v_current RECORD;
    v_previous RECORD;
BEGIN
    SELECT score, plot_score INTO v_current FROM get_latest_score(p_user_id, p_source);
    SELECT score, plot_score INTO v_previous
    FROM score_history
    WHERE user_id = p_user_id AND source = p_source AND created_at < NOW() - (p_days || ' days')::INTERVAL
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND OR v_previous IS NULL THEN
        RETURN QUERY SELECT 0::SMALLINT, 'stable'::VARCHAR, 0::NUMERIC;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        (v_current.plot_score - v_previous.plot_score)::SMALLINT,
        CASE WHEN v_current.plot_score > v_previous.plot_score THEN 'up'
             WHEN v_current.plot_score < v_previous.plot_score THEN 'down'
             ELSE 'stable' END::VARCHAR,
        ((v_current.plot_score - v_previous.plot_score)::NUMERIC / NULLIF(v_previous.plot_score, 0)) * 100;
END;
$inner$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add journal helper functions
CREATE OR REPLACE FUNCTION get_journal_tag_stats(p_user_id UUID)
RETURNS TABLE(tag_name TEXT, usage_count BIGINT) AS $inner$
BEGIN
    RETURN QUERY
    SELECT tag::TEXT, COUNT(*)::BIGINT
    FROM journal_entries,
          unnest(tags) AS tag
    WHERE journal_entries.user_id = p_user_id
    GROUP BY tag
    ORDER BY COUNT(*) DESC;
END;
$inner$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rename_journal_tag(
    p_user_id UUID,
    p_old_tag TEXT,
    p_new_tag TEXT
) RETURNS BIGINT AS $inner$
DECLARE
    rows_affected BIGINT;
BEGIN
    UPDATE journal_entries
    SET tags = array(
        SELECT CASE
            WHEN t = p_old_tag THEN p_new_tag
            ELSE t
        END
        FROM unnest(tags) AS t
    )
    WHERE user_id = p_user_id AND p_old_tag = ANY(tags);

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected;
END;
$inner$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_journal_streak(p_user_id UUID)
RETURNS TABLE(current_streak INT, longest_streak INT, total_entries BIGINT) AS $inner$
DECLARE
    v_current INT := 0;
    v_longest INT := 0;
    v_temp INT := 0;
    v_prev_date DATE;
    v_entry RECORD;
BEGIN
    FOR v_entry IN
        SELECT DISTINCT DATE(created_at) as entry_date
        FROM journal_entries
        WHERE user_id = p_user_id
        ORDER BY entry_date DESC
    LOOP
        IF v_prev_date IS NULL THEN
            IF v_entry.entry_date >= CURRENT_DATE - 1 THEN
                v_current := 1;
            ELSE
                v_current := 0;
            END IF;
            v_temp := 1;
        ELSE
            IF v_entry.entry_date = v_prev_date - 1 THEN
                v_temp := v_temp + 1;
            ELSE
                v_longest := GREATEST(v_longest, v_temp);
                v_temp := 1;
            END IF;
        END IF;
        v_prev_date := v_entry.entry_date;
    END LOOP;

    v_longest := GREATEST(v_longest, v_temp);

    RETURN QUERY SELECT v_current, v_longest, COUNT(*)::BIGINT FROM journal_entries WHERE user_id = p_user_id;
END;
$inner$ LANGUAGE plpgsql;

COMMENT ON TABLE journal_entries IS 'Human Edge Journal entries - stores user reflections on human skills';
COMMENT ON TABLE score_history IS 'Historical score entries synced from client devices';
