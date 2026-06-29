import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[MedTime] Supabase env vars missing. Push triggers will not be registered.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

// ─── Typed row for push_triggers ───────────────────────────────────────────

export interface PushTriggerRow {
  id?: string;
  subscription: PushSubscriptionJSON;
  scheduled_time: string; // ISO 8601 UTC
  status: 'pending' | 'sent' | 'failed';
}
