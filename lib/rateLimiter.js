import { createServerClient } from './supabase';

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Distributed rate limiter backed by Supabase.
 * Returns { allowed: boolean, remaining: number }.
 *
 * Falls back to allowing the request if Supabase is unavailable,
 * so a DB hiccup doesn't take down the API.
 */
export async function checkRateLimit(ip, endpoint = 'ask', limit = 30) {
  try {
    const supabase = createServerClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);

    // Upsert the row for this (ip, endpoint) and increment within the window
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_ip: ip,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_start: windowStart.toISOString(),
    });

    if (error) {
      // RPC not yet created — fall through to in-memory fallback
      throw error;
    }

    // RPC returns { allowed: bool, request_count: int }
    const allowed = data?.allowed ?? true;
    const count = data?.request_count ?? 0;
    return { allowed, remaining: Math.max(0, limit - count) };
  } catch {
    // Graceful fallback: allow the request if DB check fails
    return { allowed: true, remaining: -1 };
  }
}
