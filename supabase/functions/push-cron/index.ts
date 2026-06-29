// supabase/functions/push-cron/index.ts
//
// Supabase Edge Function — Push Cron Dispatcher
//
// Triggered by pg_cron every minute via net.http_post().
//
// Secrets required (Dashboard → Edge Functions → push-cron → Secrets):
//   VAPID_PUBLIC_KEY   — base64url public key
//   VAPID_PRIVATE_KEY  — base64url private key
//   VAPID_SUBJECT      — "mailto:you@example.com"
//   SUPABASE_URL               — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY  — injected automatically

// npm: specifier — Deno resolves the npm package directly, no deno.land needed.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

// Define the shape manually so we don't depend on the removed import type.
interface VapidPushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

interface PushTriggerRow {
  id: string;
  subscription: VapidPushSubscription;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Bootstrap clients ──────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Service-role key bypasses RLS — correct for a server-side cron context.
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Configure VAPID ────────────────────────────────────────────────────────
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject =
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@medtime.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[push-cron] VAPID secrets not configured');
    return new Response('VAPID secrets missing', { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // ── Query due triggers ─────────────────────────────────────────────────────
  const { data: triggers, error: fetchError } = await supabase
    .from('push_triggers')
    .select('id, subscription, scheduled_time')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .limit(100);

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
    (triggers as PushTriggerRow[]).map((trigger) =>
      dispatchPush(trigger, supabase),
    ),
  );

  const dispatched = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `[push-cron] Done — dispatched: ${dispatched}, failed: ${failed}`,
  );

  return new Response(JSON.stringify({ dispatched, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function dispatchPush(
  trigger: PushTriggerRow,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  // Payload is intentionally minimal — no medication names leave the server.
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
    console.error(
      `[push-cron] Push failed for trigger ${trigger.id}:`,
      err,
    );

    await supabase
      .from('push_triggers')
      .update({ status: 'failed' })
      .eq('id', trigger.id);

    throw err;
  }
}
