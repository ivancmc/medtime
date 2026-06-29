-- ═══════════════════════════════════════════════════════════════════════════
-- MedTime — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Create push_triggers table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_triggers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription   JSONB        NOT NULL,            -- PushSubscription JSON
  scheduled_time TIMESTAMPTZ  NOT NULL,            -- When to fire the push
  status         TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'sent', 'failed')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for the cron query pattern: status = 'pending' AND scheduled_time <= now()
CREATE INDEX IF NOT EXISTS idx_push_triggers_due
  ON public.push_triggers (status, scheduled_time)
  WHERE status = 'pending';

-- ─── 2. Row Level Security ───────────────────────────────────────────────────
-- Enable RLS — the anon key (used by the frontend) can only INSERT.
-- The Edge Function uses the service_role key which bypasses RLS entirely.

ALTER TABLE public.push_triggers ENABLE ROW LEVEL SECURITY;

-- Allow the frontend (anon role) to insert new trigger rows
CREATE POLICY "anon can insert triggers"
  ON public.push_triggers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Deny all reads and updates from the anon role (service_role bypasses this)
CREATE POLICY "no anon read"
  ON public.push_triggers
  FOR SELECT
  TO anon
  USING (false);

-- ─── 3. Enable pg_cron extension ─────────────────────────────────────────────
-- Note: pg_cron must be enabled via the Supabase Dashboard first:
--   Settings → Database → Extensions → pg_cron → Enable
--
-- Also enable pg_net for HTTP calls from the cron job:
--   Settings → Database → Extensions → pg_net → Enable

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── 4. Schedule the Edge Function every minute ──────────────────────────────
-- Replace <PROJECT_REF> with your Supabase project reference (e.g. abcdefghijkl)
-- Replace <SERVICE_ROLE_KEY> with your project's service_role JWT

SELECT cron.schedule(
  'medtime-push-cron',         -- unique job name
  '* * * * *',                 -- every minute
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ─── 5. (Optional) Cleanup job — delete sent/failed rows older than 7 days ───
SELECT cron.schedule(
  'medtime-push-cleanup',
  '0 3 * * *',   -- daily at 03:00 UTC
  $$
    DELETE FROM public.push_triggers
    WHERE status IN ('sent', 'failed')
      AND created_at < NOW() - INTERVAL '7 days';
  $$
);

-- ─── Verification queries ─────────────────────────────────────────────────────
-- Check scheduled cron jobs:
--   SELECT * FROM cron.job;
--
-- Monitor recent cron runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Inspect pending triggers:
--   SELECT id, scheduled_time, status FROM push_triggers
--   WHERE status = 'pending' ORDER BY scheduled_time;
