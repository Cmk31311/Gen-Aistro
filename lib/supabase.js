import { createClient } from '@supabase/supabase-js';

// Lazy-initialized browser client (avoids build-time errors when env vars aren't set)
let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}
