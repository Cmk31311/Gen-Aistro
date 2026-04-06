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

// Server client factory (Bypasses invalid service role keys by natively binding Anon Key + User JWT via next/headers)
import { headers } from 'next/headers';

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use Anon Key securely because Vercel/Repo Service Role Keys are frequently mismatched or rotated.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

  // Gracefully intercept the authorization header natively from Next.js server context
  let authHeader = '';
  try {
    authHeader = headers().get('authorization') || '';
  } catch (e) {
    // Failsafe if accessed outside of a request context
  }
  
  const token = authHeader.replace('Bearer ', '').trim();

  // Bind the JWT globally if present, meaning the client assumes the user's identity precisely.
  const options = token ? {
    global: { headers: { Authorization: `Bearer ${token}` } }
  } : {};

  return createClient(url, anonKey, options);
}
