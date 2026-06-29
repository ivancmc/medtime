// supabase/functions/push-cron/index.ts
//
// Supabase Edge Function — Push Cron Dispatcher
//
// Triggered by pg_cron every minute via:
//   SELECT cron.schedule(
//     'push-cron',
//     '* * * * *',
//     $$SELECT net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/push-cron',
//       headers := '{"Authorization": "Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'::jsonb
//     )$$
//   );
//
// Environment secrets required (set in Supabase Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY   — base64url-encoded public key
//   VAPID_PRIVATE_KEY  — base64url-encoded private key
//   VAPID_SUBJECT      — "mailto:you@example.com"
//   SUPABASE_URL       — injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://deno.land/x/web_push@0.0.1/mod.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PushTriggerRow {
  id: string;
  subscription: webpush.PushSubscription;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Reject non-POST requests (pg_cron sends POST via net.http_post)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Bootstrap clients ──────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Service-role client bypasses RLS — required for cron context
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Configure VAPID ────────────────────────────────────────────────────────
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@medtime.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[push-cron] VAPID keys not configured');
    return new Response('VAPID secrets missing', { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // ── Query due triggers ─────────────────────────────────────────────────────
  // Select rows where scheduled_time <= now() AND status = 'pending'
  const { data: triggers, error: fetchError } = await supabase
    .from('push_triggers')
    .select('id, subscription, scheduled_time')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .limit(100); // Safety cap per cron tick

  if (fetchError) {
    console.error('[push-cron] DB fetch error:', fetchError.message);
    return new Response('DB error', { status: 500 });
  }

  if (!triggers || triggers.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[push-cron] Processing ${triggers.length} trigger(s)`);

  // ── Dispatch push notifications ────────────────────────────────────────────
  const results = await Promise.allSettled(
    triggers.map((trigger: PushTriggerRow) => dispatchPush(trigger, supabase)),
  );

  const dispatched = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`[push-cron] Done — dispatched: ${dispatched}, failed: ${failed}`);

  return new Response(
    JSON.stringify({ dispatched, failed }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function dispatchPush(
  trigger: PushTriggerRow,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  // Payload is intentionally minimal — no medication names.
  // The Service Worker reads the local IndexedDB to build the notification.
  const payload = JSON.stringify({
    scheduledTime: new Date(trigger.scheduled_time).getTime(),
  });

  try {
    await webpush.sendNotification(trigger.subscription, payload);

    await supabase
      .from('push_triggers')
      .update({ status: 'sent' })
      .eq('id', trigger.id);
  } catch (err) {
    console.error(`[push-cron] Push failed for trigger ${trigger.id}:`, err);

    // Mark as failed so it won't be retried in infinite loops
    await supabase
      .from('push_triggers')
      .update({ status: 'failed' })
      .eq('id', trigger.id);

    throw err; // Propagate so Promise.allSettled counts it
  }
}
