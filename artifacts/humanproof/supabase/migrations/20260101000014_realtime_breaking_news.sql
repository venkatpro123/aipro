-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000014_realtime_breaking_news.sql
-- Purpose:   Enable Supabase Realtime on breaking_news_events so browser
--            clients subscribed via supabase.channel(...).on('postgres_changes')
--            receive INSERT events in real time.
--
-- This allows the LayoffCalculator Realtime subscription to fire the
-- BreakingNewsBanner when the breaking-news-scan Edge Function inserts a
-- new event for the company currently on screen — without the user refreshing.
-- ═══════════════════════════════════════════════════════════════════════════

-- Add breaking_news_events to the Supabase Realtime publication.
-- supabase_realtime publication is created automatically by Supabase;
-- adding a table here makes Postgres stream changes to connected clients.
ALTER PUBLICATION supabase_realtime ADD TABLE breaking_news_events;
