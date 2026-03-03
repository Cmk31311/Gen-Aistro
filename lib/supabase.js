import { createClient } from '@supabase/supabase-js';

// Lazy-initialized browser client (avoids build-time errors when env vars aren't set)
let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Return a dummy object during build / when env vars aren't configured
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}

// Backward-compatible export — getter that lazy-inits
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) return typeof prop === 'string' ? () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) : undefined;
    return client[prop];
  },
});

// Server client factory (uses service role key, bypasses RLS)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables');
  }
  return createClient(url, serviceRoleKey);
}
