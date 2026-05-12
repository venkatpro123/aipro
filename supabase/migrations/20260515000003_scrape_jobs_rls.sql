-- 20260515000003_scrape_jobs_rls.sql
-- Allow the browser (anon key) to read scrape_jobs so the LiveScraperGate
-- component can poll job completion status.
--
-- scrape_jobs holds only operational metadata: job types, statuses, timing,
-- and company names. No PII. Safe to expose to the anon role read-only.

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_scrape_jobs"
  ON public.scrape_jobs
  FOR SELECT
  TO anon, authenticated
  USING (true);
