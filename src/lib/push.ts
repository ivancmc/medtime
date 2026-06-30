import { urlBase64ToUint8Array } from './vapid';
import { supabase, PushTriggerRow } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/**
 * Returns an existing push subscription or creates a new one.
 * Requires notification permission to have been granted beforehand.
 */
export async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  if (!VAPID_PUBLIC_KEY) {
    console.error('[MedTime] VITE_VAPID_PUBLIC_KEY is not set.');
    return null;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

/**
 * Inserts one push_trigger row per timestamp into Supabase.
 * Each row contains only the VAPID subscription and the scheduled time —
 * no medication data leaves the device.
 *
 * @param subscription - The PushSubscription from pushManager.subscribe()
 * @param timestamps   - Unix ms timestamps for each scheduled dose
 */
export async function registerPushTriggers(
  subscription: PushSubscription,
  timestamps: number[],
): Promise<void> {
  const now = Date.now();
  const futureDoses = timestamps.filter((t) => t > now);

  if (futureDoses.length === 0) return;

  const rows: PushTriggerRow[] = futureDoses.map((ts) => ({
    subscription: subscription.toJSON(),
    scheduled_time: new Date(ts).toISOString(),
    status: 'pending',
  }));

  const { error } = await supabase.from('push_triggers').insert(rows);

  if (error) {
    console.error('[MedTime] Failed to register push triggers:', error.message);
    throw error;
  }
}

/**
 * Deletes all pending push_trigger rows for the current subscription endpoint.
 * Call this before re-registering triggers after an edit so stale rows don't fire.
 *
 * @param subscription - The active PushSubscription for this device
 */
export async function cancelPushTriggers(
  subscription: PushSubscription,
): Promise<void> {
  const endpoint = subscription.endpoint;

  // Supabase stores the full subscription JSON; filter by endpoint inside the jsonb column
  const { error } = await supabase
    .from('push_triggers')
    .delete()
    .eq('status', 'pending')
    .filter('subscription->>endpoint', 'eq', endpoint);

  if (error) {
    console.error('[MedTime] Failed to cancel push triggers:', error.message);
    // Non-fatal: stale triggers will simply be ignored by the edge function
  }
}
