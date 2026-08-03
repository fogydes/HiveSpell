# Supabase Cron Jobs for Monitoring
# Add these to your Supabase project via the dashboard or CLI

# Health check every 5 minutes
-- name: health-check-5min
-- schedule: "*/5 * * * *"
-- command: curl -sf "https://YOUR_PROJECT_REF.supabase.co/functions/v1/health" > /dev/null

# Full monitoring check every 15 minutes
-- name: monitoring-check-15min
-- schedule: "*/15 * * * *"
-- command: curl -sf "https://YOUR_PROJECT_REF.supabase.co/functions/v1/monitor?action=check" > /dev/null

# Alternative: Use pg_cron directly in Supabase SQL editor:
/*
-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Health check every 5 minutes
SELECT cron.schedule(
  'health-check-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_get('https://YOUR_PROJECT_REF.supabase.co/functions/v1/health');
  $$
);

-- Full monitoring with alerting every 15 minutes
SELECT cron.schedule(
  'monitoring-check-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/monitor?action=check',
    '{}',
    'Content-Type: application/json'
  );
  $$
);

-- Cleanup old cron job logs (run daily)
SELECT cron.schedule(
  'cleanup-cron-logs',
  '0 3 * * *',
  $$
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  $$
);
*/